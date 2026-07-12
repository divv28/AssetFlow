import { Router } from 'express';
import { 
  getRequests, 
  getRequestById, 
  createRequest, 
  approveRequest, 
  rejectRequest, 
  assignTechnician, 
  resolveRequest, 
  updateRequestStatus,
  startRequest
} from '../controllers/maintenance.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getRequests);
router.get('/:id', getRequestById);
router.post('/', createRequest);
router.patch('/:id', updateRequestStatus);
router.patch('/:id/approve', approveRequest);
router.patch('/:id/reject', rejectRequest);
router.patch('/:id/assign-technician', assignTechnician);
router.patch('/:id/resolve', resolveRequest);
router.patch('/:id/start', startRequest);

export default router;
