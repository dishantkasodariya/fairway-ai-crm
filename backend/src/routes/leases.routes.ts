import { Router } from 'express';
import { getLeases, getLeaseById, createLease, updateLease, deleteLease } from '../controllers/leases.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.get('/', requirePermission('properties', 'view'), getLeases);
router.get('/:id', requirePermission('properties', 'view'), getLeaseById);
router.post('/', requirePermission('properties', 'edit'), createLease);
router.put('/:id', requirePermission('properties', 'edit'), updateLease);
router.delete('/:id', requirePermission('properties', 'delete'), deleteLease);

export default router;
