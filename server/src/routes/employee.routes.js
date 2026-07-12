import { Router } from 'express';
import { getEmployees, getEmployeeById, updateEmployeeRole, updateEmployeeDepartment, updateEmployeeStatus, getDashboardStats } from '../controllers/employee.controller.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// Secure all endpoints to ADMIN only
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN'));

router.get('/dashboard-stats', getDashboardStats);
router.get('/', getEmployees);
router.get('/:id', getEmployeeById);
router.patch('/:id/role', updateEmployeeRole);
router.patch('/:id/department', updateEmployeeDepartment);
router.patch('/:id/status', updateEmployeeStatus);

export default router;
