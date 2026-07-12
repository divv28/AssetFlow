import departmentService from '../services/department.service.js';
import { createDepartmentSchema, updateDepartmentSchema } from '../validators/org.validator.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDepartments = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, order, search, status } = req.query;
  const result = await departmentService.getDepartments({
    page,
    limit,
    sortBy,
    order,
    search,
    status,
  });

  return res.status(200).json({
    success: true,
    message: 'Departments retrieved successfully',
    data: result.departments,
    meta: result.meta,
  });
});

export const getDepartmentById = asyncHandler(async (req, res) => {
  const department = await departmentService.getDepartmentById(req.params.id);
  return res.status(200).json(new ApiResponse(200, department, 'Department retrieved successfully'));
});

export const createDepartment = asyncHandler(async (req, res) => {
  const validated = createDepartmentSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const dept = await departmentService.createDepartment(validated.data, req.user.uuid);
  return res.status(201).json(new ApiResponse(201, dept, 'Department created successfully'));
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const validated = updateDepartmentSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const dept = await departmentService.updateDepartment(req.params.id, validated.data, req.user.uuid);
  return res.status(200).json(new ApiResponse(200, dept, 'Department updated successfully'));
});

export const updateDepartmentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (status !== 'ACTIVE' && status !== 'INACTIVE') {
    throw new ApiError(400, 'Invalid status. Must be ACTIVE or INACTIVE.');
  }

  const dept = await departmentService.updateDepartmentStatus(req.params.id, status, req.user.uuid);
  return res.status(200).json(new ApiResponse(200, dept, `Department successfully set to ${status}`));
});
