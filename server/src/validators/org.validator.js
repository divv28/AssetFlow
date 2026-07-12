import { z } from 'zod';

// Department Validators
export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, 'Department name must be at least 2 characters long').max(100),
  code: z.string().trim().min(1, 'Code must be at least 1 character long').max(10).toUpperCase(),
  description: z.string().trim().max(500).optional().nullable(),
  parentDepartmentId: z.string().uuid('Invalid parent department ID').optional().nullable(),
  headId: z.string().uuid('Invalid department head user UUID').optional().nullable(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

// Category Validators
export const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters long').max(100),
  description: z.string().trim().max(500).optional().nullable(),
  warrantyMonths: z.number().int().min(0, 'Warranty months must be 0 or greater').default(0),
  depreciationYears: z.number().int().min(0, 'Depreciation years must be 0 or greater').default(0),
});

export const updateCategorySchema = createCategorySchema.partial();

// Employee Validators
export const updateEmployeeRoleSchema = z.object({
  role: z.enum(['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'], {
    errorMap: () => ({ message: 'Invalid role selection' }),
  }),
});

export const updateEmployeeDepartmentSchema = z.object({
  departmentId: z.string().uuid('Invalid department ID').nullable().optional(),
});

export const updateEmployeeStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE'], {
    errorMap: () => ({ message: 'Invalid status selection' }),
  }),
});
