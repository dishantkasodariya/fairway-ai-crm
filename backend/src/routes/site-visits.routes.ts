import { Router } from 'express';
import {
  getSiteVisits,
  getSiteVisitById,
  createSiteVisit,
  updateSiteVisit,
  deleteSiteVisit,
} from '../controllers/site-visits.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.get('/', requirePermission('tasks', 'view'), getSiteVisits);
router.get('/:id', requirePermission('tasks', 'view'), getSiteVisitById);
router.post('/', requirePermission('tasks', 'create'), createSiteVisit);
router.put('/:id', requirePermission('tasks', 'edit'), updateSiteVisit);
router.delete('/:id', requirePermission('tasks', 'delete'), deleteSiteVisit);

export default router;
