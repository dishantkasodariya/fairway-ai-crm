import React, { createContext, useContext, useState, useEffect } from 'react';
import { Notification } from '@/modules/core/types';
import { StorageService } from '@/modules/core/services/storageService';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notif: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>(StorageService.getNotifications());

  const refresh = () => {
    setNotifications(StorageService.getNotifications());
  };

  useEffect(() => {
    window.addEventListener('fw_storage_change', refresh);
    return () => window.removeEventListener('fw_storage_change', refresh);
  }, []);

  const markAsRead = (id: string) => {
    StorageService.markNotificationRead(id);
    refresh();
  };

  const markAllAsRead = () => {
    StorageService.markAllNotificationsRead();
    refresh();
  };

  const addNotification = (notif: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
    StorageService.createNotification(notif);
    refresh();
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
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
