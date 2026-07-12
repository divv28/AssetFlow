import { z } from 'zod';

const bookingStatusSchema = z.enum(['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED']);

export const createBookingSchema = z.object({
  resourceId: z.string().uuid('Invalid Resource selection'),
  employeeId: z.string().uuid('Invalid Employee selection'),
  departmentId: z.string().uuid('Invalid Department selection'),
  title: z.string().trim().min(2, 'Title must be at least 2 characters long').max(100),
  purpose: z.string().trim().min(2, 'Purpose must be at least 2 characters long').max(1000),
  startDateTime: z.string().datetime({ message: 'Invalid start date/time format' }),
  endDateTime: z.string().datetime({ message: 'Invalid end date/time format' }),
  notes: z.string().trim().max(1000).nullable().optional().or(z.literal('')),
  status: bookingStatusSchema.default('UPCOMING'),
}).refine(data => {
  const start = new Date(data.startDateTime);
  const end = new Date(data.endDateTime);
  return end > start;
}, {
  message: 'End date/time must be strictly after start date/time',
  path: ['endDateTime'],
});

export const rescheduleBookingSchema = z.object({
  startDateTime: z.string().datetime({ message: 'Invalid start date/time format' }),
  endDateTime: z.string().datetime({ message: 'Invalid end date/time format' }),
  notes: z.string().trim().max(1000).nullable().optional().or(z.literal('')),
}).refine(data => {
  const start = new Date(data.startDateTime);
  const end = new Date(data.endDateTime);
  return end > start;
}, {
  message: 'End date/time must be strictly after start date/time',
  path: ['endDateTime'],
});

export const updateBookingStatusSchema = z.object({
  status: bookingStatusSchema,
});
