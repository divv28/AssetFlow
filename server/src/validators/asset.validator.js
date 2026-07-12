import { z } from 'zod';

// Condition & Status Enums
export const assetConditionSchema = z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']);
export const assetStatusSchema = z.enum(['AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED']);

// Create Asset Schema
export const createAssetSchema = z.object({
  name: z.string().trim().min(2, 'Asset name must be at least 2 characters long').max(100, 'Asset name cannot exceed 100 characters'),
  categoryId: z.string().uuid('Invalid category ID selection'),
  departmentId: z.preprocess((val) => (val === '' ? null : val), z.string().uuid('Invalid department ID selection').nullable().optional()),
  serialNumber: z.preprocess((val) => (val === '' ? null : val), z.string().trim().max(100).nullable().optional()),
  acquisitionDate: z.preprocess((val) => (val === '' ? null : val), z.string().datetime().or(z.string().date()).nullable().optional()),
  acquisitionCost: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return null;
    const parsed = Number(val);
    return isNaN(parsed) ? undefined : parsed;
  }, z.number().nonnegative('Acquisition cost must be positive').nullable().optional()),
  manufacturer: z.preprocess((val) => (val === '' ? null : val), z.string().trim().max(100).nullable().optional()),
  vendor: z.preprocess((val) => (val === '' ? null : val), z.string().trim().max(100).nullable().optional()),
  condition: assetConditionSchema.default('NEW'),
  location: z.preprocess((val) => (val === '' ? null : val), z.string().trim().max(100).nullable().optional()),
  isBookable: z.preprocess((val) => val === 'true' || val === true, z.boolean().default(false)),
  warrantyExpiry: z.preprocess((val) => (val === '' ? null : val), z.string().datetime().or(z.string().date()).nullable().optional()),
  remarks: z.preprocess((val) => (val === '' ? null : val), z.string().trim().max(1000).nullable().optional()),
});

// Update Asset Schema (All fields partial)
export const updateAssetSchema = createAssetSchema.partial();

// Status Change Schema
export const changeStatusSchema = z.object({
  toStatus: assetStatusSchema,
  reason: z.string().trim().min(1, 'Reason is required for status changes').max(500, 'Reason cannot exceed 500 characters').nullable().optional(),
});

// Asset Allocation / Distribution Schema
export const allocateAssetSchema = z.object({
  allocatedToId: z.string().uuid('Invalid employee UUID').nullable().optional(),
  reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').nullable().optional(),
});
