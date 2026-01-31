import { Router } from 'express';
import {
  getPublicTracking,
  getPublicCourierLocation,
  getPublicRoutePoints,
} from '../controllers/tracking.controller.js';

const router = Router();

// Public routes - no authentication required
router.get('/:token', getPublicTracking);
router.get('/:token/location', getPublicCourierLocation);
router.get('/:token/route', getPublicRoutePoints);

export default router;
