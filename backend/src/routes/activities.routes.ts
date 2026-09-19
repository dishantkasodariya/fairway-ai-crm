import { Router } from 'express';
import { getActivities, createActivity, deleteActivity } from '../controllers/activities.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.get('/', requirePermission('inquiries', 'view'), getActivities);
router.post('/', requirePermission('inquiries', 'create'), createActivity);
router.delete('/:id', requirePermission('inquiries', 'delete'), deleteActivity);

export default router;
