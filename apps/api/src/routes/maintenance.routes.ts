import { Router } from 'express';
import { listFleetMaintenance, getFleetMaintenance, createFleetMaintenance, updateFleetMaintenance } from '../controllers/maintenance.controller.js';
import { authenticateToken, requireAdminOrDispatcher } from '../middleware/auth.js';


const router = Router();

router.use(authenticateToken);
router.use(requireAdminOrDispatcher);

router.get('/', listFleetMaintenance);
router.get('/:id', getFleetMaintenance);
router.post('/', createFleetMaintenance);
router.put('/:id', updateFleetMaintenance);

export default router;
