import { Router } from 'express';
import {
  getDeliveries,
  getMyDeliveries,
  getDeliveryById,
  getDeliveryRoute,
  createDelivery,
  updateDelivery,
  assignDelivery,
  startDelivery,
  completeDelivery,
  deleteDelivery,
  syncDeliveries,
  getDeliveryStats,
} from '../controllers/delivery.controller.js';
import { authenticateToken, requireAdminOrDispatcher, requireCourier } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Courier-specific routes
router.get('/my', requireCourier, getMyDeliveries);
router.post('/sync', requireCourier, syncDeliveries);

// Admin/Dispatcher routes
router.get('/stats', requireAdminOrDispatcher, getDeliveryStats);
router.get('/', requireAdminOrDispatcher, getDeliveries);
router.post('/', requireAdminOrDispatcher, createDelivery);
router.put('/:id/assign', requireAdminOrDispatcher, assignDelivery);
router.put('/:id', requireAdminOrDispatcher, updateDelivery);
router.delete('/:id', requireAdminOrDispatcher, deleteDelivery);

// Both can access
router.get('/:id/route', getDeliveryRoute);
router.get('/:id', getDeliveryById);
router.put('/:id/start', startDelivery);
router.put('/:id/complete', completeDelivery);

export default router;
