import { Router } from 'express';
import { listGasReports, getGasReport, createGasReport, deleteGasReport } from '../controllers/gas.controller.js';
import { authenticateToken, requireAdminOrDispatcher } from '../middleware/auth.js';


const router = Router();

router.use(authenticateToken);
router.use(requireAdminOrDispatcher);

router.get('/', listGasReports);
router.get('/:id', getGasReport);
router.post('/', createGasReport);
router.delete('/:id', deleteGasReport);

export default router;
