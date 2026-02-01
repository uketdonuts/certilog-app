import { Router } from 'express';
import { listPreventives, getPreventive, createPreventive, updatePreventive, deletePreventive } from '../controllers/preventive.controller.js';
import { authenticateToken, requireAdminOrDispatcher } from '../middleware/auth.js';


const router = Router();

router.use(authenticateToken);
router.use(requireAdminOrDispatcher);

router.get('/', listPreventives);
router.get('/:id', getPreventive);
router.post('/', createPreventive);
router.put('/:id', updatePreventive);
router.delete('/:id', deletePreventive);

export default router;
