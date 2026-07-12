import * as activityService from '../services/activity.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';

export const getActivityLogs = asyncHandler(async (req, res) => {
  // Security RBAC enforce
  if (req.user.role !== 'ADMIN') {
    throw new ApiError(403, 'Access denied. Only administrators can view activity audit trails.');
  }

  const { search, module, userId, action, startDate, endDate, limit, page } = req.query;

  const data = await activityService.getActivityLogs({
    search,
    module,
    userId,
    action,
    startDate,
    endDate,
    limit,
    page,
  });

  res.status(200).json({
    success: true,
    data: data.items,
    pagination: data.pagination,
  });
});

export const getActivityLogDetail = asyncHandler(async (req, res) => {
  // Security RBAC enforce
  if (req.user.role !== 'ADMIN') {
    throw new ApiError(403, 'Access denied. Only administrators can view activity audit trails.');
  }

  const { id } = req.params;
  const log = await activityService.getActivityLogById(id);

  if (!log) {
    throw new ApiError(404, 'Activity log record not found');
  }

  res.status(200).json({
    success: true,
    data: log,
  });
});
