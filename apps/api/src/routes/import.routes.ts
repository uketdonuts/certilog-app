import { Router } from 'express';
import { importDeliveriesFromExcel, getImportTemplate } from '../controllers/import.controller.js';
import { authenticateToken, requireAdminOrDispatcher } from '../middleware/auth.js';
import { uploadExcel } from '../middleware/upload.js';

const router = Router();

// All routes require authentication and ADMIN or DISPATCHER role
router.use(authenticateToken);
router.use(requireAdminOrDispatcher);

// Import deliveries from Excel file
router.post('/deliveries', uploadExcel, importDeliveriesFromExcel);

// Download Excel template
router.get('/template', getImportTemplate);

export default router;
