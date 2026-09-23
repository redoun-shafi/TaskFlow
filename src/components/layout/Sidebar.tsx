import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Columns3,
  Calendar,
  Settings,
  Bell,
  Plus,
  LogOut,
  FolderKanban,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { authService } from '../../services/authService';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenCreateTask: () => void;
  onOpenCreateTeam?: () => void;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  onOpenCreateTask,
  onCloseMobile,
}) => {
  const { unreadCount } = useNotifications();

  const handleNav = (path: string) => {
    onNavigate(path);
    if (onCloseMobile) onCloseMobile();
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'All Tasks', path: '/tasks', icon: CheckSquare },
    { label: 'Kanban Board', path: '/tasks?view=kanban', icon: Columns3 },
    { label: 'Calendar', path: '/calendar', icon: Calendar },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { label: 'Settings', path: '/profile', icon: Settings },
  ];

  return (
    <aside
      id="app-sidebar"
      className="w-64 h-full bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none"
    >
      {/* Top Header & Brand */}
      <div>
        {/* Brand */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
          <div
            id="brand-logo"
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => handleNav('/dashboard')}
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm shadow-indigo-200">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-lg leading-none block">
                TaskFlow
              </span>
              <span className="text-[10px] text-indigo-600 font-semibold tracking-wider uppercase">
                Personal Tasks
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Button */}
        <div className="p-3">
          <button
            id="sidebar-new-task-btn"
            type="button"
            onClick={onOpenCreateTask}
            className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>

        {/* Navigation Links */}
        <nav id="sidebar-nav" className="px-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentPath === item.path ||
              (item.path === '/tasks' &&
                currentPath.startsWith('/tasks') &&
                !currentPath.includes('view=kanban'));

            return (
              <button
                key={item.path}
                id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                type="button"
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white leading-none">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Clean Sign Out at Bottom */}
      <div className="p-3 border-t border-slate-100">
        <button
          id="sidebar-logout-btn"
          type="button"
          onClick={async () => {
            await authService.logout();
            handleNav('/login');
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-4 h-4 text-slate-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
