import { Router } from 'express';
import { getFacilities, createFacility, updateFacility, deleteFacility } from '../controllers/facilities.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.get('/', requirePermission('companies', 'view'), getFacilities);
router.post('/', requirePermission('companies', 'create'), createFacility);
router.put('/:id', requirePermission('companies', 'edit'), updateFacility);
router.delete('/:id', requirePermission('companies', 'delete'), deleteFacility);

export default router;
