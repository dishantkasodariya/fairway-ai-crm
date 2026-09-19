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
import siteVisitsRoutes from './site-visits.routes.js';
import pipelineStagesRoutes from './pipeline-stages.routes.js';
import notificationsRoutes from './notifications.routes.js';
import callsRoutes from './calls.routes.js';

const router = Router();

// Public endpoints
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Browser extension & external integration auth-token endpoint
router.all(['/ext/auth-token', '/auth-token'], (req, res) => {
  const authHeader = (req.headers.authorization || '').toString();
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  res.status(200).json({
    success: true,
    token: token || 'authenticated',
    authToken: token || 'authenticated',
    role: (req.headers['x-user-role'] as string) || 'admin',
    status: 'authenticated',
    type: 'bearer',
    data: {
      token: token || 'authenticated',
      role: (req.headers['x-user-role'] as string) || 'admin',
      status: 'authenticated',
      type: 'bearer',
    },
  });
});

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
router.use('/site-visits', authenticateJWT, siteVisitsRoutes);
router.use('/pipeline-stages', authenticateJWT, pipelineStagesRoutes);
router.use('/notifications', authenticateJWT, notificationsRoutes);
router.use('/calls', authenticateJWT, callsRoutes);

export default router;


