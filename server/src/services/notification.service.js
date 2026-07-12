import prisma from '../config/db.js';
import { sendRealtimeNotification } from '../config/socket.js';

export const createNotification = async ({
  userId,
  title,
  message,
  type,
  priority = 'MEDIUM',
  link = null,
  relatedEntityId = null,
}) => {
  try {
    // 1. Save to Database
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        priority,
        link,
        relatedEntityId,
        read: false,
        isRead: false,
      },
    });

    // 2. Dispatch Live Push
    sendRealtimeNotification(userId, notification);

    return notification;
  } catch (error) {
    console.error('[Notification Service] Failed to create notification:', error);
    throw error;
  }
};

export const getNotifications = async (userId, { search = '', read, priority, type, limit = 20, page = 1 }) => {
  const where = { userId };

  if (read !== undefined) {
    where.read = read === 'true' || read === true;
  }

  if (priority) {
    where.priority = priority;
  }

  if (type) {
    where.type = type;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { message: { contains: search, mode: 'insensitive' } },
    ];
  }

  const offset = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    }),
    prisma.notification.count({ where }),
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

export const markRead = async (userId, id) => {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true, isRead: true },
  });
};

export const markAllRead = async (userId) => {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true, isRead: true },
  });
};

export const deleteNotification = async (userId, id) => {
  return prisma.notification.deleteMany({
    where: { id, userId },
  });
};
