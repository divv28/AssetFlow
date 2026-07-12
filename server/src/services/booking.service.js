import prisma from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { logAction } from '../utils/auditLogger.js';

class BookingService {
  /**
   * Fetch all bookings with search/filters/scoping
   */
  async getBookings(query, user) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'startDateTime';
    const order = query.order || 'asc';

    const where = {};

    // Role-based Access Scoping
    if (user.role === 'EMPLOYEE') {
      // Employee only sees their own bookings
      where.employeeId = user.uuid;
    } else if (user.role === 'DEPARTMENT_HEAD') {
      // Dept Head sees department bookings or their own
      where.OR = [
        { departmentId: user.departmentId || '' },
        { employeeId: user.uuid }
      ];
    }

    // Optional filters
    if (query.resourceId) where.resourceId = query.resourceId;
    if (query.status) where.status = query.status;
    if (query.departmentId && user.role !== 'EMPLOYEE') {
      where.departmentId = query.departmentId;
    }
    if (query.employeeId && user.role !== 'EMPLOYEE') {
      where.employeeId = query.employeeId;
    }

    const start = query.startDate ? new Date(query.startDate) : null;
    const end = query.endDate ? new Date(query.endDate) : null;
    if (start || end) {
      where.startDateTime = {};
      if (start) where.startDateTime.gte = start;
      if (end) where.startDateTime.lte = end;
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        ...(where.OR || []),
        { title: { contains: search, mode: 'insensitive' } },
        { purpose: { contains: search, mode: 'insensitive' } },
        { resource: { name: { contains: search, mode: 'insensitive' } } },
        { employee: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [bookings, totalCount] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          resource: { select: { id: true, name: true, category: true, location: true } },
          employee: { select: { uuid: true, name: true, email: true } },
          department: { select: { id: true, name: true, code: true } },
          creator: { select: { uuid: true, name: true } },
        },
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: bookings,
      meta: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    };
  }

  /**
   * Fetch single booking by ID
   */
  async getBookingById(id, user) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        resource: true,
        employee: { select: { uuid: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
        creator: { select: { uuid: true, name: true } },
      },
    });

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    // Auth Scope
    if (user.role === 'EMPLOYEE' && booking.employeeId !== user.uuid) {
      throw new ApiError(403, 'Access Denied: You can only view your own bookings');
    }

    return booking;
  }

  /**
   * Scan upcoming bookings and find the next available slot for a given duration
   */
  async getNextAvailableSlot(resourceId, requestedStart, requestedEnd) {
    const duration = requestedEnd.getTime() - requestedStart.getTime();
    let candidateStart = new Date(Math.max(requestedStart.getTime(), Date.now()));

    const bookings = await prisma.booking.findMany({
      where: {
        resourceId,
        status: { in: ['UPCOMING', 'ONGOING'] },
        endDateTime: { gt: candidateStart },
      },
      orderBy: { startDateTime: 'asc' },
    });

    let overlapFound = true;
    while (overlapFound) {
      overlapFound = false;
      for (const b of bookings) {
        const bStart = new Date(b.startDateTime).getTime();
        const bEnd = new Date(b.endDateTime).getTime();
        const candStart = candidateStart.getTime();
        const candEnd = candStart + duration;

        // Overlap: candStart < bEnd AND candEnd > bStart
        if (candStart < bEnd && candEnd > bStart) {
          candidateStart = new Date(bEnd);
          overlapFound = true;
          break; // restart validation from the new candidate start time
        }
      }
    }

    return {
      startDateTime: candidateStart,
      endDateTime: new Date(candidateStart.getTime() + duration),
    };
  }

  /**
   * Create booking with strict conflict validation
   */
  async createBooking(data, actor) {
    const resource = await prisma.resource.findUnique({
      where: { id: data.resourceId },
    });

    if (!resource) {
      throw new ApiError(404, 'Resource not found');
    }

    if (!resource.bookable) {
      throw new ApiError(400, 'This resource is not marked as bookable');
    }

    if (['INACTIVE', 'RETIRED', 'DISPOSED'].includes(resource.status)) {
      throw new ApiError(400, `Cannot book resource in ${resource.status} state`);
    }

    const start = new Date(data.startDateTime);
    const end = new Date(data.endDateTime);

    // Overlap validation
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        resourceId: data.resourceId,
        status: { in: ['UPCOMING', 'ONGOING'] },
        startDateTime: { lt: end },
        endDateTime: { gt: start },
      },
      include: {
        employee: { select: { name: true } }
      }
    });

    if (conflictingBooking) {
      const suggested = await this.getNextAvailableSlot(data.resourceId, start, end);
      const conflictMeta = {
        title: conflictingBooking.title,
        bookedBy: conflictingBooking.employee.name,
        timeSlot: `${new Date(conflictingBooking.startDateTime).toLocaleString()} - ${new Date(conflictingBooking.endDateTime).toLocaleString()}`,
        suggestedSlot: `${suggested.startDateTime.toLocaleString()} - ${suggested.endDateTime.toLocaleString()}`,
        suggestedStart: suggested.startDateTime.toISOString(),
        suggestedEnd: suggested.endDateTime.toISOString(),
      };
      throw new ApiError(409, 'This resource is already booked.', [conflictMeta]);
    }

    const booking = await prisma.booking.create({
      data: {
        resourceId: data.resourceId,
        employeeId: data.employeeId,
        departmentId: data.departmentId,
        title: data.title,
        purpose: data.purpose,
        startDateTime: start,
        endDateTime: end,
        status: 'UPCOMING',
        notes: data.notes || null,
        createdBy: actor.uuid,
      },
      include: {
        resource: true,
      }
    });

    // Notify employee of booking created
    await prisma.notification.create({
      data: {
        userId: data.employeeId,
        type: 'BOOKING_CREATED',
        message: `Resource Booking Created: "${booking.title}" for ${booking.resource.name} starts at ${start.toLocaleString()}`,
        relatedEntityId: booking.id,
      },
    });

    // Log Action
    await logAction({
      actorId: actor.uuid,
      action: 'BOOKING_CREATED',
      entityType: 'Booking',
      entityId: booking.id,
      metadata: { title: booking.title, resource: booking.resource.name },
    });

    return booking;
  }

  /**
   * Reschedule or modify booking details
   */
  async rescheduleBooking(id, data, actor) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { resource: true },
    });

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    // Scope check: only the employee, creator, admin, or manager can reschedule
    const isAuthorized = actor.role === 'ADMIN' || actor.role === 'ASSET_MANAGER' || booking.employeeId === actor.uuid || booking.createdBy === actor.uuid;
    if (!isAuthorized) {
      throw new ApiError(403, 'Access Denied: You cannot reschedule this booking');
    }

    const start = new Date(data.startDateTime);
    const end = new Date(data.endDateTime);

    // Overlap validation (excluding this booking itself)
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        id: { not: booking.id },
        resourceId: booking.resourceId,
        status: { in: ['UPCOMING', 'ONGOING'] },
        startDateTime: { lt: end },
        endDateTime: { gt: start },
      },
      include: {
        employee: { select: { name: true } }
      }
    });

    if (conflictingBooking) {
      const suggested = await this.getNextAvailableSlot(booking.resourceId, start, end);
      const conflictMeta = {
        title: conflictingBooking.title,
        bookedBy: conflictingBooking.employee.name,
        timeSlot: `${new Date(conflictingBooking.startDateTime).toLocaleString()} - ${new Date(conflictingBooking.endDateTime).toLocaleString()}`,
        suggestedSlot: `${suggested.startDateTime.toLocaleString()} - ${suggested.endDateTime.toLocaleString()}`,
        suggestedStart: suggested.startDateTime.toISOString(),
        suggestedEnd: suggested.endDateTime.toISOString(),
      };
      throw new ApiError(409, 'This resource is already booked.', [conflictMeta]);
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        startDateTime: start,
        endDateTime: end,
        notes: data.notes !== undefined ? data.notes : booking.notes,
        reminderSent: false, // reset reminder status so they get notified again
      },
    });

    // Notify employee
    await prisma.notification.create({
      data: {
        userId: booking.employeeId,
        type: 'BOOKING_UPDATED',
        message: `Resource Booking Rescheduled: "${booking.title}" for ${booking.resource.name} is now ${start.toLocaleString()} - ${end.toLocaleString()}`,
        relatedEntityId: booking.id,
      },
    });

    // Log Action
    await logAction({
      actorId: actor.uuid,
      action: 'BOOKING_RESCHEDULED',
      entityType: 'Booking',
      entityId: booking.id,
      metadata: { before: booking, after: updated },
    });

    return updated;
  }

  /**
   * Cancel booking
   */
  async cancelBooking(id, actor) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { resource: true },
    });

    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    const isAuthorized = actor.role === 'ADMIN' || actor.role === 'ASSET_MANAGER' || booking.employeeId === actor.uuid || booking.createdBy === actor.uuid;
    if (!isAuthorized) {
      throw new ApiError(403, 'Access Denied: You cannot cancel this booking');
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Notify employee
    await prisma.notification.create({
      data: {
        userId: booking.employeeId,
        type: 'BOOKING_CANCELLED',
        message: `Resource Booking CANCELLED: "${booking.title}" for ${booking.resource.name}`,
        relatedEntityId: booking.id,
      },
    });

    // Log Action
    await logAction({
      actorId: actor.uuid,
      action: 'BOOKING_CANCELLED',
      entityType: 'Booking',
      entityId: booking.id,
      metadata: { title: booking.title },
    });

    return updated;
  }

  /**
   * Delete Booking
   */
  async deleteBooking(id, actor) {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new ApiError(404, 'Booking not found');
    }

    if (actor.role !== 'ADMIN' && actor.role !== 'ASSET_MANAGER') {
      throw new ApiError(403, 'Access Denied: Only Admins or Asset Managers can delete booking logs');
    }

    await prisma.booking.delete({ where: { id } });

    // Log Action
    await logAction({
      actorId: actor.uuid,
      action: 'BOOKING_DELETED',
      entityType: 'Booking',
      entityId: id,
      metadata: { title: booking.title },
    });

    return { id };
  }
}

export default new BookingService();
