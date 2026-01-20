import { Router } from 'express';
import {
  addLocationBatch,
  getCouriersLocations,
  getCourierLocationHistory,
} from '../controllers/location.controller.js';
import { authenticateToken, requireAdminOrDispatcher, requireCourier } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Courier sends location
router.post('/batch', requireCourier, addLocationBatch);

// Admin/Dispatcher view locations
router.get('/couriers', requireAdminOrDispatcher, getCouriersLocations);
router.get('/courier/:id/history', requireAdminOrDispatcher, getCourierLocationHistory);

export default router;
