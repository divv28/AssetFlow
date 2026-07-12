import prisma from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { logAction } from '../utils/auditLogger.js';

class MaintenanceService {
  /**
   * Get paginated & filterable maintenance requests
   */
  async getRequests(query, user) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const order = query.order || 'desc';

    const where = {};

    // Role-based scoping
    if (user.role === 'EMPLOYEE') {
      where.raisedById = user.uuid;
    } else if (user.role === 'DEPARTMENT_HEAD') {
      if (!user.departmentId) {
        return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
      }
      where.asset = {
        departmentId: user.departmentId,
      };
    }

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.assetId) where.assetId = query.assetId;
    if (query.technicianId) where.technicianId = query.technicianId;

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { asset: { name: { contains: search, mode: 'insensitive' } } },
        { asset: { assetTag: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [requests, totalCount] = await Promise.all([
      prisma.maintenanceRequest.findMany({
        where,
        include: {
          asset: {
            select: {
              id: true,
              name: true,
              assetTag: true,
              status: true,
              departmentId: true,
              location: true,
            },
          },
          raisedBy: { select: { uuid: true, name: true, email: true } },
          approvedBy: { select: { uuid: true, name: true } },
          technician: { select: { uuid: true, name: true, email: true } },
        },
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
      prisma.maintenanceRequest.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: requests,
      meta: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    };
  }

  /**
   * Get single request details
   */
  async getRequestById(id, user) {
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: {
        asset: {
          include: {
            category: true,
            department: true,
          },
        },
        raisedBy: { select: { uuid: true, name: true, email: true } },
        approvedBy: { select: { uuid: true, name: true } },
        technician: { select: { uuid: true, name: true, email: true } },
      },
    });

    if (!request) {
      throw new ApiError(404, 'Maintenance request not found');
    }

    // Role-scoping validation
    if (user.role === 'EMPLOYEE' && request.raisedById !== user.uuid) {
      throw new ApiError(403, 'Access Denied: You cannot view this request');
    }
    if (user.role === 'DEPARTMENT_HEAD' && request.asset.departmentId !== user.departmentId) {
      throw new ApiError(403, 'Access Denied: Asset does not belong to your department');
    }

    return request;
  }

  /**
   * Raise maintenance request
   */
  async createRequest(data, actor) {
    const asset = await prisma.asset.findUnique({ where: { id: data.assetId } });
    if (!asset) {
      throw new ApiError(404, 'Asset not found');
    }

    if (asset.deletedAt) {
      throw new ApiError(400, 'Cannot raise maintenance for a soft-deleted asset');
    }

    const request = await prisma.maintenanceRequest.create({
      data: {
        assetId: data.assetId,
        raisedById: actor.uuid,
        priority: data.priority || 'MEDIUM',
        description: data.description,
        photo: data.photo || null,
        status: 'PENDING',
      },
      include: {
        asset: true,
      },
    });

    // Notify Asset Managers / Admins
    const managers = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'ASSET_MANAGER'] } },
      select: { uuid: true },
    });

    for (const mgr of managers) {
      await prisma.notification.create({
        data: {
          userId: mgr.uuid,
          type: 'MAINTENANCE_REQUESTED',
          message: `New Maintenance Request raised for ${asset.name} (${asset.assetTag}) - Priority: ${request.priority}`,
          relatedEntityId: request.id,
        },
      });
    }

    // Log action
    await logAction({
      actorId: actor.uuid,
      action: 'MAINTENANCE_REQUESTED',
      entityType: 'MaintenanceRequest',
      entityId: request.id,
      metadata: { assetTag: asset.assetTag, priority: request.priority },
    });

    return request;
  }

  /**
   * Approve maintenance request
   */
  async approveRequest(id, actor) {
    if (actor.role !== 'ADMIN' && actor.role !== 'ASSET_MANAGER') {
      throw new ApiError(403, 'Access Denied: Only Admins or Asset Managers can approve requests');
    }

    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { asset: true },
    });

    if (!request) {
      throw new ApiError(404, 'Request not found');
    }

    if (request.status !== 'PENDING') {
      throw new ApiError(400, `Cannot approve request in status ${request.status}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Approve request
      const reqUpdated = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: actor.uuid,
        },
      });

      // 2. Set asset status to UNDER_MAINTENANCE
      await tx.asset.update({
        where: { id: request.assetId },
        data: { status: 'UNDER_MAINTENANCE' },
      });

      // 3. Log event history
      await tx.assetStatusHistory.create({
        data: {
          assetId: request.assetId,
          fromStatus: request.asset.status,
          toStatus: 'UNDER_MAINTENANCE',
          changedBy: actor.uuid,
          reason: `Maintenance request ${id} approved`,
        },
      });

      return reqUpdated;
    });

    // Notify requester
    await prisma.notification.create({
      data: {
        userId: request.raisedById,
        type: 'MAINTENANCE_APPROVED',
        message: `Your maintenance request for asset ${request.asset.name} has been APPROVED.`,
        relatedEntityId: id,
      },
    });

    // Log action
    await logAction({
      actorId: actor.uuid,
      action: 'MAINTENANCE_APPROVED',
      entityType: 'MaintenanceRequest',
      entityId: id,
      metadata: { assetTag: request.asset.assetTag },
    });

    return updated;
  }

  /**
   * Reject maintenance request
   */
  async rejectRequest(id, data, actor) {
    if (actor.role !== 'ADMIN' && actor.role !== 'ASSET_MANAGER') {
      throw new ApiError(403, 'Access Denied: Only Admins or Asset Managers can reject requests');
    }

    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { asset: true },
    });

    if (!request) {
      throw new ApiError(404, 'Request not found');
    }

    if (request.status !== 'PENDING') {
      throw new ApiError(400, `Cannot reject request in status ${request.status}`);
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        resolutionNotes: data.rejectedReason || 'Rejected by Asset Manager',
      },
    });

    // Notify requester
    await prisma.notification.create({
      data: {
        userId: request.raisedById,
        type: 'MAINTENANCE_REJECTED',
        message: `Your maintenance request for asset ${request.asset.name} has been REJECTED. Reason: ${data.rejectedReason || 'Not specified'}`,
        relatedEntityId: id,
      },
    });

    // Log action
    await logAction({
      actorId: actor.uuid,
      action: 'MAINTENANCE_REJECTED',
      entityType: 'MaintenanceRequest',
      entityId: id,
      metadata: { assetTag: request.asset.assetTag, reason: data.rejectedReason },
    });

    return updated;
  }

  /**
   * Assign technician to approved request
   */
  async assignTechnician(id, data, actor) {
    if (actor.role !== 'ADMIN' && actor.role !== 'ASSET_MANAGER') {
      throw new ApiError(403, 'Access Denied: Only Admins or Asset Managers can assign technicians');
    }

    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { asset: true },
    });

    if (!request) {
      throw new ApiError(404, 'Request not found');
    }

    if (!['APPROVED', 'TECHNICIAN_ASSIGNED'].includes(request.status)) {
      throw new ApiError(400, `Cannot assign technician in status ${request.status}`);
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: {
        status: 'TECHNICIAN_ASSIGNED',
        technicianId: data.technicianId,
      },
      include: {
        technician: { select: { name: true } },
      },
    });

    // Notify technician
    await prisma.notification.create({
      data: {
        userId: data.technicianId,
        type: 'TECHNICIAN_ASSIGNED',
        message: `You have been assigned to repair asset ${request.asset.name} (${request.asset.assetTag}).`,
        relatedEntityId: id,
      },
    });

    // Log action
    await logAction({
      actorId: actor.uuid,
      action: 'MAINTENANCE_TECHNICIAN_ASSIGNED',
      entityType: 'MaintenanceRequest',
      entityId: id,
      metadata: { assetTag: request.asset.assetTag, technician: updated.technician.name },
    });

    return updated;
  }

  /**
   * Start maintenance (Move to In Progress)
   */
  async startMaintenance(id, actor) {
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { asset: true },
    });

    if (!request) {
      throw new ApiError(404, 'Request not found');
    }

    // Only technician or admin/manager can start
    const isTech = request.technicianId === actor.uuid;
    const isManager = actor.role === 'ADMIN' || actor.role === 'ASSET_MANAGER';
    if (!isTech && !isManager) {
      throw new ApiError(403, 'Access Denied: Only the assigned technician or manager can start work');
    }

    if (request.status !== 'TECHNICIAN_ASSIGNED') {
      throw new ApiError(400, `Cannot start maintenance when request is in status ${request.status}`);
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });

    // Notify requester
    await prisma.notification.create({
      data: {
        userId: request.raisedById,
        type: 'MAINTENANCE_STARTED',
        message: `Repair work has started on asset ${request.asset.name}.`,
        relatedEntityId: id,
      },
    });

    return updated;
  }

  /**
   * Resolve maintenance request
   */
  async resolveRequest(id, data, actor) {
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { asset: true },
    });

    if (!request) {
      throw new ApiError(404, 'Request not found');
    }

    const isTech = request.technicianId === actor.uuid;
    const isManager = actor.role === 'ADMIN' || actor.role === 'ASSET_MANAGER';
    if (!isTech && !isManager) {
      throw new ApiError(403, 'Access Denied: Only the assigned technician or manager can resolve the request');
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Resolve request
      const reqUpdated = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolutionNotes: data.resolutionNotes,
          completedAt: new Date(),
        },
      });

      // 2. Set asset status back to AVAILABLE
      await tx.asset.update({
        where: { id: request.assetId },
        data: { status: 'AVAILABLE' },
      });

      // 3. Log event history
      await tx.assetStatusHistory.create({
        data: {
          assetId: request.assetId,
          fromStatus: 'UNDER_MAINTENANCE',
          toStatus: 'AVAILABLE',
          changedBy: actor.uuid,
          reason: `Maintenance request ${id} resolved`,
        },
      });

      return reqUpdated;
    });

    // Notify requester
    await prisma.notification.create({
      data: {
        userId: request.raisedById,
        type: 'MAINTENANCE_COMPLETED',
        message: `Your maintenance request for asset ${request.asset.name} is RESOLVED. Notes: ${data.resolutionNotes}`,
        relatedEntityId: id,
      },
    });

    // Log action
    await logAction({
      actorId: actor.uuid,
      action: 'MAINTENANCE_RESOLVED',
      entityType: 'MaintenanceRequest',
      entityId: id,
      metadata: { assetTag: request.asset.assetTag, notes: data.resolutionNotes },
    });

    return updated;
  }

  /**
   * Update request status (drag-and-drop support)
   */
  async updateRequestStatus(id, newStatus, actor) {
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id },
      include: { asset: true },
    });

    if (!request) {
      throw new ApiError(404, 'Request not found');
    }

    // Role boundary checks depending on the target status
    if (['APPROVED', 'REJECTED', 'TECHNICIAN_ASSIGNED'].includes(newStatus)) {
      if (actor.role !== 'ADMIN' && actor.role !== 'ASSET_MANAGER') {
        throw new ApiError(403, 'Access Denied: Only Admins or Asset Managers can perform this state transition');
      }
    }

    if (newStatus === 'APPROVED') {
      return await this.approveRequest(id, actor);
    }
    if (newStatus === 'IN_PROGRESS') {
      return await this.startMaintenance(id, actor);
    }

    // Direct status updates
    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: { status: newStatus },
    });

    return updated;
  }
}

export default new MaintenanceService();
