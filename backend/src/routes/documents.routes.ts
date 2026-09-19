import { Router } from 'express';
import { getDocuments, createDocument, deleteDocument } from '../controllers/documents.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.get('/', requirePermission('inquiries', 'view'), getDocuments);
router.post('/', requirePermission('inquiries', 'create'), createDocument);
router.delete('/:id', requirePermission('inquiries', 'delete'), deleteDocument);

export default router;
