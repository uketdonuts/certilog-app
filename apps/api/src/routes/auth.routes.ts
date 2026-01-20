import { Router } from 'express';
import { login, loginWithPin, register, refreshToken, logout, me } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/login-pin', loginWithPin);
router.post('/register', authenticateToken, register);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', authenticateToken, me);

export default router;
