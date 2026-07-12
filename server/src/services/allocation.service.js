import prisma from '../config/db.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Unified timeline metadata formatter
 */
const formatTimelineMetadata = (event) => {
  return event;
};

class AllocationService {
  /**
   * Fetch Allocations list (Paginated, Searchable, Filtered)
   */
  async getAllocations(query, user) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const sortBy = query.sortBy || 'createdAt';
    const order = query.order || 'desc';

    // Construct filters
    const where = { deletedAt: null };

    // Search mapping
    if (query.search) {
      where.OR = [
        { asset: { name: { contains: query.search, mode: 'insensitive' } } },
        { asset: { assetTag: { contains: query.search, mode: 'insensitive' } } },
        { asset: { serialNumber: { contains: query.search, mode: 'insensitive' } } },
        { asset: { qrCode: { contains: query.search, mode: 'insensitive' } } },
        { employee: { name: { contains: query.search, mode: 'insensitive' } } },
        { department: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    // Role-based Read Scope
    if (user.role === 'DEPARTMENT_HEAD') {
      // Scoped to allocations within their department OR allocated by them
      where.OR = [
        { departmentId: user.departmentId },
        { allocatedById: user.uuid },
      ];
    } else if (user.role === 'EMPLOYEE') {
      where.employeeId = user.uuid;
    }

    // Apply filters
    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }
    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.categoryId) {
      where.asset = { ...where.asset, categoryId: query.categoryId };
    }
    if (query.assetStatus) {
      where.asset = { ...where.asset, status: query.assetStatus };
    }

    if (query.startDate || query.endDate) {
      where.allocatedDate = {};
      if (query.startDate) {
        where.allocatedDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.allocatedDate.lte = new Date(query.endDate);
      }
    }

    // Query DB
    const [allocations, totalCount] = await Promise.all([
      prisma.allocation.findMany({
        where,
        include: {
          asset: {
            include: {
              category: { select: { id: true, name: true } },
            },
          },
          employee: { select: { uuid: true, name: true, email: true, role: true } },
          department: { select: { id: true, name: true, code: true } },
          allocatedBy: { select: { uuid: true, name: true, email: true } },
        },
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
      prisma.allocation.count({ where }),
    ]);

    // Map allocations to calculate isOverdue dynamically
    const today = new Date();
    const formatted = allocations.map((alloc) => {
      const isOverdue =
        alloc.status === 'ACTIVE' &&
        alloc.expectedReturnDate &&
        new Date(alloc.expectedReturnDate) < today;

      return {
        ...alloc,
        isOverdue,
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: formatted,
      meta: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    };
  }

  /**
   * Fetch Single Allocation details
   */
  async getAllocationById(id, user) {
    const alloc = await prisma.allocation.findUnique({
      where: { id },
      include: {
        asset: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
        employee: { select: { uuid: true, name: true, email: true, role: true, departmentId: true } },
        department: { select: { id: true, name: true, code: true } },
        allocatedBy: { select: { uuid: true, name: true, email: true } },
        transfers: {
          include: {
            requestedBy: { select: { uuid: true, name: true } },
            requestedTo: { select: { uuid: true, name: true } },
          },
          orderBy: { requestedAt: 'desc' },
        },
        returns: {
          include: {
            requestedBy: { select: { uuid: true, name: true } },
          },
          orderBy: { requestedAt: 'desc' },
        },
      },
    });

    if (!alloc) {
      throw new ApiError(404, 'Allocation details not found');
    }

    // Role-based Read Scope check
    if (user.role === 'DEPARTMENT_HEAD' && alloc.departmentId !== user.departmentId && alloc.allocatedById !== user.uuid) {
      throw new ApiError(403, 'Access Denied: Allocation belongs to a different department');
    } else if (user.role === 'EMPLOYEE' && alloc.employeeId !== user.uuid) {
      throw new ApiError(403, 'Access Denied: You can only view your own allocations');
    }

    const today = new Date();
    const isOverdue =
      alloc.status === 'ACTIVE' &&
      alloc.expectedReturnDate &&
      new Date(alloc.expectedReturnDate) < today;

    return {
      ...alloc,
      isOverdue,
    };
  }

  /**
   * Allocate an Asset (Admin / Asset Manager only)
   */
  async allocate(data, actor) {
    const asset = await prisma.asset.findUnique({
      where: { id: data.assetId },
      include: { allocations: { where: { status: 'ACTIVE' }, include: { employee: true } } },
    });

    if (!asset) {
      throw new ApiError(404, 'Asset not found');
    }

    if (asset.deletedAt) {
      throw new ApiError(400, 'Cannot allocate a soft-deleted asset');
    }

    // Autoritative rule: only AVAILABLE is allocateable
    if (asset.status !== 'AVAILABLE') {
      const activeAlloc = asset.allocations[0];
      const holderMsg = activeAlloc ? `allocated to ${activeAlloc.employee.name}` : `in ${asset.status} state`;
      throw new ApiError(400, `This asset is currently ${holderMsg}.`);
    }

    // Fetch employee to capture departmentId snapshot
    const employee = await prisma.user.findUnique({
      where: { uuid: data.employeeId },
      include: { department: true },
    });

    if (!employee || employee.status !== 'ACTIVE') {
      throw new ApiError(400, 'Selected employee user is inactive or does not exist');
    }

    // Department Head boundary check — can only allocate to their own dept's employees
    if (actor.role === 'DEPARTMENT_HEAD') {
      if (!actor.departmentId) {
        throw new ApiError(403, 'Access Denied: Department Head must belong to a department to allocate assets');
      }
      if (employee.departmentId !== actor.departmentId) {
        throw new ApiError(403, 'Access Denied: Department Head can only allocate assets to employees within their own department');
      }
    }

    const snapshotDeptId = data.departmentId || employee.departmentId;
    if (!snapshotDeptId) {
      throw new ApiError(400, 'Allocation department must be specified (employee does not belong to a department)');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create Allocation row
      const allocation = await tx.allocation.create({
        data: {
          assetId: data.assetId,
          employeeId: data.employeeId,
          departmentId: snapshotDeptId,
          allocatedById: actor.uuid,
          expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : null,
          conditionAtAllocation: data.conditionAtAllocation || 'NEW',
          status: 'ACTIVE',
          returnNotes: data.remarks || null,
        },
      });

      // 2. Flip Asset status
      await tx.asset.update({
        where: { id: data.assetId },
        data: {
          status: 'ALLOCATED',
          allocatedToId: data.employeeId,
        },
      });

      // 3. Log Event
      await tx.allocationEvent.create({
        data: {
          assetId: data.assetId,
          allocationId: allocation.id,
          eventType: 'ALLOCATED',
          actorId: actor.uuid,
          metadata: {
            employeeId: data.employeeId,
            employeeName: employee.name,
            condition: data.conditionAtAllocation || 'NEW',
            expectedReturnDate: data.expectedReturnDate || null,
          },
        },
      });

      // 4. Log Audit
      await tx.auditLog.create({
        data: {
          actorId: actor.uuid,
          action: 'ASSET_ALLOCATED',
          entityType: 'Allocation',
          entityId: allocation.id,
          metadata: { assetId: data.assetId, employeeId: data.employeeId, tag: asset.assetTag },
        },
      });

      // 5. Send Notification
      await tx.notification.create({
        data: {
          userId: data.employeeId,
          type: 'ASSET_ALLOCATED',
          message: `Asset ${asset.name} (${asset.assetTag}) has been allocated to you. Expected return: ${data.expectedReturnDate ? new Date(data.expectedReturnDate).toLocaleDateString() : 'None'}`,
          relatedEntityId: allocation.id,
        },
      });

      return allocation;
    });
  }

  /**
   * Edit allocation settings (expected return, notes)
   */
  async updateAllocation(id, data, actor) {
    const alloc = await prisma.allocation.findUnique({ where: { id } });
    if (!alloc) {
      throw new ApiError(404, 'Allocation details not found');
    }

    if (alloc.status === 'RETURNED') {
      throw new ApiError(400, 'Cannot edit closed allocation records');
    }

    const updated = await prisma.allocation.update({
      where: { id },
      data: {
        expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : alloc.expectedReturnDate,
        returnNotes: data.notes !== undefined ? data.notes : alloc.returnNotes,
      },
    });

    return updated;
  }

  /**
   * Request Transfer of an allocated asset
   */
  async requestTransfer(data, actor) {
    const alloc = await prisma.allocation.findUnique({
      where: { id: data.allocationId },
      include: { asset: true, employee: true },
    });

    if (!alloc) {
      throw new ApiError(404, 'Source allocation record not found');
    }

    if (alloc.status !== 'ACTIVE' && alloc.status !== 'OVERDUE') {
      throw new ApiError(400, 'Transfer requests can only be initiated on ACTIVE or OVERDUE allocations');
    }

    // Role check: Employee can only request transfers of assets currently allocated to themselves
    if (actor.role === 'EMPLOYEE' && alloc.employeeId !== actor.uuid) {
      throw new ApiError(403, 'Access Denied: You cannot request a transfer for an asset allocated to someone else');
    }

    const targetUser = await prisma.user.findUnique({
      where: { uuid: data.requestedToId },
      include: { department: true },
    });

    if (!targetUser || targetUser.status !== 'ACTIVE') {
      throw new ApiError(400, 'Target proposed employee does not exist or is inactive');
    }

    if (alloc.employeeId === targetUser.uuid) {
      throw new ApiError(400, 'Cannot transfer an asset to the current holder');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create TransferRequest
      const req = await tx.transferRequest.create({
        data: {
          allocationId: data.allocationId,
          assetId: alloc.assetId,
          requestedById: actor.uuid,
          requestedToId: data.requestedToId,
          currentHolderId: alloc.employeeId,
          newHolderId: data.requestedToId,
          reason: data.reason || null,
          status: 'REQUESTED',
        },
      });

      // 2. Set source Allocation state to TRANSFER_PENDING
      await tx.allocation.update({
        where: { id: data.allocationId },
        data: { status: 'TRANSFER_PENDING' },
      });

      // 3. Write event
      await tx.allocationEvent.create({
        data: {
          assetId: alloc.assetId,
          allocationId: alloc.id,
          eventType: 'TRANSFER_REQUESTED',
          actorId: actor.uuid,
          metadata: {
            transferRequestId: req.id,
            fromHolder: alloc.employee.name,
            toHolder: targetUser.name,
            reason: data.reason,
          },
        },
      });

      // 4. Send Notifications
      // To target proposed new holder
      await tx.notification.create({
        data: {
          userId: targetUser.uuid,
          type: 'TRANSFER_REQUESTED',
          message: `Asset ${alloc.asset.name} (${alloc.asset.assetTag}) transfer request raised to you by ${actor.name}.`,
          relatedEntityId: req.id,
        },
      });

      // If there is a department head for the target or source department, we'll notify them too
      if (targetUser.department?.headId) {
        await tx.notification.create({
          data: {
            userId: targetUser.department.headId,
            type: 'TRANSFER_REQUESTED',
            message: `Transfer request pending approval: ${alloc.asset.name} from ${alloc.employee.name} to ${targetUser.name}.`,
            relatedEntityId: req.id,
          },
        });
      }

      return req;
    });
  }

  /**
   * Approve Transfer request (Admin / Manager / Scoped Department Head)
   */
  async approveTransfer(id, actor) {
    const req = await prisma.transferRequest.findUnique({
      where: { id },
      include: {
        allocation: { include: { employee: true } },
        asset: true,
        requestedBy: true,
        requestedTo: { include: { department: true } },
      },
    });

    if (!req) {
      throw new ApiError(404, 'Transfer request not found');
    }

    if (req.status !== 'REQUESTED') {
      throw new ApiError(400, 'This transfer request is already processed');
    }

    // Role checking
    if (actor.role === 'DEPARTMENT_HEAD') {
      // Must belong to head's department (either current holder or proposed new holder)
      const currentDeptId = req.allocation.departmentId;
      const targetDeptId = req.requestedTo.departmentId;
      if (currentDeptId !== actor.departmentId && targetDeptId !== actor.departmentId) {
        throw new ApiError(403, 'Access Denied: Department Head can only approve transfers related to their own department');
      }
    }

    if (!req.requestedTo.departmentId) {
      throw new ApiError(400, 'Target employee must be assigned to a department to receive transfers');
    }

    return await prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Close old Allocation
      await tx.allocation.update({
        where: { id: req.allocationId },
        data: {
          status: 'RETURNED',
          returnedDate: now,
          conditionAtReturn: req.allocation.conditionAtAllocation,
        },
      });

      // 2. Create new Allocation row
      const newAllocation = await tx.allocation.create({
        data: {
          assetId: req.assetId,
          employeeId: req.newHolderId,
          departmentId: req.requestedTo.departmentId,
          allocatedById: actor.uuid,
          allocatedDate: now,
          conditionAtAllocation: req.allocation.conditionAtAllocation || 'NEW',
          status: 'ACTIVE',
        },
      });

      // 3. Mark Transfer request as COMPLETED
      await tx.transferRequest.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: now,
          approvedById: actor.uuid,
        },
      });

      // 4. Update Asset currently allocated holder (stays ALLOCATED)
      await tx.asset.update({
        where: { id: req.assetId },
        data: {
          allocatedToId: req.newHolderId,
        },
      });

      // 5. Add timeline event
      await tx.allocationEvent.create({
        data: {
          assetId: req.assetId,
          allocationId: newAllocation.id,
          eventType: 'TRANSFER_APPROVED',
          actorId: actor.uuid,
          metadata: {
            transferRequestId: id,
            fromHolder: req.allocation.employee.name,
            toHolder: req.requestedTo.name,
          },
        },
      });

      // 6. Write Audit Log
      await tx.auditLog.create({
        data: {
          actorId: actor.uuid,
          action: 'TRANSFER_APPROVED',
          entityType: 'TransferRequest',
          entityId: id,
          metadata: { assetId: req.assetId, from: req.currentHolderId, to: req.newHolderId },
        },
      });

      // 7. Write Notifications
      // Notify old holder
      await tx.notification.create({
        data: {
          userId: req.currentHolderId,
          type: 'TRANSFER_COMPLETED',
          message: `Asset ${req.asset.name} has been transferred and registered to ${req.requestedTo.name}.`,
          relatedEntityId: newAllocation.id,
        },
      });

      // Notify new holder
      await tx.notification.create({
        data: {
          userId: req.newHolderId,
          type: 'TRANSFER_COMPLETED',
          message: `Asset ${req.asset.name} has been successfully transferred to you and is now active.`,
          relatedEntityId: newAllocation.id,
        },
      });

      return newAllocation;
    });
  }

  /**
   * Reject Transfer request (Admin / Manager / Scoped Department Head)
   */
  async rejectTransfer(id, reason, actor) {
    const req = await prisma.transferRequest.findUnique({
      where: { id },
      include: {
        allocation: { include: { employee: true } },
        asset: true,
      },
    });

    if (!req) {
      throw new ApiError(404, 'Transfer request not found');
    }

    if (req.status !== 'REQUESTED') {
      throw new ApiError(400, 'This transfer request is already processed');
    }

    // Role check
    if (actor.role === 'DEPARTMENT_HEAD') {
      const currentDeptId = req.allocation.departmentId;
      if (currentDeptId !== actor.departmentId) {
        throw new ApiError(403, 'Access Denied: Department Head can only reject transfers related to their own department');
      }
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Revert Allocation status back to ACTIVE
      await tx.allocation.update({
        where: { id: req.allocationId },
        data: { status: 'ACTIVE' },
      });

      // 2. Reject Transfer Request
      const updatedReq = await tx.transferRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedReason: reason || 'Transfer request rejected by manager',
        },
      });

      // 3. Write event log
      await tx.allocationEvent.create({
        data: {
          assetId: req.assetId,
          allocationId: req.allocationId,
          eventType: 'TRANSFER_REJECTED',
          actorId: actor.uuid,
          metadata: {
            transferRequestId: id,
            rejectedReason: reason,
          },
        },
      });

      // 4. Notify requester
      await tx.notification.create({
        data: {
          userId: req.requestedById,
          type: 'TRANSFER_REJECTED',
          message: `Transfer request for asset ${req.asset.name} was rejected. Reason: ${reason || 'None provided'}`,
          relatedEntityId: req.id,
        },
      });

      return updatedReq;
    });
  }

  /**
   * Request Return of an allocated asset
   */
  async requestReturn(data, actor, photoUrl) {
    const alloc = await prisma.allocation.findUnique({
      where: { id: data.allocationId },
      include: { asset: true, employee: true },
    });

    if (!alloc) {
      throw new ApiError(404, 'Allocation record not found');
    }

    if (alloc.status !== 'ACTIVE' && alloc.status !== 'OVERDUE') {
      throw new ApiError(400, 'Return requests can only be made on ACTIVE or OVERDUE allocations');
    }

    // Employees can only request return of assets allocated to themselves
    if (actor.role === 'EMPLOYEE' && alloc.employeeId !== actor.uuid) {
      throw new ApiError(403, 'Access Denied: You cannot request to return someone else\'s asset');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create ReturnRequest
      const req = await tx.returnRequest.create({
        data: {
          allocationId: data.allocationId,
          assetId: alloc.assetId,
          requestedById: actor.uuid,
          condition: data.condition || 'GOOD',
          notes: data.notes || null,
          photoUrl: photoUrl || null,
          status: 'REQUESTED',
        },
      });

      // 2. Add Timeline event
      await tx.allocationEvent.create({
        data: {
          assetId: alloc.assetId,
          allocationId: alloc.id,
          eventType: 'RETURN_REQUESTED',
          actorId: actor.uuid,
          metadata: {
            returnRequestId: req.id,
            condition: data.condition,
            notes: data.notes,
          },
        },
      });

      // 3. Write Notification to system managers
      const managers = await tx.user.findMany({
        where: { role: { in: ['ADMIN', 'ASSET_MANAGER'] } },
      });

      for (const mgr of managers) {
        await tx.notification.create({
          data: {
            userId: mgr.uuid,
            type: 'RETURN_REQUESTED',
            message: `Return request pending review for asset ${alloc.asset.name} from employee ${alloc.employee.name}.`,
            relatedEntityId: req.id,
          },
        });
      }

      return req;
    });
  }

  /**
   * Approve Return request (Admin / Manager only)
   */
  async approveReturn(id, actor) {
    const req = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        allocation: { include: { employee: true } },
        asset: true,
      },
    });

    if (!req) {
      throw new ApiError(404, 'Return request not found');
    }

    if (req.status !== 'REQUESTED') {
      throw new ApiError(400, 'This return request is already processed');
    }

    return await prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Close allocation
      await tx.allocation.update({
        where: { id: req.allocationId },
        data: {
          status: 'RETURNED',
          returnedDate: now,
          conditionAtReturn: req.condition,
        },
      });

      // 2. Determine target Asset status based on condition
      const needsMaintenance = req.condition === 'DAMAGED' || req.condition === 'NEEDS_REPAIR';
      const targetAssetStatus = needsMaintenance ? 'UNDER_MAINTENANCE' : 'AVAILABLE';

      // 3. Sync Asset fields
      await tx.asset.update({
        where: { id: req.assetId },
        data: {
          status: targetAssetStatus,
          allocatedToId: null,
        },
      });

      // 4. Mark ReturnRequest as APPROVED
      await tx.returnRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedById: actor.uuid,
          reviewedAt: now,
        },
      });

      // 5. Write history event
      await tx.allocationEvent.create({
        data: {
          assetId: req.assetId,
          allocationId: req.allocationId,
          eventType: 'RETURN_APPROVED',
          actorId: actor.uuid,
          metadata: {
            returnRequestId: id,
            condition: req.condition,
            resolvedAssetStatus: targetAssetStatus,
          },
        },
      });

      // 6. Write Audit log
      await tx.auditLog.create({
        data: {
          actorId: actor.uuid,
          action: 'RETURN_APPROVED',
          entityType: 'ReturnRequest',
          entityId: id,
          metadata: { assetId: req.assetId, employeeId: req.allocation.employeeId, resolvedStatus: targetAssetStatus },
        },
      });

      // 7. Notify employee
      await tx.notification.create({
        data: {
          userId: req.allocation.employeeId,
          type: 'RETURN_COMPLETED',
          message: `Asset return for ${req.asset.name} has been approved. Status: ${targetAssetStatus}.`,
          relatedEntityId: req.allocationId,
        },
      });

      return req;
    });
  }

  /**
   * Reject Return request (Admin / Manager only)
   */
  async rejectReturn(id, reason, actor) {
    const req = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        allocation: { include: { employee: true } },
        asset: true,
      },
    });

    if (!req) {
      throw new ApiError(404, 'Return request not found');
    }

    if (req.status !== 'REQUESTED') {
      throw new ApiError(400, 'This return request is already processed');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Mark ReturnRequest as REJECTED
      const updatedReq = await tx.returnRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedReason: reason || 'Inspection rejected',
          reviewedById: actor.uuid,
          reviewedAt: new Date(),
        },
      });

      // 2. Add event log
      await tx.allocationEvent.create({
        data: {
          assetId: req.assetId,
          allocationId: req.allocationId,
          eventType: 'RETURN_REJECTED',
          actorId: actor.uuid,
          metadata: {
            returnRequestId: id,
            rejectedReason: reason,
          },
        },
      });

      // 3. Notify requester
      await tx.notification.create({
        data: {
          userId: req.requestedById,
          type: 'RETURN_REJECTED',
          message: `Return request for asset ${req.asset.name} was rejected: ${reason || 'None provided'}`,
          relatedEntityId: req.id,
        },
      });

      return updatedReq;
    });
  }

  /**
   * Fetch chronological unified history timeline
   */
  async getAllocationHistory(query, user) {
    const where = {};

    // Scopes
    if (user.role === 'DEPARTMENT_HEAD') {
      where.asset = { departmentId: user.departmentId };
    } else if (user.role === 'EMPLOYEE') {
      where.allocation = { employeeId: user.uuid };
    }

    if (query.assetId) {
      where.assetId = query.assetId;
    }
    if (query.employeeId) {
      where.allocation = { ...where.allocation, employeeId: query.employeeId };
    }

    const events = await prisma.allocationEvent.findMany({
      where,
      include: {
        asset: { select: { name: true, assetTag: true } },
        actor: { select: { name: true, email: true, role: true } },
        allocation: {
          include: {
            employee: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // safety cap
    });

    return events;
  }

  /**
   * List transfer requests with role checks
   */
  async getTransferRequests(query, user) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where = {};

    if (user.role === 'DEPARTMENT_HEAD') {
      where.OR = [
        { currentHolder: { departmentId: user.departmentId } },
        { newHolder: { departmentId: user.departmentId } },
      ];
    } else if (user.role === 'EMPLOYEE') {
      where.OR = [
        { requestedById: user.uuid },
        { requestedToId: user.uuid },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    const [requests, total] = await Promise.all([
      prisma.transferRequest.findMany({
        where,
        include: {
          asset: { select: { id: true, name: true, assetTag: true } },
          requestedBy: { select: { name: true, email: true } },
          requestedTo: { select: { name: true, email: true } },
          currentHolder: { select: { name: true, email: true, departmentId: true } },
          newHolder: { select: { name: true, email: true, departmentId: true } },
          approvedBy: { select: { name: true } },
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transferRequest.count({ where }),
    ]);

    return {
      data: requests,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * List return requests with role checks
   */
  async getReturnRequests(query, user) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where = {};

    if (user.role === 'DEPARTMENT_HEAD') {
      where.allocation = { departmentId: user.departmentId };
    } else if (user.role === 'EMPLOYEE') {
      where.requestedById = user.uuid;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [requests, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where,
        include: {
          asset: { select: { id: true, name: true, assetTag: true } },
          requestedBy: { select: { name: true, email: true } },
          allocation: { select: { departmentId: true } },
          reviewedBy: { select: { name: true } },
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.returnRequest.count({ where }),
    ]);

    return {
      data: requests,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export default new AllocationService();
