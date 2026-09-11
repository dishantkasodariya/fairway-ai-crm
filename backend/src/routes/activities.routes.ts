import { Router } from 'express';
import { getActivities, createActivity } from '../controllers/activities.controller.js';

const router = Router();

router.get('/', getActivities);
router.post('/', createActivity);

export default router;
