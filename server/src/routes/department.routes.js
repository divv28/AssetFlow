import { Router } from 'express';
import { getDepartments, getDepartmentById, createDepartment, updateDepartment, updateDepartmentStatus } from '../controllers/department.controller.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// Secure all endpoints to ADMIN only
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN'));

router.get('/', getDepartments);
router.get('/:id', getDepartmentById);
router.post('/', createDepartment);
router.put('/:id', updateDepartment);
router.patch('/:id/status', updateDepartmentStatus);

export default router;
