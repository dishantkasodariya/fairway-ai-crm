import { Router } from 'express';
import {
  getProposals,
  getProposalById,
  createProposal,
  updateProposalStatus,
  updateProposal,
  deleteProposal,
} from '../controllers/proposals.controller.js';

const router = Router();

router.get('/', getProposals);
router.get('/:id', getProposalById);
router.post('/', createProposal);
router.patch('/:id/status', updateProposalStatus);
router.put('/:id', updateProposal);
router.delete('/:id', deleteProposal);

export default router;
