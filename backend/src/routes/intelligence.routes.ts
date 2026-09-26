import { Router } from 'express';
import {
  startDiscoveryRun,
  getDiscoveryRun,
  enrichRevenue,
  listDiscoveredCompanies,
  getBusinessTypes,
  getDiscoveredCompany,
  researchRevenue,
  researchSignals,
  enrichContacts,
  getCompanyContacts,
  draftMessage,
  getResearchJob,
} from '../controllers/intelligence.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.post('/discovery/runs', requirePermission('companies', 'create'), startDiscoveryRun);
router.get('/discovery/runs/:runId', requirePermission('companies', 'view'), getDiscoveryRun);
router.post('/discovery/runs/:runId/enrich-revenue', requirePermission('companies', 'edit'), enrichRevenue);
router.get('/companies/business-types', requirePermission('companies', 'view'), getBusinessTypes);
router.get('/companies', requirePermission('companies', 'view'), listDiscoveredCompanies);
router.get('/companies/:id', requirePermission('companies', 'view'), getDiscoveredCompany);
router.post('/companies/:id/revenue-research', requirePermission('companies', 'edit'), researchRevenue);
router.post('/companies/:id/signals-research', requirePermission('companies', 'edit'), researchSignals);
router.post('/companies/:id/contacts-enrich', requirePermission('companies', 'edit'), enrichContacts);
router.get('/companies/:id/contacts', requirePermission('companies', 'view'), getCompanyContacts);
router.post('/contacts/:id/draft-message', requirePermission('companies', 'edit'), draftMessage);
router.get('/jobs/:jobId', requirePermission('companies', 'view'), getResearchJob);

export default router;
