import { Router } from 'express';
import {
  getCalls,
  getCallStats,
  getCallById,
  createCall,
  updateCall,
  deleteCall,
} from '../controllers/calls.controller.js';

const router = Router();

router.get('/stats', getCallStats);
router.get('/', getCalls);
router.get('/:id', getCallById);
router.post('/', createCall);
router.put('/:id', updateCall);
router.delete('/:id', deleteCall);

export default router;
