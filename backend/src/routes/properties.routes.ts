import { Router } from 'express';
import {
  getProperties,
  getPropertiesDropdownActive,
  getCorridors,
  getIndustries,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
} from '../controllers/properties.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.get('/dd/active', requirePermission('properties', 'view'), getPropertiesDropdownActive);
router.get('/corridors', requirePermission('properties', 'view'), getCorridors);
router.get('/industries', requirePermission('properties', 'view'), getIndustries);
router.get('/', requirePermission('properties', 'view'), getProperties);
router.get('/:id', requirePermission('properties', 'view'), getPropertyById);
router.post('/', requirePermission('properties', 'create'), createProperty);
router.put('/:id', requirePermission('properties', 'edit'), updateProperty);
router.delete('/:id', requirePermission('properties', 'delete'), deleteProperty);

export default router;
