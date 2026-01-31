import { Router } from 'express';
import { listPreventives, createPreventive, updatePreventive } from '../controllers/preventive.controller.js';
import { authenticateToken, requireAdminOrDispatcher } from '../middleware/auth.js';


const router = Router();

router.use(authenticateToken);
router.use(requireAdminOrDispatcher);

router.get('/', listPreventives);
router.post('/', createPreventive);
router.put('/:id', updatePreventive);

export default router;
