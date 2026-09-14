import { Notification } from '@/modules/core/types';
import { api } from './api';

export class NotificationService {
  /**
   * Fetch current user notifications
   */
  static async getNotifications(): Promise<{
    success: boolean;
    data?: Notification[];
    unreadCount?: number;
    error?: string;
  }> {
    try {
      const res = await api.get<Notification[]>('/notifications');
      if (res.success && res.data) {
        return {
          success: true,
          data: res.data,
          unreadCount: (res as any).unreadCount ?? res.data.filter((n) => !n.isRead).length,
        };
      }
      return { success: false, error: res.error?.message || 'Failed to fetch notifications' };
    } catch (err: any) {
      console.warn('NotificationService.getNotifications failed:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Mark single notification as read
   */
  static async markAsRead(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await api.put(`/notifications/${id}/read`);
      return { success: res.success, error: res.error?.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await api.put('/notifications/mark-all-read');
      return { success: res.success, error: res.error?.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Create a notification
   */
  static async createNotification(
    notif: Omit<Notification, 'id' | 'createdAt' | 'isRead'>
  ): Promise<{ success: boolean; data?: Notification; error?: string }> {
    try {
      const res = await api.post<Notification>('/notifications', notif);
      return { success: res.success, data: res.data, error: res.error?.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export default NotificationService;
