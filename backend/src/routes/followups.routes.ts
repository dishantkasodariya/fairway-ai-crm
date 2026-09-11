import { Router } from 'express';
import {
  getFollowUps,
  createFollowUp,
  updateFollowUp,
  downloadFollowUpPdf,
} from '../controllers/followups.controller.js';

const router = Router();

router.get('/', getFollowUps);
router.post('/', createFollowUp);
router.put('/:id', updateFollowUp);
router.get('/:id/download-pdf', downloadFollowUpPdf);

export default router;
