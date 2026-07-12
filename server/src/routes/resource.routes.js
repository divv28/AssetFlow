import { Router } from 'express';
import { getResources, getResourceById, createResource, updateResource } from '../controllers/resource.controller.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getResources);
router.get('/:id', getResourceById);

// Creation and editing restricted to ADMIN and ASSET_MANAGER
router.post('/', authorizeRoles('ADMIN', 'ASSET_MANAGER'), createResource);
router.put('/:id', authorizeRoles('ADMIN', 'ASSET_MANAGER'), updateResource);

export default router;
