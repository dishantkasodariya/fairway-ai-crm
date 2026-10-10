import { Router } from 'express';
import {
  startDiscoveryRun,
  getDiscoveryRun,
  enrichRevenue,
  researchRunSignals,
  startRunPipeline,
  listConnectionsByCompany,
  listDiscoveredCompanies,
  getBusinessTypes,
  getDiscoveredCompany,
  researchRevenue,
  researchSignals,
  enrichContacts,
  getCompanyContacts,
  listAllContacts,
  draftMessage,
  sendOutreachEmail,
  getResearchJob,
} from '../controllers/intelligence.controller.js';
import { crmStatus, addToCrm, createManualContact, deleteContact } from '../controllers/aiProspects.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.post('/discovery/runs', requirePermission('companies', 'create'), startDiscoveryRun);
router.get('/discovery/runs/:runId', requirePermission('companies', 'view'), getDiscoveryRun);
router.post('/discovery/runs/:runId/enrich-revenue', requirePermission('companies', 'edit'), enrichRevenue);
router.post('/discovery/runs/:runId/research-signals', requirePermission('companies', 'edit'), researchRunSignals);
router.post('/discovery/runs/:runId/pipeline', requirePermission('companies', 'edit'), startRunPipeline);
router.get('/companies/business-types', requirePermission('companies', 'view'), getBusinessTypes);
router.get('/companies', requirePermission('companies', 'view'), listDiscoveredCompanies);
router.get('/companies/:id', requirePermission('companies', 'view'), getDiscoveredCompany);
router.post('/companies/:id/revenue-research', requirePermission('companies', 'edit'), researchRevenue);
router.post('/companies/:id/signals-research', requirePermission('companies', 'edit'), researchSignals);
router.post('/companies/:id/contacts-enrich', requirePermission('companies', 'edit'), enrichContacts);
router.get('/companies/:id/contacts', requirePermission('companies', 'view'), getCompanyContacts);
router.post('/companies/:id/contacts', requirePermission('companies', 'edit'), createManualContact);
router.get('/companies/:id/crm-status', requirePermission('companies', 'view'), crmStatus);
router.post('/companies/:id/add-to-crm', requirePermission('inquiries', 'create'), addToCrm);
router.delete('/contacts/:id', requirePermission('companies', 'edit'), deleteContact);
router.get('/contacts/by-company', requirePermission('companies', 'view'), listConnectionsByCompany);
router.get('/contacts', requirePermission('companies', 'view'), listAllContacts);
router.post('/contacts/:id/draft-message', requirePermission('companies', 'edit'), draftMessage);
router.post('/contacts/:id/send-email', requirePermission('companies', 'edit'), sendOutreachEmail);
router.get('/jobs/:jobId', requirePermission('companies', 'view'), getResearchJob);

export default router;
