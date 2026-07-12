import { Router } from 'express';
import * as auditController from '../controllers/audit.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

// Audit cycles operations
router.get('/', auditController.listAuditCycles);
router.post('/', auditController.createAudit);
router.get('/:id', auditController.getAuditCycleDetails);
router.post('/:id/assign', auditController.assignAuditorsToCycle);
router.post('/:id/close', auditController.closeAudit);

// Audit items operations
router.get('/:id/items', auditController.getItemsForCycle);
router.patch('/items/:id', auditController.updateAuditVerificationItem);

// Discrepancy reports operations
router.get('/:id/report', auditController.getDiscrepancyAuditReport);

export default router;
