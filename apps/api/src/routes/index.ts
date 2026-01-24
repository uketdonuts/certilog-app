import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import customerRoutes from './customer.routes.js';
import deliveryRoutes from './delivery.routes.js';
import locationRoutes from './location.routes.js';
import uploadRoutes from './upload.routes.js';
import logsRoutes from './logs.routes.js';
import importRoutes from './import.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/locations', locationRoutes);
router.use('/upload', uploadRoutes);
router.use('/logs', logsRoutes);
router.use('/import', importRoutes);

// Health check
router.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
