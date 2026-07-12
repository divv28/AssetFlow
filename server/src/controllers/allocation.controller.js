import allocationService from '../services/allocation.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { 
  createAllocationSchema, 
  updateAllocationSchema, 
  createTransferSchema, 
  createReturnSchema, 
  reviewRequestSchema 
} from '../validators/allocation.validator.js';

/**
 * List all allocations with pagination & filters
 */
export const getAllocations = asyncHandler(async (req, res) => {
  const result = await allocationService.getAllocations(req.query, req.user);
  return res.status(200).json(new ApiResponse(200, result.data, 'Allocations retrieved successfully', result.meta));
});

/**
 * Fetch allocation details
 */
export const getAllocationById = asyncHandler(async (req, res) => {
  const alloc = await allocationService.getAllocationById(req.params.id, req.user);
  return res.status(200).json(new ApiResponse(200, alloc, 'Allocation details retrieved successfully'));
});

/**
 * Allocate an asset (Admin / Asset Manager only)
 */
export const allocateAsset = asyncHandler(async (req, res) => {
  const validated = createAllocationSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const alloc = await allocationService.allocate(validated.data, req.user);
  return res.status(201).json(new ApiResponse(201, alloc, 'Asset allocated successfully'));
});

/**
 * Update non-status allocation fields (expected return date, notes)
 */
export const updateAllocation = asyncHandler(async (req, res) => {
  const validated = updateAllocationSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const alloc = await allocationService.updateAllocation(req.params.id, validated.data, req.user);
  return res.status(200).json(new ApiResponse(200, alloc, 'Allocation updated successfully'));
});

/**
 * Request Transfer
 */
export const requestTransfer = asyncHandler(async (req, res) => {
  const validated = createTransferSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const transfer = await allocationService.requestTransfer(validated.data, req.user);
  return res.status(201).json(new ApiResponse(201, transfer, 'Transfer request created successfully'));
});

/**
 * Approve Transfer
 */
export const approveTransfer = asyncHandler(async (req, res) => {
  const transfer = await allocationService.approveTransfer(req.params.id, req.user);
  return res.status(200).json(new ApiResponse(200, transfer, 'Transfer request approved and completed'));
});

/**
 * Reject Transfer
 */
export const rejectTransfer = asyncHandler(async (req, res) => {
  const validated = reviewRequestSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const transfer = await allocationService.rejectTransfer(req.params.id, validated.data.rejectedReason, req.user);
  return res.status(200).json(new ApiResponse(200, transfer, 'Transfer request rejected successfully'));
});

/**
 * Request Return (Employee / Manager)
 */
export const requestReturn = asyncHandler(async (req, res) => {
  const validated = createReturnSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  let photoUrl = null;
  if (req.file) {
    photoUrl = `${req.protocol}://${req.get('host')}/uploads/assets/${req.file.filename}`;
  }

  const returnReq = await allocationService.requestReturn(validated.data, req.user, photoUrl);
  return res.status(201).json(new ApiResponse(201, returnReq, 'Return request created successfully'));
});

/**
 * Approve Return (Admin / Manager only)
 */
export const approveReturn = asyncHandler(async (req, res) => {
  const returnReq = await allocationService.approveReturn(req.params.id, req.user);
  return res.status(200).json(new ApiResponse(200, returnReq, 'Return request approved successfully'));
});

/**
 * Reject Return (Admin / Manager only)
 */
export const rejectReturn = asyncHandler(async (req, res) => {
  const validated = reviewRequestSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const returnReq = await allocationService.rejectReturn(req.params.id, validated.data.rejectedReason, req.user);
  return res.status(200).json(new ApiResponse(200, returnReq, 'Return request rejected successfully'));
});

/**
 * List transfer requests
 */
export const getTransferRequests = asyncHandler(async (req, res) => {
  const result = await allocationService.getTransferRequests(req.query, req.user);
  return res.status(200).json(new ApiResponse(200, result.data, 'Transfer requests retrieved successfully', result.meta));
});

/**
 * List return requests
 */
export const getReturnRequests = asyncHandler(async (req, res) => {
  const result = await allocationService.getReturnRequests(req.query, req.user);
  return res.status(200).json(new ApiResponse(200, result.data, 'Return requests retrieved successfully', result.meta));
});

/**
 * List allocation timeline logs
 */
export const getAllocationHistory = asyncHandler(async (req, res) => {
  const history = await allocationService.getAllocationHistory(req.query, req.user);
  return res.status(200).json(new ApiResponse(200, history, 'Allocation history timeline retrieved successfully'));
});
