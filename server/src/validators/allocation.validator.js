import { z } from 'zod';

const returnConditionSchema = z.enum(['EXCELLENT', 'GOOD', 'DAMAGED', 'NEEDS_REPAIR']);

export const createAllocationSchema = z.object({
  assetId: z.string().uuid('Invalid Asset ID selection'),
  employeeId: z.string().uuid('Invalid Employee selection'),
  departmentId: z.string().uuid('Invalid Department selection'),
  expectedReturnDate: z.preprocess((val) => (val === '' ? null : val), z.string().datetime().or(z.string().date()).nullable().optional()),
  conditionAtAllocation: z.string().trim().max(100).optional().or(z.literal('')),
  remarks: z.string().trim().max(1000).optional().or(z.literal('')),
});

export const updateAllocationSchema = z.object({
  expectedReturnDate: z.preprocess((val) => (val === '' ? null : val), z.string().datetime().or(z.string().date()).nullable().optional()),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

export const createTransferSchema = z.object({
  allocationId: z.string().uuid('Invalid Allocation ID'),
  requestedToId: z.string().uuid('Invalid proposed new holder select'),
  reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').nullable().optional(),
});

export const createReturnSchema = z.object({
  allocationId: z.string().uuid('Invalid Allocation ID'),
  condition: returnConditionSchema,
  notes: z.string().trim().max(1000).nullable().optional(),
});

export const reviewRequestSchema = z.object({
  rejectedReason: z.string().trim().max(500).nullable().optional(),
});
