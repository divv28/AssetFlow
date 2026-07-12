import prisma from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { createNotification } from './notification.service.js';

export const createAuditCycle = async (data, creatorUuid) => {
  return prisma.$transaction(async (tx) => {
    // 1. Create the Audit Cycle
    const cycle = await tx.auditCycle.create({
      data: {
        name: data.name,
        departmentId: data.departmentId || null,
        location: data.location || null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: 'DRAFT',
        createdBy: creatorUuid,
      },
    });

    // 2. Query matching assets to perform snapshot
    const assetFilters = { deletedAt: null };
    if (data.departmentId) {
      assetFilters.departmentId = data.departmentId;
    }
    if (data.location) {
      assetFilters.location = { contains: data.location, mode: 'insensitive' };
    }

    const assets = await tx.asset.findMany({
      where: assetFilters,
      select: { id: true },
    });

    // 3. Populate snapshot items
    if (assets.length > 0) {
      const itemsData = assets.map((asset) => ({
        auditCycleId: cycle.id,
        assetId: asset.id,
        status: 'NOT_VERIFIED',
      }));

      await tx.auditItem.createMany({
        data: itemsData,
      });
    }

    return cycle;
  });
};

export const getAuditCycles = async ({ search = '', status, departmentId, location, limit = 20, page = 1 }, user) => {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (departmentId) {
    where.departmentId = departmentId;
  }

  if (location) {
    where.location = { contains: location, mode: 'insensitive' };
  }

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  // RBAC scope filters
  if (user.role === 'EMPLOYEE') {
    // Employees can only see audits assigned to them
    where.assignments = {
      some: {
        auditorId: user.uuid,
      },
    };
  } else if (user.role === 'DEPARTMENT_HEAD') {
    // Department heads can see audits for their department
    where.departmentId = user.departmentId;
  }

  const offset = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.auditCycle.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        creator: { select: { id: true, name: true, role: true } },
        closer: { select: { id: true, name: true } },
        assignments: {
          include: {
            auditor: { select: { id: true, name: true, email: true } },
          },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    }),
    prisma.auditCycle.count({ where }),
  ]);

  return {
    items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getAuditCycleById = async (id) => {
  return prisma.auditCycle.findUnique({
    where: { id },
    include: {
      department: true,
      creator: { select: { id: true, name: true, email: true } },
      closer: { select: { id: true, name: true } },
      assignments: {
        include: {
          auditor: { select: { id: true, uuid: true, name: true, email: true } },
        },
      },
    },
  });
};

export const assignAuditors = async (cycleId, auditorIds, managerUuid) => {
  const cycle = await prisma.auditCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) throw new ApiError(404, 'Audit Cycle not found');

  if (cycle.status === 'CLOSED') {
    throw new ApiError(400, 'Cannot assign auditors to a closed audit cycle');
  }

  return prisma.$transaction(async (tx) => {
    // 1. Remove old assignments
    await tx.auditAssignment.deleteMany({ where: { auditCycleId: cycleId } });

    // 2. Add new assignments
    const assignments = await Promise.all(
      auditorIds.map((auditorId) =>
        tx.auditAssignment.create({
          data: {
            auditCycleId: cycleId,
            auditorId,
            assignedBy: managerUuid,
          },
        })
      )
    );

    // 3. Update status to ACTIVE if it was in DRAFT
    if (cycle.status === 'DRAFT') {
      await tx.auditCycle.update({
        where: { id: cycleId },
        data: { status: 'ACTIVE' },
      });
    }

    // 4. Send Notifications
    for (const auditorId of auditorIds) {
      await tx.notification.create({
        data: {
          userId: auditorId,
          title: 'Audit Cycle Assignment',
          message: `You have been assigned as an auditor for the cycle: ${cycle.name}. Please verify the matching assets.`,
          type: 'Audit Assigned',
          priority: 'HIGH',
          link: `/audits/${cycle.id}`,
        },
      });
    }

    return assignments;
  });
};

export const getAuditItems = async (cycleId) => {
  return prisma.auditItem.findMany({
    where: { auditCycleId: cycleId },
    include: {
      asset: {
        select: {
          id: true,
          name: true,
          assetTag: true,
          location: true,
          status: true,
        },
      },
      verifier: { select: { name: true } },
    },
  });
};

export const updateAuditItem = async (itemId, data, auditorUuid) => {
  const item = await prisma.auditItem.findUnique({
    where: { id: itemId },
    include: { auditCycle: true },
  });

  if (!item) throw new ApiError(404, 'Audit Item record not found');
  if (item.auditCycle.status !== 'ACTIVE') {
    throw new ApiError(400, 'Verify operations are only allowed on ACTIVE audit cycles');
  }

  return prisma.auditItem.update({
    where: { id: itemId },
    data: {
      status: data.status,
      remarks: data.remarks || null,
      photo: data.photo || null,
      verifiedAt: new Date(),
      verifiedBy: auditorUuid,
    },
  });
};

export const closeAuditCycle = async (cycleId, managerUuid) => {
  const cycle = await prisma.auditCycle.findUnique({
    where: { id: cycleId },
    include: {
      items: {
        include: { asset: true },
      },
    },
  });

  if (!cycle) throw new ApiError(404, 'Audit Cycle not found');
  if (cycle.status === 'CLOSED') {
    throw new ApiError(400, 'Audit cycle is already closed');
  }

  return prisma.$transaction(async (tx) => {
    // 1. Process business rules for audit items
    for (const item of cycle.items) {
      if (item.status === 'MISSING') {
        // Rule: Automatically mark asset as LOST
        await tx.asset.update({
          where: { id: item.assetId },
          data: { status: 'LOST' },
        });

        // Log transition in asset status history
        await tx.assetStatusHistory.create({
          data: {
            assetId: item.assetId,
            status: 'LOST',
            remarks: `Marked LOST automatically because it was reported MISSING in Audit Cycle: ${cycle.name}`,
            changedById: managerUuid,
          },
        });

        // Notify managers about missing asset
        const managers = await tx.user.findMany({
          where: { role: { in: ['ADMIN', 'ASSET_MANAGER'] } },
        });

        for (const manager of managers) {
          await tx.notification.create({
            data: {
              userId: manager.uuid,
              title: 'Asset Discrepancy - Missing',
              message: `Asset ${item.asset.name} (${item.asset.assetTag}) was not found during audit: ${cycle.name} and is marked LOST.`,
              type: 'Asset Lost',
              priority: 'HIGH',
              link: `/assets/${item.assetId}`,
            },
          });
        }
      } else if (item.status === 'DAMAGED') {
        // Rule: Automatically raise maintenance request
        await tx.maintenanceRequest.create({
          data: {
            assetId: item.assetId,
            raisedById: managerUuid,
            priority: 'HIGH',
            description: `Auto-generated from Audit Cycle: ${cycle.name}. Remarks: ${item.remarks || 'No notes provided.'}`,
            photo: item.photo || null,
            status: 'PENDING',
          },
        });

        // Notify managers
        const managers = await tx.user.findMany({
          where: { role: { in: ['ADMIN', 'ASSET_MANAGER'] } },
        });

        for (const manager of managers) {
          await tx.notification.create({
            data: {
              userId: manager.uuid,
              title: 'Asset Discrepancy - Damaged',
              message: `Asset ${item.asset.name} (${item.asset.assetTag}) was reported DAMAGED in audit cycle: ${cycle.name}. A high-priority maintenance ticket has been generated.`,
              type: 'Asset Damaged',
              priority: 'HIGH',
              link: `/maintenance`,
            },
          });
        }
      }
    }

    // 2. Mark cycle as CLOSED
    const updatedCycle = await tx.auditCycle.update({
      where: { id: cycleId },
      data: {
        status: 'CLOSED',
        closedBy: managerUuid,
        closedAt: new Date(),
      },
    });

    // 3. Send Notification to Creator
    await tx.notification.create({
      data: {
        userId: cycle.createdBy,
        title: 'Audit Cycle Closed',
        message: `Audit cycle: ${cycle.name} has been reviewed and closed. Review the generated discrepancies report.`,
        type: 'Audit Completed',
        priority: 'MEDIUM',
        link: `/audits/${cycle.id}/report`,
      },
    });

    return updatedCycle;
  });
};

export const getDiscrepancyReport = async (cycleId) => {
  const cycle = await prisma.auditCycle.findUnique({
    where: { id: cycleId },
    include: {
      department: true,
      creator: { select: { name: true, role: true } },
      closer: { select: { name: true } },
      assignments: {
        include: { auditor: { select: { name: true, email: true } } },
      },
      items: {
        include: {
          asset: {
            select: {
              name: true,
              assetTag: true,
              serialNumber: true,
              location: true,
              status: true,
            },
          },
          verifier: { select: { name: true } },
        },
      },
    },
  });

  if (!cycle) throw new ApiError(404, 'Audit Cycle not found');

  const missing = cycle.items.filter((i) => i.status === 'MISSING');
  const damaged = cycle.items.filter((i) => i.status === 'DAMAGED');
  const verified = cycle.items.filter((i) => i.status === 'VERIFIED');
  const notVerified = cycle.items.filter((i) => i.status === 'NOT_VERIFIED');

  return {
    cycleName: cycle.name,
    department: cycle.department?.name || 'All Departments',
    location: cycle.location || 'All Locations',
    startDate: cycle.startDate,
    endDate: cycle.endDate,
    status: cycle.status,
    createdBy: cycle.creator.name,
    closedBy: cycle.closer?.name || null,
    closedAt: cycle.closedAt,
    auditors: cycle.assignments.map((a) => a.auditor.name),
    summary: {
      totalItems: cycle.items.length,
      verifiedCount: verified.length,
      missingCount: missing.length,
      damagedCount: damaged.length,
      unverifiedCount: notVerified.length,
    },
    missingAssets: missing.map((item) => ({
      name: item.asset.name,
      tag: item.asset.assetTag,
      location: item.asset.location,
      remarks: item.remarks,
      verifier: item.verifier?.name || 'Unassigned',
      verifiedAt: item.verifiedAt,
    })),
    damagedAssets: damaged.map((item) => ({
      name: item.asset.name,
      tag: item.asset.assetTag,
      location: item.asset.location,
      remarks: item.remarks,
      photo: item.photo,
      verifier: item.verifier?.name || 'Unassigned',
      verifiedAt: item.verifiedAt,
    })),
    allAuditedItems: cycle.items.map((item) => ({
      name: item.asset.name,
      tag: item.asset.assetTag,
      status: item.status,
      remarks: item.remarks,
      verifier: item.verifier?.name || 'Unassigned',
      verifiedAt: item.verifiedAt,
    })),
  };
};
