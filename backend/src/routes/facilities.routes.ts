import { Router } from 'express';
import { getFacilities, createFacility, deleteFacility } from '../controllers/facilities.controller.js';

const router = Router();

router.get('/', getFacilities);
router.post('/', createFacility);
router.delete('/:id', deleteFacility);

export default router;
