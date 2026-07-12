import employeeService from '../services/employee.service.js';
import { updateEmployeeRoleSchema, updateEmployeeDepartmentSchema, updateEmployeeStatusSchema } from '../validators/org.validator.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getEmployees = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, order, search, departmentId, role, status } = req.query;
  const result = await employeeService.getEmployees({
    page,
    limit,
    sortBy,
    order,
    search,
    departmentId,
    role,
    status,
  });

  return res.status(200).json({
    success: true,
    message: 'Employees retrieved successfully',
    data: result.employees,
    meta: result.meta,
  });
});

export const getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await employeeService.getEmployeeById(req.params.id);
  return res.status(200).json(new ApiResponse(200, employee, 'Employee profile retrieved successfully'));
});

export const updateEmployeeRole = asyncHandler(async (req, res) => {
  const validated = updateEmployeeRoleSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const employee = await employeeService.updateEmployeeRole(req.params.id, validated.data.role, req.user.uuid);
  return res.status(200).json(new ApiResponse(200, employee, 'Employee role updated successfully'));
});

export const updateEmployeeDepartment = asyncHandler(async (req, res) => {
  const validated = updateEmployeeDepartmentSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const employee = await employeeService.updateEmployeeDepartment(req.params.id, validated.data.departmentId, req.user.uuid);
  return res.status(200).json(new ApiResponse(200, employee, 'Employee department updated successfully'));
});

export const updateEmployeeStatus = asyncHandler(async (req, res) => {
  const validated = updateEmployeeStatusSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const employee = await employeeService.updateEmployeeStatus(req.params.id, validated.data.status, req.user.uuid);
  return res.status(200).json(new ApiResponse(200, employee, `Employee account successfully set to ${validated.data.status}`));
});

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await employeeService.getDashboardStats();
  return res.status(200).json(new ApiResponse(200, stats, 'Dashboard stats retrieved successfully'));
});
