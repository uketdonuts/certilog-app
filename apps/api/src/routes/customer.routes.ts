import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customer.controller.js';
import { authenticateToken, requireAdminOrDispatcher } from '../middleware/auth.js';

const router = Router();

// All routes require authentication and admin/dispatcher role
router.use(authenticateToken);
router.use(requireAdminOrDispatcher);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
