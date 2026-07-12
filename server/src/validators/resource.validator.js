import { z } from 'zod';

const resourceStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'RETIRED', 'DISPOSED']);

export const createResourceSchema = z.object({
  name: z.string().trim().min(2, 'Resource name must be at least 2 characters long').max(100),
  category: z.string().trim().min(1, 'Category is required'),
  description: z.string().trim().max(1000).nullable().optional().or(z.literal('')),
  departmentId: z.preprocess((val) => (val === '' ? null : val), z.string().uuid('Invalid Department ID').nullable().optional()),
  location: z.string().trim().max(100).nullable().optional().or(z.literal('')),
  capacity: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return null;
    const parsed = Number(val);
    return isNaN(parsed) ? undefined : parsed;
  }, z.number().int().positive('Capacity must be a positive integer').nullable().optional()),
  status: resourceStatusSchema.default('ACTIVE'),
  bookable: z.preprocess((val) => val === 'true' || val === true, z.boolean().default(true)),
  photo: z.string().url('Invalid photo URL').nullable().optional().or(z.literal('')),
});

export const updateResourceSchema = createResourceSchema.partial();
