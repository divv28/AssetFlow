import maintenanceService from '../services/maintenance.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { 
  createMaintenanceSchema, 
  assignTechnicianSchema, 
  resolveMaintenanceSchema, 
  updateMaintenanceStatusSchema 
} from '../validators/maintenance.validator.js';

export const getRequests = asyncHandler(async (req, res) => {
  const result = await maintenanceService.getRequests(req.query, req.user);
  return res.status(200).json(new ApiResponse(200, result.data, 'Maintenance requests retrieved successfully', result.meta));
});

export const getRequestById = asyncHandler(async (req, res) => {
  const request = await maintenanceService.getRequestById(req.params.id, req.user);
  return res.status(200).json(new ApiResponse(200, request, 'Maintenance request details retrieved successfully'));
});

export const createRequest = asyncHandler(async (req, res) => {
  const validated = createMaintenanceSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const request = await maintenanceService.createRequest(validated.data, req.user);
  return res.status(201).json(new ApiResponse(201, request, 'Maintenance request created successfully'));
});

export const approveRequest = asyncHandler(async (req, res) => {
  const request = await maintenanceService.approveRequest(req.params.id, req.user);
  return res.status(200).json(new ApiResponse(200, request, 'Maintenance request approved successfully'));
});

export const rejectRequest = asyncHandler(async (req, res) => {
  const request = await maintenanceService.rejectRequest(req.params.id, req.body, req.user);
  return res.status(200).json(new ApiResponse(200, request, 'Maintenance request rejected successfully'));
});

export const assignTechnician = asyncHandler(async (req, res) => {
  const validated = assignTechnicianSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const request = await maintenanceService.assignTechnician(req.params.id, validated.data, req.user);
  return res.status(200).json(new ApiResponse(200, request, 'Technician assigned successfully'));
});

export const resolveRequest = asyncHandler(async (req, res) => {
  const validated = resolveMaintenanceSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const request = await maintenanceService.resolveRequest(req.params.id, validated.data, req.user);
  return res.status(200).json(new ApiResponse(200, request, 'Maintenance resolved successfully'));
});

export const updateRequestStatus = asyncHandler(async (req, res) => {
  const validated = updateMaintenanceStatusSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const request = await maintenanceService.updateRequestStatus(req.params.id, validated.data.status, req.user);
  return res.status(200).json(new ApiResponse(200, request, 'Status updated successfully'));
});
export const startRequest = asyncHandler(async (req, res) => {
  const request = await maintenanceService.startMaintenance(req.params.id, req.user);
  return res.status(200).json(new ApiResponse(200, request, 'Maintenance started successfully'));
});
