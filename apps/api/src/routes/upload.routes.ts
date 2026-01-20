import { Router } from 'express';
import { uploadPhoto, uploadSignature } from '../controllers/upload.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/photo', uploadSingle, uploadPhoto);
router.post('/signature', uploadSingle, uploadSignature);

export default router;
