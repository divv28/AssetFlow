import { Router } from 'express';
import { getCategories, getCategoryById, createCategory, updateCategory, updateCategoryStatus } from '../controllers/category.controller.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// Secure all endpoints to ADMIN only
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN'));

router.get('/', getCategories);
router.get('/:id', getCategoryById);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.patch('/:id/status', updateCategoryStatus);

export default router;
