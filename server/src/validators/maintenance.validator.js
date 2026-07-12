import { z } from 'zod';

const maintenancePrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const maintenanceStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS', 'RESOLVED']);

export const createMaintenanceSchema = z.object({
  assetId: z.string().uuid('Invalid Asset selected'),
  priority: maintenancePrioritySchema.default('MEDIUM'),
  description: z.string().trim().min(5, 'Issue description must be at least 5 characters long').max(1000),
  photo: z.string().trim().url('Invalid photo URL').nullable().optional().or(z.literal('')),
});

export const assignTechnicianSchema = z.object({
  technicianId: z.string().uuid('Invalid Technician employee selected'),
});

export const resolveMaintenanceSchema = z.object({
  resolutionNotes: z.string().trim().min(5, 'Resolution notes must be at least 5 characters long').max(1000),
});

export const updateMaintenanceStatusSchema = z.object({
  status: maintenanceStatusSchema,
});
