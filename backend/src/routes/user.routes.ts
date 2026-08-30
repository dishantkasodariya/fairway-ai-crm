import { Router } from 'express';
import {
  getUsers,
  getUsersDropdownActive,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
} from '../controllers/user.controller.js';

const router = Router();

router.get('/dd/active', getUsersDropdownActive);
router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/status', toggleUserStatus);
router.delete('/:id', deleteUser);

export default router;
