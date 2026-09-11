import { Router } from 'express';
import { getDocuments, createDocument, deleteDocument } from '../controllers/documents.controller.js';

const router = Router();

router.get('/', getDocuments);
router.post('/', createDocument);
router.delete('/:id', deleteDocument);

export default router;
