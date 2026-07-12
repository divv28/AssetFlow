import * as auditService from '../services/audit.service.js';
import { createAuditCycleSchema, assignAuditorsSchema, updateAuditItemSchema } from '../validators/audit.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';

export const createAudit = asyncHandler(async (req, res) => {
  if (!['ADMIN', 'ASSET_MANAGER'].includes(req.user.role)) {
    throw new ApiError(403, 'Permission denied. Only Admins and Asset Managers can schedule audit cycles.');
  }

  const validatedData = createAuditCycleSchema.parse(req.body);
  const cycle = await auditService.createAuditCycle(validatedData, req.user.uuid);

  res.status(201).json({
    success: true,
    data: cycle,
  });
});

export const listAuditCycles = asyncHandler(async (req, res) => {
  const { search, status, departmentId, location, limit, page } = req.query;
  const data = await auditService.getAuditCycles(
    { search, status, departmentId, location, limit, page },
    req.user
  );

  res.status(200).json({
    success: true,
    data: data.items,
    pagination: data.pagination,
  });
});

export const getAuditCycleDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const cycle = await auditService.getAuditCycleById(id);

  if (!cycle) {
    throw new ApiError(404, 'Audit Cycle not found');
  }

  // Security Check: enforce role restriction
  if (req.user.role === 'EMPLOYEE') {
    const isAssigned = cycle.assignments.some((a) => a.auditor.uuid === req.user.uuid);
    if (!isAssigned) {
      throw new ApiError(403, 'Access denied. You can only view audit cycles assigned to you.');
    }
  } else if (req.user.role === 'DEPARTMENT_HEAD') {
    if (cycle.departmentId && cycle.departmentId !== req.user.departmentId) {
      throw new ApiError(403, 'Access denied. You can only view audits related to your department.');
    }
  }

  res.status(200).json({
    success: true,
    data: cycle,
  });
});

export const assignAuditorsToCycle = asyncHandler(async (req, res) => {
  if (!['ADMIN', 'ASSET_MANAGER'].includes(req.user.role)) {
    throw new ApiError(403, 'Permission denied. Only Admins and Asset Managers can assign auditors.');
  }

  const { id } = req.params;
  const { auditorIds } = assignAuditorsSchema.parse(req.body);

  const assignments = await auditService.assignAuditors(id, auditorIds, req.user.uuid);

  res.status(200).json({
    success: true,
    data: assignments,
  });
});

export const getItemsForCycle = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Enforce cycle existence check
  const cycle = await auditService.getAuditCycleById(id);
  if (!cycle) {
    throw new ApiError(404, 'Audit Cycle not found');
  }

  // RBAC checks
  if (req.user.role === 'EMPLOYEE') {
    const isAssigned = cycle.assignments.some((a) => a.auditor.uuid === req.user.uuid);
    if (!isAssigned) {
      throw new ApiError(403, 'Access denied. You can only verify items for cycles assigned to you.');
    }
  } else if (req.user.role === 'DEPARTMENT_HEAD') {
    if (cycle.departmentId && cycle.departmentId !== req.user.departmentId) {
      throw new ApiError(403, 'Access denied. You can only view items for audits in your department.');
    }
  }

  const items = await auditService.getAuditItems(id);

  res.status(200).json({
    success: true,
    data: items,
  });
});

export const updateAuditVerificationItem = asyncHandler(async (req, res) => {
  const { id } = req.params; // Item ID
  const validatedData = updateAuditItemSchema.parse(req.body);

  const updatedItem = await auditService.updateAuditItem(id, validatedData, req.user.uuid);

  res.status(200).json({
    success: true,
    data: updatedItem,
  });
});

export const closeAudit = asyncHandler(async (req, res) => {
  if (!['ADMIN', 'ASSET_MANAGER'].includes(req.user.role)) {
    throw new ApiError(403, 'Permission denied. Only Admins and Asset Managers can close audit cycles.');
  }

  const { id } = req.params;
  const closedCycle = await auditService.closeAuditCycle(id, req.user.uuid);

  res.status(200).json({
    success: true,
    data: closedCycle,
  });
});

export const getDiscrepancyAuditReport = asyncHandler(async (req, res) => {
  const { id } = req.params; // Cycle ID
  const report = await auditService.getDiscrepancyReport(id);

  res.status(200).json({
    success: true,
    data: report,
  });
});
