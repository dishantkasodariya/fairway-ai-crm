import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller.js';
import { authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authorizeRoles('super_admin', 'admin'), getAuditLogs);

export default router;
