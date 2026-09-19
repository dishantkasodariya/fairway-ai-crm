import React, { createContext, useContext, useState, useEffect } from 'react';
import { Notification } from '@/modules/core/types';
import { NotificationService } from '@/modules/core/services/notificationService';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notif: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const refreshNotifications = async () => {
    try {
      const res = await NotificationService.getNotifications();
      if (res.success && res.data) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount ?? res.data.filter((n) => !n.isRead).length);
      }
    } catch (err) {
      console.warn('Failed to refresh notifications from API:', err);
    }
  };

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 20000); // 20-second real-time sync
    const handleFocus = () => refreshNotifications();
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await NotificationService.markAsRead(id);
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await NotificationService.markAllAsRead();
  };

  const addNotification = async (notif: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
    const res = await NotificationService.createNotification(notif);
    if (res.success && res.data) {
      setNotifications((prev) => [res.data!, ...prev]);
      setUnreadCount((prev) => prev + 1);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider');
  return ctx;
};
