import { Router } from 'express';
import {
  getUsers,
  getUsersDropdownActive,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
} from '../controllers/user.controller.js';
import { authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/dd/active', getUsersDropdownActive);
router.get('/', getUsers);
router.post('/', authorizeRoles('super_admin', 'admin'), createUser);
router.put('/:id', authorizeRoles('super_admin', 'admin'), updateUser);
router.patch('/:id/status', authorizeRoles('super_admin', 'admin'), toggleUserStatus);
router.delete('/:id', authorizeRoles('super_admin', 'admin'), deleteUser);

export default router;
