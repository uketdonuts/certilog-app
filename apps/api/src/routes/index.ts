import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import customerRoutes from './customer.routes.js';
import deliveryRoutes from './delivery.routes.js';
import locationRoutes from './location.routes.js';
import uploadRoutes from './upload.routes.js';
import logsRoutes from './logs.routes.js';
import importRoutes from './import.routes.js';
import trackingRoutes from './tracking.routes.js';
import vehicleRoutes from './vehicle.routes.js';
import gasRoutes from './gas.routes.js';
import attendanceRoutes from './absence.routes.js';
import maintenanceRoutes from './maintenance.routes.js';
import preventiveRoutes from './preventive.routes.js';
import repairRoutes from './repair.routes.js';
import tireRoutes from './tire.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/locations', locationRoutes);
router.use('/upload', uploadRoutes);
router.use('/logs', logsRoutes);
router.use('/import', importRoutes);
// Public tracking routes (no authentication)
router.use('/track', trackingRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/gas', gasRoutes);
router.use('/attendance', attendanceRoutes);
// Backward compatibility alias
router.use('/absences', attendanceRoutes);
router.use('/fleet-maintenance', maintenanceRoutes);
router.use('/preventive', preventiveRoutes);
router.use('/repairs', repairRoutes);
router.use('/tire-semaphore', tireRoutes);

// Health check
router.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
