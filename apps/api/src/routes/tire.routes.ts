import { Router } from 'express';
import { listTireSemaphores, getTireSemaphore, createTireSemaphore, updateTireSemaphore, deleteTireSemaphore } from '../controllers/tire.controller.js';
import { authenticateToken, requireAdminOrDispatcher } from '../middleware/auth.js';


const router = Router();

router.use(authenticateToken);
router.use(requireAdminOrDispatcher);

router.get('/', listTireSemaphores);
router.get('/:id', getTireSemaphore);
router.post('/', createTireSemaphore);
router.put('/:id', updateTireSemaphore);
router.delete('/:id', deleteTireSemaphore);

export default router;
