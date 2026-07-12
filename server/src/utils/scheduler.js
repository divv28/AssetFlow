import cron from 'node-cron';
import prisma from '../config/db.js';

export const initScheduler = () => {
  // Run once every 24 hours at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[Scheduler] Running daily overdue allocation checks...');
    try {
      const today = new Date();

      // Find ACTIVE allocations where expectedReturnDate is in the past
      // and whose status is not already OVERDUE
      const overdueAllocations = await prisma.allocation.findMany({
        where: {
          status: 'ACTIVE',
          expectedReturnDate: {
            lt: today,
          },
        },
        include: {
          asset: true,
          employee: true,
        },
      });

      for (const alloc of overdueAllocations) {
        await prisma.$transaction(async (tx) => {
          // 1. Flip status to OVERDUE
          await tx.allocation.update({
            where: { id: alloc.id },
            data: { status: 'OVERDUE' },
          });

          // 2. Log event
          await tx.allocationEvent.create({
            data: {
              assetId: alloc.assetId,
              allocationId: alloc.id,
              eventType: 'OVERDUE_FLAGGED',
              actorId: alloc.allocatedById, // flag on behalf of allocator
              metadata: {
                expectedReturnDate: alloc.expectedReturnDate,
                employeeName: alloc.employee.name,
              },
            },
          });

          // 3. Notify employee
          await tx.notification.create({
            data: {
              userId: alloc.employeeId,
              type: 'OVERDUE_RETURN',
              message: `Your allocation for asset ${alloc.asset.name} (${alloc.asset.assetTag}) was expected back on ${new Date(alloc.expectedReturnDate).toLocaleDateString()} and is now marked OVERDUE.`,
              relatedEntityId: alloc.id,
            },
          });

          // 4. Notify allocator
          await tx.notification.create({
            data: {
              userId: alloc.allocatedById,
              type: 'OVERDUE_RETURN',
              message: `Asset ${alloc.asset.name} (${alloc.asset.assetTag}) allocated to ${alloc.employee.name} is now overdue.`,
              relatedEntityId: alloc.id,
            },
          });
        });

        console.log(`[Scheduler] Flagged allocation ${alloc.id} as OVERDUE successfully.`);
      }
    } catch (error) {
      console.error('[Scheduler] Error during overdue checks:', error);
    }
  });

  // Run once every 5 minutes to check for upcoming booking reminders
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Scheduler] Running booking reminder checks...');
    try {
      const now = new Date();
      const in35Mins = new Date(now.getTime() + 35 * 60 * 1000);

      // Find UPCOMING bookings starting within the next 35 minutes that haven't been reminded yet
      const upcomingBookings = await prisma.booking.findMany({
        where: {
          status: 'UPCOMING',
          reminderSent: false,
          startDateTime: {
            gte: now,
            lte: in35Mins,
          },
        },
        include: {
          resource: true,
        },
      });

      for (const booking of upcomingBookings) {
        await prisma.$transaction(async (tx) => {
          // 1. Mark as sent
          await tx.booking.update({
            where: { id: booking.id },
            data: { reminderSent: true },
          });

          // 2. Create Notification
          await tx.notification.create({
            data: {
              userId: booking.employeeId,
              type: 'BOOKING_REMINDER',
              message: `Booking Reminder: "${booking.title}" for resource ${booking.resource.name} is starting soon at ${new Date(booking.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
              relatedEntityId: booking.id,
            },
          });
        });
        console.log(`[Scheduler] Sent booking reminder for booking: ${booking.title}`);
      }
    } catch (error) {
      console.error('[Scheduler] Error during booking reminder checks:', error);
    }
  });

  console.log('[Scheduler] Daily overdue checker and booking reminder cron initialized.');
};
