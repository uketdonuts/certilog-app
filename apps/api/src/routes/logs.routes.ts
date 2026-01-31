import { Router } from 'express';
import { createLog, getLogs, getLogsForEntity } from '../controllers/logs.controller.js';
import { authenticateToken, optionalAuth, requireAdminOrDispatcher } from '../middleware/auth.js';

const router = Router();

// Public endpoint - anyone can send logs (even without auth)
router.post('/', optionalAuth, createLog);

// Protected endpoint - only admin/dispatcher can view logs
router.get('/', authenticateToken, requireAdminOrDispatcher, getLogs);

// Get logs for a specific user: /api/logs/users/:id
router.get('/users/:id', authenticateToken, requireAdminOrDispatcher, (req, res, next) => {
	// attach params: type=user
	req.params.type = 'user';
	next();
}, getLogsForEntity);

// Get logs for a specific customer: /api/logs/customers/:id
router.get('/customers/:id', authenticateToken, requireAdminOrDispatcher, (req, res, next) => {
	req.params.type = 'customer';
	next();
}, getLogsForEntity);

export default router;
