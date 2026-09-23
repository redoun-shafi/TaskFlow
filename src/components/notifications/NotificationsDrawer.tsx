import React, { useState } from 'react';
import { Bell, CheckCheck, X, CheckCircle, UserPlus, MessageSquare, ArrowRight } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTask?: (taskId: string) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateToTask,
}) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  if (!isOpen) return null;

  const displayList = filterUnreadOnly
    ? notifications.filter((n) => !n.read)
    : notifications;

  const getIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <UserPlus className="w-4 h-4 text-indigo-500" />;
      case 'COMMENT_ADDED':
        return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'INVITATION_RECEIVED':
        return <Bell className="w-4 h-4 text-amber-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div
      id="notifications-drawer-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs"
    >
      <div
        id="notifications-drawer-panel"
        className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                id="mark-all-read-btn"
                type="button"
                onClick={markAllAsRead}
                className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors text-xs flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">Mark read</span>
              </button>
            )}
            <button
              id="close-notifications-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between text-xs bg-slate-50">
          <span className="text-slate-500 text-[11px]">
            {displayList.length} notification{displayList.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={() => setFilterUnreadOnly(!filterUnreadOnly)}
            className="text-[11px] text-indigo-600 font-semibold hover:underline"
          >
            {filterUnreadOnly ? 'Show All' : 'Show Unread Only'}
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {displayList.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">All caught up!</p>
              <p className="text-[11px]">No notifications to show.</p>
            </div>
          ) : (
            displayList.map((item) => (
              <div
                key={item.id}
                id={`notification-item-${item.id}`}
                onClick={async () => {
                  if (!item.read) await markAsRead(item.id);
                  if (item.metadata?.taskId && onNavigateToTask) {
                    onNavigateToTask(item.metadata.taskId);
                    onClose();
                  }
                }}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  item.read
                    ? 'bg-white border-slate-200/80 text-slate-600'
                    : 'bg-indigo-50/50 border-indigo-200/80 text-slate-900 font-medium'
                } hover:shadow-xs`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">{getIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-snug">{item.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                      {item.message}
                    </p>
                  </div>
                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600 mt-1 shrink-0" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
