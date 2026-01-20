import { Router } from 'express';
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateFcmToken,
  getCouriers,
} from '../controllers/user.controller.js';
import { authenticateToken, requireAdmin, requireAdminOrDispatcher } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Admin only routes
router.get('/', requireAdminOrDispatcher, getUsers);
router.delete('/:id', requireAdmin, deleteUser);

// Admin or self
router.get('/couriers', requireAdminOrDispatcher, getCouriers);
router.get('/:id', getUserById);
router.put('/:id', requireAdmin, updateUser);
router.put('/:id/fcm-token', updateFcmToken);

export default router;
