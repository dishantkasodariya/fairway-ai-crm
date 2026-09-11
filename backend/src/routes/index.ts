import { Router } from 'express';
import healthRoutes from './health.routes.js';
import companiesRoutes from './companies.routes.js';
import inquiriesRoutes from './inquiries.routes.js';
import importRoutes from './import.routes.js';
import tasksRoutes from './tasks.routes.js';
import propertiesRoutes from './properties.routes.js';
import proposalsRoutes from './proposals.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import permissionsRoutes from './permissions.routes.js';
import roleRoutes from './role.routes.js';
import contactsRoutes from './contacts.routes.js';
import facilitiesRoutes from './facilities.routes.js';
import activitiesRoutes from './activities.routes.js';
import notesRoutes from './notes.routes.js';
import followUpsRoutes from './followups.routes.js';
import auditRoutes from './audit.routes.js';

import documentsRoutes from './documents.routes.js';
import communicationsRoutes from './communications.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/companies', companiesRoutes);
router.use('/contacts', contactsRoutes);
router.use('/facilities', facilitiesRoutes);
router.use('/inquiries', inquiriesRoutes);
router.use('/import', importRoutes);
router.use('/tasks', tasksRoutes);
router.use('/activities', activitiesRoutes);
router.use('/notes', notesRoutes);
router.use('/follow-ups', followUpsRoutes);
router.use('/followups', followUpsRoutes);
router.use('/properties', propertiesRoutes);
router.use('/proposals', proposalsRoutes);
router.use('/users', userRoutes);
router.use('/roles-permissions', permissionsRoutes);
router.use('/roles', roleRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/documents', documentsRoutes);
router.use('/communications', communicationsRoutes);

export default router;


