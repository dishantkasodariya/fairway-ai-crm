import { Router } from 'express';
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissionsForRole,
  updatePermissionsForRole,
} from '../controllers/role.controller.js';

const router = Router();

router.get('/', getRoles);
router.post('/', createRole);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);
router.get('/:roleKey/permissions', getRolePermissionsForRole);
router.put('/:roleKey/permissions', updatePermissionsForRole);

export default router;
