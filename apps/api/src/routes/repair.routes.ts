import { Router } from 'express';
import { listRepairs, createRepair, updateRepair, deleteRepair } from '../controllers/repair.controller.js';
import { authenticateToken, requireAdminOrDispatcher } from '../middleware/auth.js';


const router = Router();

router.use(authenticateToken);
router.use(requireAdminOrDispatcher);

router.get('/', listRepairs);
router.post('/', createRepair);
router.put('/:id', updateRepair);
router.delete('/:id', deleteRepair);

export default router;
