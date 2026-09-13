import { Router } from 'express';
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissionsForRole,
  updatePermissionsForRole,
} from '../controllers/role.controller.js';
import { authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', getRoles);
router.post('/', authorizeRoles('super_admin', 'admin'), createRole);
router.put('/:id', authorizeRoles('super_admin', 'admin'), updateRole);
router.delete('/:id', authorizeRoles('super_admin', 'admin'), deleteRole);
router.get('/:roleKey/permissions', getRolePermissionsForRole);
router.put('/:roleKey/permissions', authorizeRoles('super_admin', 'admin'), updatePermissionsForRole);

export default router;
