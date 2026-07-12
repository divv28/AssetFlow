import categoryService from '../services/category.service.js';
import { createCategorySchema, updateCategorySchema } from '../validators/org.validator.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getCategories = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, order, search, status } = req.query;
  const result = await categoryService.getCategories({
    page,
    limit,
    sortBy,
    order,
    search,
    status,
  });

  return res.status(200).json({
    success: true,
    message: 'Categories retrieved successfully',
    data: result.categories,
    meta: result.meta,
  });
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryById(req.params.id);
  return res.status(200).json(new ApiResponse(200, category, 'Category retrieved successfully'));
});

export const createCategory = asyncHandler(async (req, res) => {
  const validated = createCategorySchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const category = await categoryService.createCategory(validated.data, req.user.uuid);
  return res.status(201).json(new ApiResponse(201, category, 'Asset category created successfully'));
});

export const updateCategory = asyncHandler(async (req, res) => {
  const validated = updateCategorySchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const category = await categoryService.updateCategory(req.params.id, validated.data, req.user.uuid);
  return res.status(200).json(new ApiResponse(200, category, 'Asset category updated successfully'));
});

export const updateCategoryStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (status !== 'ACTIVE' && status !== 'INACTIVE') {
    throw new ApiError(400, 'Invalid status. Must be ACTIVE or INACTIVE.');
  }

  const category = await categoryService.updateCategoryStatus(req.params.id, status, req.user.uuid);
  return res.status(200).json(new ApiResponse(200, category, `Asset category successfully set to ${status}`));
});
