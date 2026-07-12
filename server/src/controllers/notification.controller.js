import * as notificationService from '../services/notification.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getMyNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.uuid;
  const { search, read, priority, type, limit, page } = req.query;

  const data = await notificationService.getNotifications(userId, {
    search,
    read,
    priority,
    type,
    limit,
    page,
  });

  res.status(200).json({
    success: true,
    data: data.items,
    pagination: data.pagination,
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const userId = req.user.uuid;
  const { id } = req.params;

  await notificationService.markRead(userId, id);

  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
  });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const userId = req.user.uuid;

  await notificationService.markAllRead(userId);

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
  });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const userId = req.user.uuid;
  const { id } = req.params;

  await notificationService.deleteNotification(userId, id);

  res.status(200).json({
    success: true,
    message: 'Notification deleted successfully',
  });
});
