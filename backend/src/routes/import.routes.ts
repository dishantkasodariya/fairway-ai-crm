import { Router } from 'express';
import { bulkImportInquiries } from '../controllers/import.controller.js';

const router = Router();

router.post('/inquiries', bulkImportInquiries);

export default router;
