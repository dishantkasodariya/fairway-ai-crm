import { Router } from 'express';
import {
  register,
  login,
  getMe,
  getUsers,
  updateProfile,
  changePassword,
} from '../controllers/auth.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/signup', register);
router.post('/login', login);

// Protected routes
router.get('/me', authenticateJWT, getMe);
router.get('/users', authenticateJWT, getUsers);
router.put('/profile', authenticateJWT, updateProfile);
router.put('/change-password', authenticateJWT, changePassword);

export default router;
