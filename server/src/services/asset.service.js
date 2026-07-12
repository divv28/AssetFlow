import prisma from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { logAction } from '../utils/auditLogger.js';
import QRCode from 'qrcode';

// Transition Matrix
const VALID_TRANSITIONS = {
  AVAILABLE: ['ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED'],
  ALLOCATED: ['AVAILABLE', 'UNDER_MAINTENANCE', 'LOST'],
  RESERVED: ['AVAILABLE', 'ALLOCATED', 'UNDER_MAINTENANCE'],
  UNDER_MAINTENANCE: ['AVAILABLE', 'LOST', 'RETIRED'],
  LOST: ['AVAILABLE', 'RETIRED'],
  RETIRED: ['DISPOSED'],
  DISPOSED: [], // Terminal
};

class AssetService {
  /**
   * Fetch paginated and filterable assets
   */
  async getAssets(query, user) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const order = query.order || 'desc';

    // Filters
    const where = {};

    // Soft delete check
    if (query.showDeleted === 'true' || query.showDeleted === true) {
      // Show all including deleted, or only deleted
    } else {
      where.deletedAt = null;
    }

    // Access Scoping Checks
    // Use AND array to stack multiple OR groups without overwriting
    if (!where.AND) where.AND = [];

    if (user.role === 'DEPARTMENT_HEAD') {
      if (!user.departmentId) {
        return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
      }
      // Dept head sees their dept's assets AND global (null dept) assets
      where.AND.push({
        OR: [
          { departmentId: user.departmentId },
          { departmentId: null },
        ],
      });
    }
    // EMPLOYEE and ADMIN/ASSET_MANAGER see all assets (no extra scope)

    // Category / Status / Condition / Bookable Filters (scalar fields — safe to set directly)
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.status) where.status = query.status;
    if (query.condition) where.condition = query.condition;

    if (query.isBookable !== undefined && query.isBookable !== '') {
      where.isBookable = query.isBookable === 'true' || query.isBookable === true;
    }

    // Department filter (only applied for roles that can see all departments)
    // For DEPT_HEAD, the scope is already set above — ignore frontend dept filter
    if (query.departmentId && user.role !== 'DEPARTMENT_HEAD') {
      where.departmentId = query.departmentId;
    }

    // Advanced Filters Drawer
    if (query.manufacturer) {
      where.manufacturer = { contains: query.manufacturer, mode: 'insensitive' };
    }
    if (query.vendor) {
      where.vendor = { contains: query.vendor, mode: 'insensitive' };
    }
    if (query.location) {
      where.location = { contains: query.location, mode: 'insensitive' };
    }

    // Cost Range Filter
    const costMin = parseFloat(query.costMin);
    const costMax = parseFloat(query.costMax);
    if (!isNaN(costMin) || !isNaN(costMax)) {
      where.acquisitionCost = {};
      if (!isNaN(costMin)) where.acquisitionCost.gte = costMin;
      if (!isNaN(costMax)) where.acquisitionCost.lte = costMax;
    }

    // Purchase Date Range Filter
    const purchaseStart = query.purchaseDateStart ? new Date(query.purchaseDateStart) : null;
    const purchaseEnd = query.purchaseDateEnd ? new Date(query.purchaseDateEnd) : null;
    if (purchaseStart || purchaseEnd) {
      where.acquisitionDate = {};
      if (purchaseStart) where.acquisitionDate.gte = purchaseStart;
      if (purchaseEnd) where.acquisitionDate.lte = purchaseEnd;
    }

    // Warranty Expiry Range Filter
    const warrantyStart = query.warrantyExpiryStart ? new Date(query.warrantyExpiryStart) : null;
    const warrantyEnd = query.warrantyExpiryEnd ? new Date(query.warrantyExpiryEnd) : null;
    if (warrantyStart || warrantyEnd) {
      where.warrantyExpiry = {};
      if (warrantyStart) where.warrantyExpiry.gte = warrantyStart;
      if (warrantyEnd) where.warrantyExpiry.lte = warrantyEnd;
    }

    // Search Filter — pushed into AND to avoid overwriting dept-head OR
    if (query.search) {
      const search = query.search.trim();
      where.AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { assetTag: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { manufacturer: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
          { qrCode: { contains: search, mode: 'insensitive' } },
          { category: { name: { contains: search, mode: 'insensitive' } } },
          { department: { name: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    // Clean up empty AND array to avoid Prisma error
    if (where.AND.length === 0) delete where.AND;

    // Query DB
    const [assets, totalCount] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          department: { select: { id: true, name: true, code: true } },
          documents: { select: { id: true, fileUrl: true, fileType: true } },
          allocatedTo: { select: { uuid: true, name: true, email: true } },
        },
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
      prisma.asset.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: assets,
      meta: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    };
  }

  /**
   * Fetch single asset by ID
   */
  async getAssetById(id, user) {
    const [asset, auditLogs] = await Promise.all([
      prisma.asset.findUnique({
        where: { id },
        include: {
          category: true,
          department: true,
          creator: { select: { uuid: true, name: true, email: true } },
          allocatedTo: { select: { uuid: true, name: true, email: true } },
          documents: {
            include: {
              uploader: { select: { uuid: true, name: true, email: true } },
            },
          },
          statusHistory: {
            include: {
              changer: { select: { uuid: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.auditLog.findMany({
        where: { entityType: 'Asset', entityId: id },
        include: {
          actor: { select: { uuid: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!asset) {
      throw new ApiError(404, 'Asset not found');
    }

    // Access Scoping checks
    if (user.role === 'DEPARTMENT_HEAD' && asset.departmentId !== user.departmentId) {
      throw new ApiError(403, 'Access Denied: Asset does not belong to your department');
    }

    return { ...asset, auditLogs };
  }

  /**
   * Register a new Asset (Admin / Asset Manager / Department Head)
   */
  async createAsset(assetData, user) {
    // Check serial number uniqueness if provided
    if (assetData.serialNumber) {
      const existing = await prisma.asset.findUnique({
        where: { serialNumber: assetData.serialNumber },
      });
      if (existing) {
        throw new ApiError(400, `Asset with serial number ${assetData.serialNumber} already exists`);
      }
    }

    // Enforce role-based department scopes for create
    if (user.role === 'DEPARTMENT_HEAD') {
      if (!user.departmentId) {
        throw new ApiError(403, 'Access Denied: Department Head must belong to a department to register assets');
      }
      if (assetData.departmentId && assetData.departmentId !== user.departmentId) {
        throw new ApiError(403, 'Access Denied: Department Head can only register assets for their own department');
      }
      // Force it to their department
      assetData.departmentId = user.departmentId;
    }

    // Atomic transaction for sequential tag and asset creation
    return await prisma.$transaction(async (tx) => {
      // 1. Get next sequence tag
      const [{ nextval }] = await tx.$queryRaw`SELECT nextval('asset_tag_seq') as nextval`;
      const assetTag = `AF-${String(nextval).padStart(4, '0')}`;

      // 2. Generate a unique qrCode lookup token encoding the tag
      const qrCode = `AF-QR-${assetTag}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // 3. Create the asset
      const asset = await tx.asset.create({
        data: {
          assetTag,
          name: assetData.name,
          categoryId: assetData.categoryId,
          departmentId: assetData.departmentId || null,
          serialNumber: assetData.serialNumber || null,
          qrCode,
          acquisitionDate: assetData.acquisitionDate ? new Date(assetData.acquisitionDate) : null,
          acquisitionCost: assetData.acquisitionCost,
          manufacturer: assetData.manufacturer || null,
          vendor: assetData.vendor || null,
          condition: assetData.condition || 'NEW',
          location: assetData.location || null,
          isBookable: assetData.isBookable || false,
          warrantyExpiry: assetData.warrantyExpiry ? new Date(assetData.warrantyExpiry) : null,
          remarks: assetData.remarks || null,
          createdBy: user.uuid,
          status: 'AVAILABLE',
        },
      });

      // 4. Initial Status History entry
      await tx.assetStatusHistory.create({
        data: {
          assetId: asset.id,
          fromStatus: null,
          toStatus: 'AVAILABLE',
          changedBy: user.uuid,
          reason: 'Initial asset registration',
        },
      });

      // 5. Log Action
      await logAction({
        actorId: user.uuid,
        action: 'ASSET_CREATED',
        entityType: 'Asset',
        entityId: asset.id,
        metadata: { assetTag, name: asset.name },
      }, tx);

      return asset;
    });
  }

  /**
   * Edit Asset details
   */
  async updateAsset(id, assetData, user) {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      throw new ApiError(404, 'Asset not found');
    }

    if (asset.deletedAt) {
      throw new ApiError(400, 'Cannot edit a soft-deleted asset');
    }

    // Enforce role-based department scopes for edit
    if (user.role === 'DEPARTMENT_HEAD') {
      if (asset.departmentId !== user.departmentId) {
        throw new ApiError(403, 'Access Denied: Department Head can only edit assets belonging to their own department');
      }
      if (assetData.departmentId && assetData.departmentId !== user.departmentId) {
        throw new ApiError(403, 'Access Denied: Department Head cannot change/transfer the asset department');
      }
    }

    // Check serial number uniqueness if updated
    if (assetData.serialNumber && assetData.serialNumber !== asset.serialNumber) {
      const existing = await prisma.asset.findUnique({
        where: { serialNumber: assetData.serialNumber },
      });
      if (existing) {
        throw new ApiError(400, `Asset with serial number ${assetData.serialNumber} already exists`);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedAsset = await tx.asset.update({
        where: { id },
        data: {
          name: assetData.name,
          categoryId: assetData.categoryId,
          departmentId: assetData.departmentId !== undefined ? assetData.departmentId : undefined,
          serialNumber: assetData.serialNumber !== undefined ? assetData.serialNumber : undefined,
          acquisitionDate: assetData.acquisitionDate ? new Date(assetData.acquisitionDate) : undefined,
          acquisitionCost: assetData.acquisitionCost !== undefined ? assetData.acquisitionCost : undefined,
          manufacturer: assetData.manufacturer !== undefined ? assetData.manufacturer : undefined,
          vendor: assetData.vendor !== undefined ? assetData.vendor : undefined,
          condition: assetData.condition,
          location: assetData.location !== undefined ? assetData.location : undefined,
          isBookable: assetData.isBookable !== undefined ? assetData.isBookable : undefined,
          warrantyExpiry: assetData.warrantyExpiry ? new Date(assetData.warrantyExpiry) : undefined,
          remarks: assetData.remarks !== undefined ? assetData.remarks : undefined,
        },
      });

      await logAction({
        actorId: user.uuid,
        action: 'ASSET_UPDATED',
        entityType: 'Asset',
        entityId: id,
        metadata: { before: asset, after: updatedAsset },
      }, tx);

      return updatedAsset;
    });

    return updated;
  }

  /**
   * Duplicate an Asset
   */
  async duplicateAsset(id, userUuid) {
    const original = await prisma.asset.findUnique({ where: { id } });
    if (!original) {
      throw new ApiError(404, 'Asset not found');
    }

    if (original.deletedAt) {
      throw new ApiError(400, 'Cannot duplicate a soft-deleted asset');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Get next sequence tag
      const [{ nextval }] = await tx.$queryRaw`SELECT nextval('asset_tag_seq') as nextval`;
      const newTag = `AF-${String(nextval).padStart(4, '0')}`;

      // 2. Generate new QR Code
      const newQr = `AF-QR-${newTag}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // 3. Create the duplicate asset mapping fields
      const duplicate = await tx.asset.create({
        data: {
          assetTag: newTag,
          name: original.name,
          categoryId: original.categoryId,
          departmentId: original.departmentId,
          serialNumber: null, // Reset serial number as it must be unique
          qrCode: newQr,
          acquisitionDate: original.acquisitionDate,
          acquisitionCost: original.acquisitionCost,
          manufacturer: original.manufacturer,
          vendor: original.vendor,
          condition: original.condition,
          location: original.location,
          isBookable: original.isBookable,
          warrantyExpiry: original.warrantyExpiry,
          remarks: original.remarks,
          createdBy: userUuid,
          status: 'AVAILABLE', // Duplicated assets always start as AVAILABLE
        },
      });

      // 4. Initial Status History entry for duplicate
      await tx.assetStatusHistory.create({
        data: {
          assetId: duplicate.id,
          fromStatus: null,
          toStatus: 'AVAILABLE',
          changedBy: userUuid,
          reason: `Duplicated from asset ${original.assetTag}`,
        },
      });

      // 5. Audit Log
      await logAction({
        actorId: userUuid,
        action: 'ASSET_DUPLICATED',
        entityType: 'Asset',
        entityId: duplicate.id,
        metadata: { duplicatedFrom: original.assetTag, newAssetTag: newTag },
      }, tx);

      return duplicate;
    });
  }

  /**
   * Update Asset Lifecycle Status (Manual Status Transition)
   */
  async updateAssetStatus(id, toStatus, reason, userUuid) {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      throw new ApiError(404, 'Asset not found');
    }

    if (asset.deletedAt) {
      throw new ApiError(400, 'Cannot change status of a soft-deleted asset');
    }

    const fromStatus = asset.status;

    // Validate transition matrix
    const allowed = VALID_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes(toStatus)) {
      throw new ApiError(400, `Lifecycle transition from ${fromStatus} to ${toStatus} is invalid`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update Asset status
      const updatedAsset = await tx.asset.update({
        where: { id },
        data: { status: toStatus },
      });

      // 2. Add history entry
      await tx.assetStatusHistory.create({
        data: {
          assetId: id,
          fromStatus,
          toStatus,
          changedBy: userUuid,
          reason: reason || 'Manual status adjustment',
        },
      });

      // 3. Audit Logging
      await logAction({
        actorId: userUuid,
        action: 'ASSET_STATUS_CHANGED',
        entityType: 'Asset',
        entityId: id,
        metadata: { fromStatus, toStatus, reason },
      }, tx);

      return updatedAsset;
    });

    return updated;
  }

  /**
   * Soft Delete Asset
   */
  async softDeleteAsset(id, userUuid) {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      throw new ApiError(404, 'Asset not found');
    }

    if (asset.deletedAt) {
      throw new ApiError(400, 'Asset is already soft-deleted');
    }

    // Require status to be AVAILABLE
    if (asset.status !== 'AVAILABLE') {
      throw new ApiError(400, `Cannot soft-delete: Asset must be AVAILABLE (currently ${asset.status})`);
    }

    await prisma.$transaction(async (tx) => {
      // Set soft delete marker
      await tx.asset.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // Log action
      await logAction({
        actorId: userUuid,
        action: 'ASSET_SOFT_DELETED',
        entityType: 'Asset',
        entityId: id,
        metadata: { assetTag: asset.assetTag, name: asset.name },
      }, tx);
    });
  }

  /**
   * Add Document file upload link
   */
  async addAssetDocument(id, fileUrl, fileType, userUuid) {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      throw new ApiError(404, 'Asset not found');
    }

    return await prisma.$transaction(async (tx) => {
      const doc = await tx.assetDocument.create({
        data: {
          assetId: id,
          fileUrl,
          fileType,
          uploadedBy: userUuid,
        },
      });

      await logAction({
        actorId: userUuid,
        action: 'ASSET_DOCUMENT_UPLOADED',
        entityType: 'Asset',
        entityId: id,
        metadata: { fileUrl, fileType },
      }, tx);

      return doc;
    });
  }

  /**
   * Generate QR PNG Buffer stream
   */
  async getQrCodeBuffer(id, user) {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      throw new ApiError(404, 'Asset not found');
    }

    // Access Scope verification
    if (user.role === 'DEPARTMENT_HEAD' && asset.departmentId !== user.departmentId) {
      throw new ApiError(403, 'Access Denied: QR belongs to a different department asset');
    }

    // Enocde tag or url
    const codeData = asset.qrCode;
    return await QRCode.toBuffer(codeData, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 2,
      width: 300,
    });
  }

  /**
   * Distribute / Allocate Asset to an Employee
   */
  async allocateAsset(id, allocatedToId, reason, user) {
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { allocatedTo: true }
    });

    if (!asset) {
      throw new ApiError(404, 'Asset not found');
    }

    if (asset.deletedAt) {
      throw new ApiError(400, 'Cannot allocate a soft-deleted asset');
    }

    // Role-based scoping check
    if (user.role === 'DEPARTMENT_HEAD') {
      if (asset.departmentId !== user.departmentId) {
        throw new ApiError(403, 'Access Denied: Department Head can only allocate assets belonging to their own department');
      }
    }

    // Determine target employee status and scope
    let targetEmployee = null;
    if (allocatedToId) {
      targetEmployee = await prisma.user.findUnique({
        where: { uuid: allocatedToId }
      });

      if (!targetEmployee) {
        throw new ApiError(404, 'Target employee user not found');
      }

      if (targetEmployee.status !== 'ACTIVE') {
        throw new ApiError(400, 'Target employee account is deactivated');
      }

      // Department Head can only distribute to employees within their department
      if (user.role === 'DEPARTMENT_HEAD' && targetEmployee.departmentId !== user.departmentId) {
        throw new ApiError(403, 'Access Denied: Department Head can only allocate assets to employees in their own department');
      }
    }

    const fromStatus = asset.status;
    const toStatus = allocatedToId ? 'ALLOCATED' : 'AVAILABLE';

    // Validate transition matrix
    const allowed = VALID_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes(toStatus) && fromStatus !== toStatus) {
      throw new ApiError(400, `Invalid lifecycle transition from ${fromStatus} to ${toStatus}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update Asset allocations details
      const updatedAsset = await tx.asset.update({
        where: { id },
        data: {
          allocatedToId: allocatedToId || null,
          status: toStatus,
        },
      });

      // 2. Add history record
      await tx.assetStatusHistory.create({
        data: {
          assetId: id,
          fromStatus,
          toStatus,
          changedBy: user.uuid,
          reason: reason || (allocatedToId ? `Allocated to ${targetEmployee.name}` : 'Returned to inventory'),
        },
      });

      // 3. Audit logging
      await logAction({
        actorId: user.uuid,
        action: allocatedToId ? 'ASSET_ALLOCATED' : 'ASSET_RETURNED',
        entityType: 'Asset',
        entityId: id,
        metadata: {
          fromStatus,
          toStatus,
          allocatedTo: allocatedToId ? { uuid: targetEmployee.uuid, name: targetEmployee.name } : null,
          reason,
        },
      }, tx);

      return updatedAsset;
    });

    return updated;
  }
}

export default new AssetService();
