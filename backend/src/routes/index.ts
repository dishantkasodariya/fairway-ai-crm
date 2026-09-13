import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware.js';
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

// Public endpoints
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Protected endpoints (require valid JWT Bearer token)
router.use('/companies', authenticateJWT, companiesRoutes);
router.use('/contacts', authenticateJWT, contactsRoutes);
router.use('/facilities', authenticateJWT, facilitiesRoutes);
router.use('/inquiries', authenticateJWT, inquiriesRoutes);
router.use('/import', authenticateJWT, importRoutes);
router.use('/tasks', authenticateJWT, tasksRoutes);
router.use('/activities', authenticateJWT, activitiesRoutes);
router.use('/notes', authenticateJWT, notesRoutes);
router.use('/follow-ups', authenticateJWT, followUpsRoutes);
router.use('/followups', authenticateJWT, followUpsRoutes);
router.use('/properties', authenticateJWT, propertiesRoutes);
router.use('/proposals', authenticateJWT, proposalsRoutes);
router.use('/users', authenticateJWT, userRoutes);
router.use('/roles-permissions', authenticateJWT, permissionsRoutes);
router.use('/roles', authenticateJWT, roleRoutes);
router.use('/audit-logs', authenticateJWT, auditRoutes);
router.use('/documents', authenticateJWT, documentsRoutes);
router.use('/communications', authenticateJWT, communicationsRoutes);

export default router;


