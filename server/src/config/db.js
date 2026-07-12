import { PrismaClient } from '@prisma/client';
import { contextStore } from '../utils/contextStore.js';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// List of models to log mutations for
const LOGGED_MODELS = [
  'User',
  'Asset',
  'Allocation',
  'TransferRequest',
  'ReturnRequest',
  'Booking',
  'MaintenanceRequest',
  'Department',
  'AuditCycle',
  'AuditAssignment',
  'AuditItem'
];

prisma.$use(async (params, next) => {
  // Real-time socket notify interceptor
  if (params.model === 'Notification' && params.action === 'create') {
    const result = await next(params);
    try {
      const { sendRealtimeNotification } = await import('./socket.js');
      sendRealtimeNotification(result.userId, result);
    } catch (socketErr) {
      console.error('[Prisma Middleware] Real-time socket dispatch failed:', socketErr);
    }
    return result;
  }

  // 1. Exclude logs themselves and non-mutation actions
  const isLoggedModel = LOGGED_MODELS.includes(params.model);
  const isMutation = ['create', 'update', 'delete', 'updateMany', 'deleteMany', 'upsert'].includes(params.action);

  if (!isLoggedModel || !isMutation) {
    return next(params);
  }

  // 2. Fetch old value if update/delete
  let oldValue = null;
  try {
    if (['update', 'delete', 'upsert'].includes(params.action) && params.args?.where) {
      // Find the existing record before change
      oldValue = await prisma[params.model.charAt(0).toLowerCase() + params.model.slice(1)].findUnique({
        where: params.args.where,
      });
    }
  } catch (err) {
    console.error('[Prisma Middleware] Error fetching old value:', err.message);
  }

  // 3. Execute database operation
  const result = await next(params);

  // 4. Async logging to not block main thread
  setImmediate(async () => {
    try {
      const store = contextStore.getStore();
      
      // Determine user and metadata
      const userId = store?.user?.uuid || null;
      const ipAddress = store?.ipAddress || '127.0.0.1';
      const browser = store?.browser || 'Unknown';

      // Capture new value
      let newValue = null;
      if (['create', 'update', 'upsert'].includes(params.action)) {
        newValue = result;
      }

      // Map action label
      let actionLabel = params.action.toUpperCase();
      if (params.model === 'User' && params.action === 'update') {
        // Check if role changed
        if (oldValue && newValue && oldValue.role !== newValue.role) {
          actionLabel = 'ROLE_CHANGED';
        } else {
          actionLabel = 'EMPLOYEE_UPDATED';
        }
      } else if (params.model === 'User' && params.action === 'create') {
        actionLabel = 'EMPLOYEE_CREATED';
      } else {
        actionLabel = `${params.model.toUpperCase()}_${params.action.toUpperCase()}`;
      }

      // Ignore logging logs to prevent infinite recursion
      await prisma.activityLog.create({
        data: {
          userId,
          action: actionLabel,
          module: params.model,
          entityId: result?.id || result?.uuid || null,
          entityType: params.model,
          oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
          newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
          ipAddress,
          browser,
        },
      });
    } catch (logErr) {
      console.error('[Prisma Middleware] Automated logging failed:', logErr);
    }
  });

  return result;
});

export default prisma;
