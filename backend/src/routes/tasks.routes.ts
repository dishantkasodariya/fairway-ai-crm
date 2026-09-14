import { Router } from 'express';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  toggleTaskStatus,
  deleteTask,
} from '../controllers/tasks.controller.js';
import { requirePermission } from '../middleware/permission.middleware.js';

const router = Router();

router.get('/', requirePermission('tasks', 'view'), getTasks);
router.get('/:id', requirePermission('tasks', 'view'), getTaskById);
router.post('/', requirePermission('tasks', 'create'), createTask);
router.put('/:id', requirePermission('tasks', 'edit'), updateTask);
router.patch('/:id/toggle', requirePermission('tasks', 'edit'), toggleTaskStatus);
router.delete('/:id', requirePermission('tasks', 'delete'), deleteTask);

export default router;
