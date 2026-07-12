import prisma from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { logAction } from '../utils/auditLogger.js';

class DepartmentService {
  /**
   * Fetch all active/inactive departments with hierarchy and creator details.
   */
  async getDepartments({ page = 1, limit = 20, sortBy = 'createdAt', order = 'desc', search = '', status }) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build conditions
    const where = {
      deletedAt: null, // Only active/soft-deletable departments
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Validate sortBy exists on model
    const allowedSortFields = ['name', 'code', 'createdAt', 'status'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortField]: sortOrder },
        include: {
          parentDepartment: { select: { id: true, name: true, code: true } },
          head: { select: { uuid: true, name: true, email: true } },
          creator: { select: { uuid: true, name: true } },
          _count: { select: { employees: true } },
        },
      }),
      prisma.department.count({ where }),
    ]);

    return {
      departments,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Fetch department by ID.
   */
  async getDepartmentById(id) {
    const department = await prisma.department.findFirst({
      where: { id, deletedAt: null },
      include: {
        parentDepartment: { select: { id: true, name: true, code: true } },
        head: { select: { uuid: true, name: true, email: true } },
        creator: { select: { uuid: true, name: true } },
      },
    });

    if (!department) {
      throw new ApiError(404, 'Department not found');
    }

    return department;
  }

  /**
   * Create a new department.
   */
  async createDepartment(data, actorUuid) {
    const { name, code, description, parentDepartmentId, headId } = data;

    // Check unique criteria
    const existingName = await prisma.department.findFirst({ where: { name, deletedAt: null } });
    if (existingName) {
      throw new ApiError(400, 'Department name already exists');
    }

    const existingCode = await prisma.department.findFirst({ where: { code, deletedAt: null } });
    if (existingCode) {
      throw new ApiError(400, 'Department code already exists');
    }

    // Verify parent cycle
    if (parentDepartmentId) {
      await this.validateCycle(null, parentDepartmentId);
    }

    // Use transaction to create department and link head if needed
    return await prisma.$transaction(async (tx) => {
      const newDept = await tx.department.create({
        data: {
          name,
          code,
          description,
          parentDepartmentId: parentDepartmentId || null,
          createdById: actorUuid,
          status: 'ACTIVE',
        },
      });

      // Write Audit Log
      await logAction({
        actorId: actorUuid,
        action: 'DEPARTMENT_CREATED',
        entityType: 'Department',
        entityId: newDept.id,
        metadata: { name, code, parentDepartmentId },
      }, tx);

      // If a head user is immediately selected, assign them
      if (headId) {
        // Run head assignment transaction inside this block
        await this.assignHeadTx(newDept.id, headId, actorUuid, tx);
      }

      return newDept;
    });
  }

  /**
   * Update department details.
   */
  async updateDepartment(id, data, actorUuid) {
    const { name, code, description, parentDepartmentId, headId } = data;

    const dept = await prisma.department.findFirst({ where: { id, deletedAt: null } });
    if (!dept) {
      throw new ApiError(404, 'Department not found');
    }

    // Name unique check
    if (name && name !== dept.name) {
      const existingName = await prisma.department.findFirst({ where: { name, deletedAt: null } });
      if (existingName) {
        throw new ApiError(400, 'Department name already exists');
      }
    }

    // Code unique check
    if (code && code !== dept.code) {
      const existingCode = await prisma.department.findFirst({ where: { code, deletedAt: null } });
      if (existingCode) {
        throw new ApiError(400, 'Department code already exists');
      }
    }

    // Hierarchy cycle check
    if (parentDepartmentId) {
      if (parentDepartmentId === id) {
        throw new ApiError(400, 'Department cannot reference itself as a parent');
      }
      await this.validateCycle(id, parentDepartmentId);
    }

    return await prisma.$transaction(async (tx) => {
      const updatedDept = await tx.department.update({
        where: { id },
        data: {
          name,
          code,
          description,
          parentDepartmentId: parentDepartmentId === '' ? null : parentDepartmentId,
        },
      });

      // Write Audit Log
      await logAction({
        actorId: actorUuid,
        action: 'DEPARTMENT_UPDATED',
        entityType: 'Department',
        entityId: id,
        metadata: { before: { name: dept.name, code: dept.code, parentDepartmentId: dept.parentDepartmentId }, after: { name, code, parentDepartmentId } },
      }, tx);

      // Reassign head if headId changes
      if (headId !== undefined && headId !== dept.headId) {
        if (headId === null || headId === '') {
          await this.removeHeadTx(id, actorUuid, tx);
        } else {
          await this.assignHeadTx(id, headId, actorUuid, tx);
        }
      }

      return updatedDept;
    });
  }

  /**
   * Update department status (Active / Inactive).
   * Inactive status performs soft-deletion.
   */
  async updateDepartmentStatus(id, status, actorUuid) {
    const dept = await prisma.department.findFirst({ where: { id, deletedAt: null } });
    if (!dept) {
      throw new ApiError(404, 'Department not found');
    }

    if (status === 'INACTIVE') {
      // Deactivation Guard: Check for ACTIVE employees
      const activeEmployeeCount = await prisma.user.count({
        where: { departmentId: id, status: 'ACTIVE' },
      });

      if (activeEmployeeCount > 0) {
        throw new ApiError(
          400,
          `Cannot deactivate: ${activeEmployeeCount} active employees are assigned to this department.`
        );
      }

      // Soft delete
      return await prisma.$transaction(async (tx) => {
        const updated = await tx.department.update({
          where: { id },
          data: {
            status: 'INACTIVE',
            deletedAt: new Date(),
          },
        });

        // If department is deactivated, remove its headId to reset the user role
        if (dept.headId) {
          await this.removeHeadTx(id, actorUuid, tx);
        }

        await logAction({
          actorId: actorUuid,
          action: 'DEPARTMENT_DEACTIVATED',
          entityType: 'Department',
          entityId: id,
          metadata: { name: dept.name },
        }, tx);

        return updated;
      });
    } else {
      // Reactivate
      return await prisma.$transaction(async (tx) => {
        const updated = await tx.department.update({
          where: { id },
          data: {
            status: 'ACTIVE',
            deletedAt: null,
          },
        });

        await logAction({
          actorId: actorUuid,
          action: 'DEPARTMENT_ACTIVATED',
          entityType: 'Department',
          entityId: id,
          metadata: { name: dept.name },
        }, tx);

        return updated;
      });
    }
  }

  /**
   * Assign Department Head (Atomic method used by multiple triggers).
   */
  async assignDepartmentHead(departmentId, headUserUuid, actorUuid) {
    return await prisma.$transaction(async (tx) => {
      return await this.assignHeadTx(departmentId, headUserUuid, actorUuid, tx);
    });
  }

  // Transaction Helper for assigning a head
  async assignHeadTx(departmentId, headUserUuid, actorUuid, tx) {
    const dept = await tx.department.findUnique({
      where: { id: departmentId },
      select: { id: true, headId: true, name: true },
    });
    if (!dept) throw new ApiError(404, 'Department not found');

    const user = await tx.user.findUnique({
      where: { uuid: headUserUuid },
      select: { id: true, uuid: true, role: true, name: true },
    });
    if (!user) throw new ApiError(404, 'Employee not found');

    // 1. Revert previous head if exists
    if (dept.headId) {
      await tx.user.update({
        where: { uuid: dept.headId },
        data: { role: 'EMPLOYEE' },
      });
    }

    // 2. Clear headId from any other department where this user is currently the head
    await tx.department.updateMany({
      where: { headId: user.uuid, NOT: { id: departmentId } },
      data: { headId: null },
    });

    // 3. Set department headId to the user
    const updated = await tx.department.update({
      where: { id: departmentId },
      data: { headId: user.uuid },
    });

    // 4. Update the user role and department binding
    await tx.user.update({
      where: { id: user.id },
      data: {
        role: 'DEPARTMENT_HEAD',
        departmentId: departmentId,
      },
    });

    // 5. Audit Log
    await logAction({
      actorId: actorUuid,
      action: 'DEPARTMENT_HEAD_ASSIGNED',
      entityType: 'Department',
      entityId: departmentId,
      metadata: {
        departmentName: dept.name,
        newHeadName: user.name,
        newHeadUuid: user.uuid,
        previousHeadUuid: dept.headId,
      },
    }, tx);

    return updated;
  }

  // Transaction Helper for removing a head
  async removeHeadTx(departmentId, actorUuid, tx) {
    const dept = await tx.department.findUnique({
      where: { id: departmentId },
      select: { id: true, headId: true, name: true },
    });

    if (dept?.headId) {
      // Revert the head back to Employee
      await tx.user.update({
        where: { uuid: dept.headId },
        data: { role: 'EMPLOYEE' },
      });

      // Clear headId from department
      const updated = await tx.department.update({
        where: { id: departmentId },
        data: { headId: null },
      });

      // Audit Log
      await logAction({
        actorId: actorUuid,
        action: 'DEPARTMENT_HEAD_REMOVED',
        entityType: 'Department',
        entityId: departmentId,
        metadata: { departmentName: dept.name, removedHeadUuid: dept.headId },
      }, tx);

      return updated;
    }
  }

  /**
   * Cycle detection checking. Walks up the parent chains.
   */
  async validateCycle(departmentId, parentDepartmentId) {
    let currentParentId = parentDepartmentId;

    while (currentParentId) {
      if (currentParentId === departmentId) {
        throw new ApiError(400, 'Circular hierarchy detected! This assignment creates a recursive reference.');
      }

      const parent = await prisma.department.findUnique({
        where: { id: currentParentId },
        select: { id: true, parentDepartmentId: true },
      });

      currentParentId = parent?.parentDepartmentId;
    }
  }
}

export default new DepartmentService();
