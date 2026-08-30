import { Router } from 'express';
import {
  getRolePermissions,
  updateRolePermission,
  resetRolePermissions,
} from '../controllers/permissions.controller.js';

const router = Router();

router.get('/', getRolePermissions);
router.put('/:id', updateRolePermission);
router.post('/reset', resetRolePermissions);

export default router;
