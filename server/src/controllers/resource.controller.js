import resourceService from '../services/resource.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { createResourceSchema, updateResourceSchema } from '../validators/resource.validator.js';

export const getResources = asyncHandler(async (req, res) => {
  const result = await resourceService.getResources(req.query);
  return res.status(200).json(new ApiResponse(200, result.data, 'Resources retrieved successfully', result.meta));
});

export const getResourceById = asyncHandler(async (req, res) => {
  const resource = await resourceService.getResourceById(req.params.id);
  return res.status(200).json(new ApiResponse(200, resource, 'Resource details retrieved successfully'));
});

export const createResource = asyncHandler(async (req, res) => {
  const validated = createResourceSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const resource = await resourceService.createResource(validated.data, req.user);
  return res.status(201).json(new ApiResponse(201, resource, 'Resource created successfully'));
});

export const updateResource = asyncHandler(async (req, res) => {
  const validated = updateResourceSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const resource = await resourceService.updateResource(req.params.id, validated.data, req.user);
  return res.status(200).json(new ApiResponse(200, resource, 'Resource updated successfully'));
});
