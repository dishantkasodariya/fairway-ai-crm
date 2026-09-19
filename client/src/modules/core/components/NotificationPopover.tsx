import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Check,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  Briefcase,
  ExternalLink,
  RotateCw,
} from 'lucide-react';
import { useNotifications } from '@/modules/core/providers/NotificationContext';
import { Notification } from '@/modules/core/types';

export interface NotificationPopoverProps {
  onNavigate: (entityType: string, entityId: string) => void;
}

// Clean, accurate real-time relative date formatter
export const formatNotificationTime = (dateString: string | undefined | null): string => {
  if (!dateString) return 'Just now';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return 'Just now';
  }
};

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({ onNavigate }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleManualRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    await refreshNotifications();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filteredNotifs = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const getNotificationDetails = (type: Notification['type'], entityType: string) => {
    const t = (type || '').toLowerCase();
    const e = (entityType || '').toLowerCase();

    if (t.includes('site_visit') || e.includes('site_visit')) {
      return {
        icon: <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
        badge: 'Site Visit',
        badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      };
    }
    if (t.includes('overdue')) {
      return {
        icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
        badge: 'Overdue Task',
        badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      };
    }
    if (t.includes('task') || t.includes('due') || e.includes('task')) {
      return {
        icon: <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />,
        badge: 'Follow-up',
        badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      };
    }
    if (t.includes('proposal') || e.includes('proposal')) {
      return {
        icon: <Briefcase className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />,
        badge: 'Proposal',
        badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      };
    }
    return {
      icon: <FileText className="w-3.5 h-3.5 text-fairway-600 dark:text-fairway-400" />,
      badge: 'Inquiry',
      badgeColor: 'bg-fairway-500/10 text-fairway-600 dark:text-fairway-400 border-fairway-500/20',
    };
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center size-9 rounded-button border border-border hover:border-fairway-500/50 bg-surface hover:bg-surface-muted text-foreground-muted hover:text-foreground transition-all shrink-0 shadow-2xs cursor-pointer group"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-foreground-muted group-hover:text-foreground transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-surface shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-surface rounded-2xl border border-border shadow-2xl z-[100] overflow-hidden animate-fade-in text-foreground text-left">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-fairway-500/15 text-fairway-600 dark:text-fairway-400 px-2 py-0.5 rounded-full border border-fairway-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualRefresh}
                className="p-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                title="Refresh Live Notifications"
              >
                <RotateCw className={`size-3.5 ${isRefreshing ? 'animate-spin text-fairway-600' : ''}`} />
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] text-foreground-muted hover:text-foreground font-semibold flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded hover:bg-surface-muted transition-colors"
                >
                  <Check className="size-3" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex border-b border-border bg-surface px-4 py-1.5 text-xs font-medium gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`py-1 px-2.5 rounded-lg text-xs transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-surface-muted font-bold text-foreground shadow-2xs border border-border'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`py-1 px-2.5 rounded-lg text-xs transition-colors cursor-pointer ${
                filter === 'unread'
                  ? 'bg-surface-muted font-bold text-foreground shadow-2xs border border-border'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {filteredNotifs.length === 0 ? (
              <div className="py-10 text-center px-4">
                <div className="size-10 rounded-full bg-surface-muted border border-border flex items-center justify-center mx-auto mb-2 text-foreground-muted">
                  <Bell className="size-5 opacity-50" />
                </div>
                <p className="text-xs font-semibold text-foreground">No notifications</p>
                <p className="text-[11px] text-foreground-muted mt-0.5">
                  {filter === 'unread' ? 'All caught up! No unread notifications.' : 'All system events are up to date.'}
                </p>
              </div>
            ) : (
              filteredNotifs.map((n) => {
                const details = getNotificationDetails(n.type, n.entityType);
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      markAsRead(n.id);
                      setIsOpen(false);
                      onNavigate(n.entityType, n.entityId);
                    }}
                    className={`p-3.5 flex items-start gap-3 hover:bg-surface-muted/70 cursor-pointer transition-all group ${
                      !n.isRead ? 'bg-surface-muted/30' : ''
                    }`}
                  >
                    <div className="mt-0.5 p-2 bg-surface border border-border rounded-xl shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                      {details.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 uppercase tracking-wider ${details.badgeColor}`}
                          >
                            {details.badge}
                          </span>
                          <h5
                            className={`text-xs truncate ${
                              !n.isRead ? 'font-bold text-foreground' : 'font-medium text-foreground'
                            }`}
                          >
                            {n.title}
                          </h5>
                        </div>

                        <span className="text-[10px] text-foreground-muted shrink-0">
                          {formatNotificationTime(n.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-foreground-muted line-clamp-2 mt-1 leading-relaxed">
                        {n.message}
                      </p>

                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[10px] text-fairway-600 dark:text-fairway-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          Click to view details <ExternalLink className="size-2.5" />
                        </span>
                        {!n.isRead && (
                          <span className="size-2 rounded-full bg-fairway-600 shrink-0 shadow-xs ml-auto" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPopover;
