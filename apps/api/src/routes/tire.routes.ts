import { Router } from 'express';
import { listTireSemaphores, createTireSemaphore } from '../controllers/tire.controller.js';
import { authenticateToken, requireAdminOrDispatcher } from '../middleware/auth.js';


const router = Router();

router.use(authenticateToken);
router.use(requireAdminOrDispatcher);

router.get('/', listTireSemaphores);
router.post('/', createTireSemaphore);

export default router;
