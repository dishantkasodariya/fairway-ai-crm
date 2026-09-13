import { Router } from 'express';
import {
  getRolePermissions,
  createRolePermission,
  updateRolePermission,
  deleteRolePermission,
  resetRolePermissions,
} from '../controllers/permissions.controller.js';
import { authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', getRolePermissions);
router.post('/', authorizeRoles('super_admin', 'admin'), createRolePermission);
router.put('/:id', authorizeRoles('super_admin', 'admin'), updateRolePermission);
router.delete('/:id', authorizeRoles('super_admin', 'admin'), deleteRolePermission);
router.post('/reset', authorizeRoles('super_admin', 'admin'), resetRolePermissions);

export default router;
