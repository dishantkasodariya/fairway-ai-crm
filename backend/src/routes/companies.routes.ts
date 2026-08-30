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

const router = Router();

router.get('/dd/active', getCompaniesDropdownActive);
router.get('/', getCompanies);
router.post('/check-duplicate', checkDuplicateCompany);
router.get('/:id', getCompanyById);
router.post('/', createCompany);
router.put('/:id', updateCompany);
router.delete('/:id', deleteCompany);

export default router;
