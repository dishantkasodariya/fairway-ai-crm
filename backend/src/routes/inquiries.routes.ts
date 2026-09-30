import { Router } from 'express';
import {
  getInquiries,
  getInquiriesDropdownActive,
  getInquiryById,
  createInquiry,
  createInquiryStepper,
  updateInquiry,
  deleteInquiry,
  getLostReasons,
  createLostReason,
  winInquiry,
  createTouch,
  getTouches,
} from '../controllers/inquiries.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.get('/lost-reasons', requirePermission('inquiries', 'view'), getLostReasons);
router.post('/lost-reasons', requirePermission('inquiries', 'edit'), createLostReason);
router.get('/dd/active', requirePermission('inquiries', 'view'), getInquiriesDropdownActive);
router.get('/', requirePermission('inquiries', 'view'), getInquiries);
router.post('/', requirePermission('inquiries', 'create'), createInquiry);
router.post('/stepper', requirePermission('inquiries', 'create'), createInquiryStepper);
router.get('/:id', requirePermission('inquiries', 'view'), getInquiryById);
router.put('/:id', requirePermission('inquiries', 'edit'), updateInquiry);
router.post('/:id/win', requirePermission('inquiries', 'edit'), winInquiry);
router.get('/:id/touches', requirePermission('inquiries', 'view'), getTouches);
router.post('/:id/touches', requirePermission('inquiries', 'edit'), createTouch);
router.delete('/:id', requirePermission('inquiries', 'delete'), deleteInquiry);

export default router;
