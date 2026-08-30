import { Router } from 'express';
import {
  getProperties,
  getPropertiesDropdownActive,
  getCorridors,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
} from '../controllers/properties.controller.js';

const router = Router();

router.get('/dd/active', getPropertiesDropdownActive);
router.get('/corridors', getCorridors);
router.get('/', getProperties);
router.get('/:id', getPropertyById);
router.post('/', createProperty);
router.put('/:id', updateProperty);
router.delete('/:id', deleteProperty);

export default router;
