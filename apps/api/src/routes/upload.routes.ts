import { Router } from 'express';
import { uploadPhoto, uploadSignature, uploadVideo, uploadAttendanceAttachment } from '../controllers/upload.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadSingle, uploadVideoSingle } from '../middleware/upload.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/photo', uploadSingle, uploadPhoto);
router.post('/signature', uploadSingle, uploadSignature);
router.post('/video', uploadVideoSingle, uploadVideo);
router.post('/attendance', uploadSingle, uploadAttendanceAttachment);

export default router;
