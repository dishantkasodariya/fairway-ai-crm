import { Router } from 'express';
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  enrollContacts,
  runBatch,
  markEnrollmentReplied,
  unsubscribeEnrollment,
  deleteEnrollment,
  handleInboundReplyWebhook,
} from '../controllers/outreach.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = Router();

// Public webhook for inbound replies from email services
router.post('/webhook/reply', handleInboundReplyWebhook);

// Protected routes (JWT required)
router.use(authenticateJWT);

router.get('/campaigns', listCampaigns);
router.post('/campaigns', createCampaign);
router.get('/campaigns/:id', getCampaign);
router.put('/campaigns/:id', updateCampaign);
router.delete('/campaigns/:id', deleteCampaign);
router.post('/campaigns/:id/enroll', enrollContacts);

router.post('/run-now', runBatch);

router.post('/enrollments/:id/mark-replied', markEnrollmentReplied);
router.post('/enrollments/:id/unsubscribe', unsubscribeEnrollment);
router.delete('/enrollments/:id', deleteEnrollment);

export default router;
