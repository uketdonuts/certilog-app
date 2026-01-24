import { Router } from 'express';
import { createLog, getLogs } from '../controllers/logs.controller.js';
import { authenticateToken, optionalAuth, requireAdminOrDispatcher } from '../middleware/auth.js';

const router = Router();

// Public endpoint - anyone can send logs (even without auth)
router.post('/', optionalAuth, createLog);

// Protected endpoint - only admin/dispatcher can view logs
router.get('/', authenticateToken, requireAdminOrDispatcher, getLogs);

export default router;
