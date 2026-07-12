import { Router } from 'express';
import * as activityController from '../controllers/activity.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', activityController.getActivityLogs);
router.get('/:id', activityController.getActivityLogDetail);

export default router;
