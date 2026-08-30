import { Router } from 'express';
import {
  getInquiries,
  getInquiriesDropdownActive,
  getInquiryById,
  createInquiryStepper,
  updateInquiry,
  deleteInquiry,
} from '../controllers/inquiries.controller.js';

const router = Router();

router.get('/dd/active', getInquiriesDropdownActive);
router.get('/', getInquiries);
router.post('/stepper', createInquiryStepper);
router.get('/:id', getInquiryById);
router.put('/:id', updateInquiry);
router.delete('/:id', deleteInquiry);

export default router;
