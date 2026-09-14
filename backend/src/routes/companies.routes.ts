import { Router } from 'express';
import {
  getCompanies,
  getCompaniesDropdownActive,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  checkDuplicateCompany,
} from '../controllers/companies.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.get('/dd/active', requirePermission('companies', 'view'), getCompaniesDropdownActive);
router.get('/', requirePermission('companies', 'view'), getCompanies);
router.post('/check-duplicate', requirePermission('companies', 'create'), checkDuplicateCompany);
router.get('/:id', requirePermission('companies', 'view'), getCompanyById);
router.post('/', requirePermission('companies', 'create'), createCompany);
router.put('/:id', requirePermission('companies', 'edit'), updateCompany);
router.delete('/:id', requirePermission('companies', 'delete'), deleteCompany);

export default router;
