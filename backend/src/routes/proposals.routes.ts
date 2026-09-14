import { Router } from 'express';
import {
  getProposals,
  getProposalById,
  createProposal,
  updateProposalStatus,
  updateProposal,
  deleteProposal,
} from '../controllers/proposals.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.get('/', requirePermission('proposals', 'view'), getProposals);
router.get('/:id', requirePermission('proposals', 'view'), getProposalById);
router.post('/', requirePermission('proposals', 'create'), createProposal);
router.patch('/:id/status', requirePermission('proposals', 'edit'), updateProposalStatus);
router.put('/:id', requirePermission('proposals', 'edit'), updateProposal);
router.delete('/:id', requirePermission('proposals', 'delete'), deleteProposal);

export default router;
