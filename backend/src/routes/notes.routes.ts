import { Router } from 'express';
import { getNotes, createNote, deleteNote } from '../controllers/notes.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.get('/', requirePermission('inquiries', 'view'), getNotes);
router.post('/', requirePermission('inquiries', 'create'), createNote);
router.delete('/:id', requirePermission('inquiries', 'delete'), deleteNote);

export default router;
