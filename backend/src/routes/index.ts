import { Router } from 'express';
import { authenticateJWT, optionalAuthenticateJWT } from '../middleware/auth.middleware.js';
import { getRolePermissionsForRole } from '../controllers/role.controller.js';
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
import intelligenceRoutes from './intelligence.routes.js';
import leasesRoutes from './leases.routes.js';
import todayRoutes from './today.routes.js';
import reportsRoutes from './reports.routes.js';

const router = Router();

// Public endpoints
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Browser extension & external integration endpoints
router.all(['/ext/activate', '/activate'], (req, res) => {
  const authHeader = (req.headers.authorization || '').toString();
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  res.status(200).json({
    success: true,
    status: 'active',
    active: true,
    message: 'Extension integration active',
    token: token || 'authenticated',
    data: {
      active: true,
      status: 'active',
      token: token || 'authenticated',
    },
  });
});

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

// Role permissions metadata endpoint (accessible by frontend for capability mapping)
router.get('/roles/:roleKey/permissions', getRolePermissionsForRole);

// Notifications endpoint (allows optional authentication so initial app loads don't error with 401)
router.use('/notifications', optionalAuthenticateJWT, notificationsRoutes);

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
router.use('/calls', authenticateJWT, callsRoutes);
router.use('/intelligence', authenticateJWT, intelligenceRoutes);
router.use('/leases', authenticateJWT, leasesRoutes);
router.use('/today', authenticateJWT, todayRoutes);
router.use('/reports', authenticateJWT, reportsRoutes);

export default router;


