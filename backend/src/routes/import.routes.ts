import { Router } from 'express';
import { bulkImportInquiries } from '../controllers/import.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.post('/inquiries', requirePermission('inquiries', 'import'), bulkImportInquiries);

export default router;
