import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchRef = useRef<number>(0);

  const refreshNotifications = async () => {
    // Avoid concurrent overlapping requests
    if (isFetchingRef.current) return;

    try {
      const token = localStorage.getItem('fairway_token') || localStorage.getItem('fw_auth_token');
      if (!token) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      isFetchingRef.current = true;
      lastFetchRef.current = Date.now();

      const res = await NotificationService.getNotifications();
      if (res.success && res.data) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount ?? res.data.filter((n) => !n.isRead).length);
      }
    } catch (err) {
      console.warn('Failed to refresh notifications from API:', err);
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 30000); // 30-second real-time sync

    const handleFocus = () => {
      // Throttle window focus refresh: only refresh if last fetch was > 15 seconds ago
      if (Date.now() - lastFetchRef.current > 15000) {
        refreshNotifications();
      }
    };

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
