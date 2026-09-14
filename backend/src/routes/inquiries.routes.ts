import { Router } from 'express';
import {
  getInquiries,
  getInquiriesDropdownActive,
  getInquiryById,
  createInquiry,
  createInquiryStepper,
  updateInquiry,
  deleteInquiry,
} from '../controllers/inquiries.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.get('/dd/active', requirePermission('inquiries', 'view'), getInquiriesDropdownActive);
router.get('/', requirePermission('inquiries', 'view'), getInquiries);
router.post('/', requirePermission('inquiries', 'create'), createInquiry);
router.post('/stepper', requirePermission('inquiries', 'create'), createInquiryStepper);
router.get('/:id', requirePermission('inquiries', 'view'), getInquiryById);
router.put('/:id', requirePermission('inquiries', 'edit'), updateInquiry);
router.delete('/:id', requirePermission('inquiries', 'delete'), deleteInquiry);

export default router;
