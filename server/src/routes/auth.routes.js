import { Router } from 'express';
import { signup, login, logout, getMe, refreshTokens } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refreshTokens);

// Protected routes
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getMe);

export default router;
