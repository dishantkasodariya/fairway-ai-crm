import { Router } from 'express';
import {
  getFollowUps,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  downloadFollowUpPdf,
} from '../controllers/followups.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.get('/', requirePermission('tasks', 'view'), getFollowUps);
router.post('/', requirePermission('tasks', 'create'), createFollowUp);
router.put('/:id', requirePermission('tasks', 'edit'), updateFollowUp);
router.delete('/:id', requirePermission('tasks', 'delete'), deleteFollowUp);
router.get('/:id/download-pdf', requirePermission('tasks', 'export'), downloadFollowUpPdf);

export default router;
