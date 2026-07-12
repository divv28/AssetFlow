import { z } from 'zod';

export const createAuditCycleSchema = z.object({
  name: z.string().min(2, 'Audit cycle name must be at least 2 characters'),
  departmentId: z.string().uuid().nullable().optional(),
  location: z.string().min(2, 'Location details must be at least 2 characters').nullable().optional(),
  startDate: z.string().transform((val) => new Date(val)),
  endDate: z.string().transform((val) => new Date(val)),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});

export const assignAuditorsSchema = z.object({
  auditorIds: z.array(z.string().uuid()).min(1, 'At least one auditor must be assigned'),
});

export const updateAuditItemSchema = z.object({
  status: z.enum(['VERIFIED', 'MISSING', 'DAMAGED', 'NOT_VERIFIED']),
  remarks: z.string().max(500, 'Remarks cannot exceed 500 characters').nullable().optional(),
  photo: z.string().url('Photo must be a valid URL/URI path').nullable().optional(),
});
