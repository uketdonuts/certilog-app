import { Router } from 'express';
import {
  listAttendance,
  getAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
} from '../controllers/absence.controller.js';
import { authenticateToken, requireAdminOrDispatcher } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireAdminOrDispatcher);

router.get('/', listAttendance);
router.get('/:id', getAttendance);
router.post('/', createAttendance);
router.put('/:id', updateAttendance);
router.delete('/:id', deleteAttendance);

export default router;
