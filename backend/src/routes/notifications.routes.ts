import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
} from '../controllers/notifications.controller.js';

const router = Router();

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.patch('/:id/read', markAsRead);
router.put('/mark-all-read', markAllAsRead);
router.patch('/mark-all-read', markAllAsRead);
router.post('/', createNotification);

export default router;
