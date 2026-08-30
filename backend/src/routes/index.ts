import { Router } from 'express';
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

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/companies', companiesRoutes);
router.use('/inquiries', inquiriesRoutes);
router.use('/import', importRoutes);
router.use('/tasks', tasksRoutes);
router.use('/properties', propertiesRoutes);
router.use('/proposals', proposalsRoutes);
router.use('/users', userRoutes);
router.use('/roles-permissions', permissionsRoutes);
router.use('/roles', roleRoutes);

export default router;
