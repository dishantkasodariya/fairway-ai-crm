import { Router } from 'express';
import {
  getCommunications,
  createCommunication,
  getCommunicationStats,
  sendFollowUpEmail,
} from '../controllers/communications.controller.js';

const router = Router();

router.get('/stats', getCommunicationStats);
router.get('/', getCommunications);
router.post('/', createCommunication);
router.post('/send-followup-email', sendFollowUpEmail);

export default router;
