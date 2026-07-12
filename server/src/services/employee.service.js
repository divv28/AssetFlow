import prisma from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { logAction } from '../utils/auditLogger.js';
import departmentService from './department.service.js';

class EmployeeService {
  /**
   * List all employees with pagination, search, sorting and filtering.
   */
  async getEmployees({ page = 1, limit = 20, sortBy = 'createdAt', order = 'desc', search = '', departmentId, role, status }) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Filters
    const where = {};

    if (departmentId) {
      where.departmentId = departmentId;
    }
    if (role) {
      where.role = role;
    }
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Sorting fields
    const allowedSortFields = ['name', 'email', 'role', 'status', 'createdAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    const [employees, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortField]: sortOrder },
        select: {
          id: true,
          uuid: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          departmentId: true,
          department: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      employees,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Fetch employee details by UUID.
   */
  async getEmployeeById(uuid) {
    const employee = await prisma.user.findUnique({
      where: { uuid },
      select: {
        id: true,
        uuid: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        departmentId: true,
        department: { select: { id: true, name: true, code: true } },
      },
    });

    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }

    return employee;
  }

  /**
   * Promote or demote employee role.
   * Runs self-promotion guard + last-admin guard + department-head reassignment.
   */
  async updateEmployeeRole(uuid, role, actorUuid) {
    // 1. Self action guard block
    if (uuid === actorUuid) {
      throw new ApiError(400, 'Admins cannot change their own roles.');
    }

    const employee = await prisma.user.findUnique({ where: { uuid } });
    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }

    // 2. Last active admin guard
    if (employee.role === 'ADMIN' && role !== 'ADMIN') {
      await this.assertAtLeastOneAdmin(uuid);
    }

    // 3. Department head reassignment logic
    if (role === 'DEPARTMENT_HEAD') {
      if (!employee.departmentId) {
        throw new ApiError(400, 'User must be assigned to a department before they can be promoted to Department Head.');
      }
      // Delegate to department service to trigger transaction reverting previous head
      await departmentService.assignDepartmentHead(employee.departmentId, uuid, actorUuid);
      
      // Fetch and return the updated user details
      return this.getEmployeeById(uuid);
    }

    // Otherwise standard update
    return await prisma.$transaction(async (tx) => {
      // If they were previously a department head, unlink them from the department headId first
      if (employee.role === 'DEPARTMENT_HEAD') {
        await tx.department.updateMany({
          where: { headId: employee.uuid },
          data: { headId: null },
        });
      }

      const updated = await tx.user.update({
        where: { uuid },
        data: { role },
      });

      await logAction({
        actorId: actorUuid,
        action: 'EMPLOYEE_ROLE_PROMOTED',
        entityType: 'User',
        entityId: employee.uuid,
        metadata: { name: employee.name, before: employee.role, after: role },
      }, tx);

      return updated;
    });
  }

  /**
   * Assign employee to department.
   */
  async updateEmployeeDepartment(uuid, departmentId, actorUuid) {
    const employee = await prisma.user.findUnique({ where: { uuid } });
    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }

    // Check if new department exists and is active
    if (departmentId) {
      const dept = await prisma.department.findFirst({ where: { id: departmentId, deletedAt: null } });
      if (!dept) {
        throw new ApiError(404, 'Department not found or is currently inactive.');
      }
    }

    return await prisma.$transaction(async (tx) => {
      // If the employee was a DEPARTMENT_HEAD, moving them to a new department
      // demotes them back to EMPLOYEE unless they are specifically assigned as head of the new department
      let finalRole = employee.role;
      if (employee.role === 'DEPARTMENT_HEAD' && employee.departmentId !== departmentId) {
        finalRole = 'EMPLOYEE';
        // Remove head link from the old department
        await tx.department.updateMany({
          where: { headId: employee.uuid },
          data: { headId: null },
        });
      }

      const updated = await tx.user.update({
        where: { uuid },
        data: {
          departmentId: departmentId || null,
          role: finalRole,
        },
      });

      await logAction({
        actorId: actorUuid,
        action: 'EMPLOYEE_DEPARTMENT_ASSIGNED',
        entityType: 'User',
        entityId: employee.uuid,
        metadata: {
          name: employee.name,
          beforeDept: employee.departmentId,
          afterDept: departmentId,
        },
      }, tx);

      return updated;
    });
  }

  /**
   * Activate / Deactivate employee user status.
   * Runs last-admin guard check.
   */
  async updateEmployeeStatus(uuid, status, actorUuid) {
    if (uuid === actorUuid) {
      throw new ApiError(400, 'Admins cannot change their own account status.');
    }

    const employee = await prisma.user.findUnique({ where: { uuid } });
    if (!employee) {
      throw new ApiError(404, 'Employee not found');
    }

    // 1. Last active admin guard
    if (employee.role === 'ADMIN' && status === 'INACTIVE') {
      await this.assertAtLeastOneAdmin(uuid);
    }

    return await prisma.$transaction(async (tx) => {
      // If deactivating and they are a Department Head, remove them from being head
      if (status === 'INACTIVE' && employee.role === 'DEPARTMENT_HEAD') {
        await tx.department.updateMany({
          where: { headId: employee.uuid },
          data: { headId: null },
        });
      }

      const updated = await tx.user.update({
        where: { uuid },
        data: { status },
      });

      await logAction({
        actorId: actorUuid,
        action: status === 'ACTIVE' ? 'EMPLOYEE_ACTIVATED' : 'EMPLOYEE_DEACTIVATED',
        entityType: 'User',
        entityId: employee.uuid,
        metadata: { name: employee.name, status },
      }, tx);

      return updated;
    });
  }

  /**
   * Guard checking to ensure at least one active admin remains in the system.
   */
  async assertAtLeastOneAdmin(targetUuid) {
    const activeAdmins = await prisma.user.count({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    // If there is only 1 active admin, and it's the one we are modifying, reject
    if (activeAdmins <= 1) {
      throw new ApiError(400, 'Cannot demote or deactivate: at least one active Admin must remain.');
    }
  }

  /**
   * Retrieve counts for dashboard metrics.
   */
  async getDashboardStats() {
    const [totalDepartments, totalCategories, totalEmployees, departmentHeads, assetManagers] = await Promise.all([
      prisma.department.count({ where: { deletedAt: null } }),
      prisma.category.count({}),
      prisma.user.count({}),
      prisma.user.count({ where: { role: 'DEPARTMENT_HEAD', status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'ASSET_MANAGER', status: 'ACTIVE' } }),
    ]);

    return {
      totalDepartments,
      totalCategories,
      totalEmployees,
      departmentHeads,
      assetManagers,
    };
  }
}

export default new EmployeeService();
