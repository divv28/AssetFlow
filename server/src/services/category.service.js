import prisma from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { logAction } from '../utils/auditLogger.js';

class CategoryService {
  /**
   * Fetch paginated asset categories.
   */
  async getCategories({ page = 1, limit = 20, sortBy = 'createdAt', order = 'desc', search = '', status }) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Filter conditions
    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    // Sorting parameters
    const allowedSortFields = ['name', 'warrantyMonths', 'depreciationYears', 'createdAt', 'status'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortField]: sortOrder },
      }),
      prisma.category.count({ where }),
    ]);

    return {
      categories,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Fetch category by ID.
   */
  async getCategoryById(id) {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new ApiError(404, 'Asset category not found');
    }

    return category;
  }

  /**
   * Create a new category.
   */
  async createCategory(data, actorUuid) {
    const { name, description, warrantyMonths, depreciationYears } = data;

    // Check uniqueness
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      throw new ApiError(400, 'Asset category name already exists');
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
        warrantyMonths,
        depreciationYears,
        status: 'ACTIVE',
      },
    });

    // Write audit log
    await logAction({
      actorId: actorUuid,
      action: 'CATEGORY_CREATED',
      entityType: 'Category',
      entityId: category.id,
      metadata: { name, warrantyMonths, depreciationYears },
    });

    return category;
  }

  /**
   * Update category fields.
   */
  async updateCategory(id, data, actorUuid) {
    const { name, description, warrantyMonths, depreciationYears } = data;

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new ApiError(404, 'Asset category not found');
    }

    // Check unique name if changing name
    if (name && name !== category.name) {
      const existing = await prisma.category.findUnique({ where: { name } });
      if (existing) {
        throw new ApiError(400, 'Asset category name already exists');
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name,
        description,
        warrantyMonths,
        depreciationYears,
      },
    });

    // Audit log
    await logAction({
      actorId: actorUuid,
      action: 'CATEGORY_UPDATED',
      entityType: 'Category',
      entityId: id,
      metadata: {
        before: { name: category.name, warrantyMonths: category.warrantyMonths, depreciationYears: category.depreciationYears },
        after: { name, warrantyMonths, depreciationYears },
      },
    });

    return updated;
  }

  /**
   * Toggle active status.
   */
  async updateCategoryStatus(id, status, actorUuid) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new ApiError(404, 'Asset category not found');
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { status },
    });

    // Audit log
    await logAction({
      actorId: actorUuid,
      action: status === 'ACTIVE' ? 'CATEGORY_ACTIVATED' : 'CATEGORY_DEACTIVATED',
      entityType: 'Category',
      entityId: id,
      metadata: { name: category.name, status },
    });

    return updated;
  }
}

export default new CategoryService();
