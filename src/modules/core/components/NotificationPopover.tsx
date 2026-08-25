import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Clock, AlertTriangle, FileText, Calendar, X } from 'lucide-react';
import { useNotifications } from '@/modules/core/providers/NotificationContext';
import { formatRelativeDate } from '@/modules/core/utils/formatters';
import { Notification } from '@/modules/core/types';

export interface NotificationPopoverProps {
  onNavigate: (entityType: string, entityId: string) => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({ onNavigate }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
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

  const filteredNotifs = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'followup_overdue':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'followup_due':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'site_visit_upcoming':
        return <Calendar className="w-4 h-4 text-orange-600" />;
      case 'inquiry_assigned':
      case 'stage_changed':
      case 'proposal_updated':
      default:
        return <FileText className="w-4 h-4 text-fairway-600" />;
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-foreground-muted hover:text-foreground rounded-full hover:bg-surface-muted transition-colors focus-visible:ring-2 focus-visible:ring-fairway-600"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface rounded-card border border-border shadow-popover z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold bg-fairway-100 text-fairway-800 px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-fairway-700 hover:text-fairway-900 font-medium flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex border-b border-border bg-surface-muted/40 px-4 py-1.5 text-xs font-medium gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`py-1 px-2 rounded ${filter === 'all' ? 'bg-white shadow-subtle text-foreground font-semibold' : 'text-foreground-muted'}`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`py-1 px-2 rounded ${filter === 'unread' ? 'bg-white shadow-subtle text-foreground font-semibold' : 'text-foreground-muted'}`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {filteredNotifs.length === 0 ? (
              <div className="py-8 text-center text-xs text-foreground-muted">No notifications right now</div>
            ) : (
              filteredNotifs.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    markAsRead(n.id);
                    setIsOpen(false);
                    onNavigate(n.entityType, n.entityId);
                  }}
                  className={`p-3 flex items-start gap-3 hover:bg-surface-muted cursor-pointer transition-colors ${!n.isRead ? 'bg-fairway-50/40' : ''}`}
                >
                  <div className="mt-0.5 p-1.5 bg-white border border-border rounded-md shrink-0 shadow-subtle">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h5 className={`text-xs truncate ${!n.isRead ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
                        {n.title}
                      </h5>
                      <span className="text-[10px] text-foreground-muted shrink-0">
                        {formatRelativeDate(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-foreground-muted line-clamp-2 mt-0.5 leading-relaxed">{n.message}</p>
                  </div>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-fairway-600 shrink-0 mt-1.5" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
