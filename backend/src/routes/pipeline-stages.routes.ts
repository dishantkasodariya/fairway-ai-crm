import { Router } from 'express';
import {
  getPipelineStages,
  createPipelineStage,
  updatePipelineStage,
} from '../controllers/pipeline-stages.controller.js';
import { authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', getPipelineStages);
router.post('/', authorizeRoles('super_admin', 'admin'), createPipelineStage);
router.put('/:id', authorizeRoles('super_admin', 'admin'), updatePipelineStage);

export default router;
