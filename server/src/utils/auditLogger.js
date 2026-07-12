import prisma from '../config/db.js';

/**
 * Audit Logger helper utility.
 * Writes a structured entry to the database audit log.
 * 
 * @param {Object} logData
 * @param {string} logData.actorId - The UUID of the User performing the action.
 * @param {string} logData.action - Action string descriptor (e.g. "DEPARTMENT_CREATED").
 * @param {string} logData.entityType - The entity type (e.g. "Department", "Category", "User").
 * @param {string} logData.entityId - The primary key UUID/identifier of the target entity.
 * @param {Object} logData.metadata - JSON object representing before/after or detail logs.
 * @param {Object} [tx] - Optional Prisma transactional client if run inside a transaction.
 */
export const logAction = async ({ actorId, action, entityType, entityId, metadata }, tx = null) => {
  const client = tx || prisma;
  
  try {
    return await client.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId: String(entityId),
        metadata: metadata || {},
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Do not throw to prevent breaking the main transaction, unless desired
  }
};
