import prisma from '../config/db.js';

export const getActivityLogs = async ({
  search = '',
  module,
  userId,
  action,
  startDate,
  endDate,
  limit = 20,
  page = 1,
}) => {
  const where = {};

  if (module) {
    where.module = module;
  }

  if (userId) {
    where.userId = userId;
  }

  if (action) {
    where.action = action;
  }

  // Date filters
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  // Search filter
  if (search) {
    where.OR = [
      { action: { contains: search, mode: 'insensitive' } },
      { module: { contains: search, mode: 'insensitive' } },
      { entityId: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const offset = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    }),
    prisma.activityLog.count({ where }),
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

export const getActivityLogById = async (id) => {
  return prisma.activityLog.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
};
