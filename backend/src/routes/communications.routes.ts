import { Router } from 'express';
import {
  getCommunications,
  createCommunication,
  getCommunicationStats,
  sendFollowUpEmail,
} from '../controllers/communications.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.get('/stats', requirePermission('communications', 'view'), getCommunicationStats);
router.get('/', requirePermission('communications', 'view'), getCommunications);
router.post('/', requirePermission('communications', 'create'), createCommunication);
router.post('/send-followup-email', requirePermission('communications', 'edit'), sendFollowUpEmail);

export default router;
