import { Router } from 'express';
import { getContacts, createContact, updateContact, deleteContact } from '../controllers/contacts.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.get('/', requirePermission('companies', 'view'), getContacts);
router.post('/', requirePermission('companies', 'create'), createContact);
router.put('/:id', requirePermission('companies', 'edit'), updateContact);
router.delete('/:id', requirePermission('companies', 'delete'), deleteContact);

export default router;
