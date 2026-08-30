import { Router } from 'express';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  toggleTaskStatus,
  deleteTask,
} from '../controllers/tasks.controller.js';

const router = Router();

router.get('/', getTasks);
router.get('/:id', getTaskById);
router.post('/', createTask);
router.put('/:id', updateTask);
router.patch('/:id/toggle', toggleTaskStatus);
router.delete('/:id', deleteTask);

export default router;
