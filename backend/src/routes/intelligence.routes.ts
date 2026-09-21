import { Router } from 'express';
import {
  startDiscoveryRun,
  getDiscoveryRun,
  listDiscoveredCompanies,
  getDiscoveredCompany,
  researchRevenue,
  researchSignals,
  getResearchJob,
} from '../controllers/intelligence.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.post('/discovery/runs', requirePermission('companies', 'create'), startDiscoveryRun);
router.get('/discovery/runs/:runId', requirePermission('companies', 'view'), getDiscoveryRun);
router.get('/companies', requirePermission('companies', 'view'), listDiscoveredCompanies);
router.get('/companies/:id', requirePermission('companies', 'view'), getDiscoveredCompany);
router.post('/companies/:id/revenue-research', requirePermission('companies', 'edit'), researchRevenue);
router.post('/companies/:id/signals-research', requirePermission('companies', 'edit'), researchSignals);
router.get('/jobs/:jobId', requirePermission('companies', 'view'), getResearchJob);

export default router;
