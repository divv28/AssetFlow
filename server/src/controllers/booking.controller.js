import bookingService from '../services/booking.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { createBookingSchema, rescheduleBookingSchema } from '../validators/booking.validator.js';

export const getBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getBookings(req.query, req.user);
  return res.status(200).json(new ApiResponse(200, result.data, 'Bookings retrieved successfully', result.meta));
});

export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id, req.user);
  return res.status(200).json(new ApiResponse(200, booking, 'Booking details retrieved successfully'));
});

export const createBooking = asyncHandler(async (req, res) => {
  const validated = createBookingSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const booking = await bookingService.createBooking(validated.data, req.user);
  return res.status(201).json(new ApiResponse(201, booking, 'Booking created successfully'));
});

export const rescheduleBooking = asyncHandler(async (req, res) => {
  const validated = rescheduleBookingSchema.safeParse(req.body);
  if (!validated.success) {
    throw new ApiError(400, 'Validation Error', validated.error.errors);
  }

  const booking = await bookingService.rescheduleBooking(req.params.id, validated.data, req.user);
  return res.status(200).json(new ApiResponse(200, booking, 'Booking rescheduled successfully'));
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.cancelBooking(req.params.id, req.user);
  return res.status(200).json(new ApiResponse(200, booking, 'Booking cancelled successfully'));
});

export const deleteBooking = asyncHandler(async (req, res) => {
  const result = await bookingService.deleteBooking(req.params.id, req.user);
  return res.status(200).json(new ApiResponse(200, result, 'Booking deleted successfully'));
});
