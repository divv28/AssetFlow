import prisma from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { logAction } from '../utils/auditLogger.js';

class ResourceService {
  /**
   * Fetch paginated and filterable resources
   */
  async getResources(query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const order = query.order || 'desc';

    const where = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.location) {
      where.location = { contains: query.location, mode: 'insensitive' };
    }
    if (query.bookable !== undefined && query.bookable !== '') {
      where.bookable = query.bookable === 'true' || query.bookable === true;
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    const capMin = parseInt(query.capacityMin);
    const capMax = parseInt(query.capacityMax);
    if (!isNaN(capMin) || !isNaN(capMax)) {
      where.capacity = {};
      if (!isNaN(capMin)) where.capacity.gte = capMin;
      if (!isNaN(capMax)) where.capacity.lte = capMax;
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [resources, totalCount] = await Promise.all([
      prisma.resource.findMany({
        where,
        include: {
          department: { select: { id: true, name: true, code: true } },
        },
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
      prisma.resource.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: resources,
      meta: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    };
  }

  /**
   * Fetch single resource by ID
   */
  async getResourceById(id) {
    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }

    return resource;
  }

  /**
   * Create a new resource (Admin / Asset Manager only)
   */
  async createResource(data, actor) {
    const resource = await prisma.resource.create({
      data: {
        name: data.name,
        category: data.category,
        description: data.description || null,
        departmentId: data.departmentId || null,
        location: data.location || null,
        capacity: data.capacity || null,
        status: data.status || 'ACTIVE',
        bookable: data.bookable !== undefined ? data.bookable : true,
        photo: data.photo || null,
      },
    });

    await logAction({
      actorId: actor.uuid,
      action: 'RESOURCE_CREATED',
      entityType: 'Resource',
      entityId: resource.id,
      metadata: { name: resource.name, category: resource.category },
    });

    return resource;
  }

  /**
   * Update resource details (Admin / Asset Manager only)
   */
  async updateResource(id, data, actor) {
    const existing = await prisma.resource.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, 'Resource not found');
    }

    const updated = await prisma.resource.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : existing.name,
        category: data.category !== undefined ? data.category : existing.category,
        description: data.description !== undefined ? data.description : existing.description,
        departmentId: data.departmentId !== undefined ? data.departmentId : existing.departmentId,
        location: data.location !== undefined ? data.location : existing.location,
        capacity: data.capacity !== undefined ? data.capacity : existing.capacity,
        status: data.status !== undefined ? data.status : existing.status,
        bookable: data.bookable !== undefined ? data.bookable : existing.bookable,
        photo: data.photo !== undefined ? data.photo : existing.photo,
      },
    });

    await logAction({
      actorId: actor.uuid,
      action: 'RESOURCE_UPDATED',
      entityType: 'Resource',
      entityId: updated.id,
      metadata: { before: existing, after: updated },
    });

    return updated;
  }
}

export default new ResourceService();
