import { Router } from 'express';
import {
  getCalls,
  getCallStats,
  getCallById,
  createCall,
  updateCall,
  deleteCall,
} from '../controllers/calls.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.get('/stats', requirePermission('communications', 'view'), getCallStats);
router.get('/', requirePermission('communications', 'view'), getCalls);
router.get('/:id', requirePermission('communications', 'view'), getCallById);
router.post('/', requirePermission('communications', 'create'), createCall);
router.put('/:id', requirePermission('communications', 'edit'), updateCall);
router.delete('/:id', requirePermission('communications', 'delete'), deleteCall);

export default router;
