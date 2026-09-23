import React, { useState } from 'react';
import {
  Menu,
  Search,
  Bell,
  Plus,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

interface TopNavProps {
  onToggleMobileSidebar: () => void;
  onOpenCreateTask: () => void;
  onNavigate: (path: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenNotifications: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onToggleMobileSidebar,
  onOpenCreateTask,
  onNavigate,
  searchQuery,
  onSearchChange,
  onOpenNotifications,
}) => {
  const { currentUser, userProfile, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const displayName = userProfile?.displayName || currentUser?.displayName || 'User';
  const photo = userProfile?.photoURL || currentUser?.photoURL;

  return (
    <header
      id="app-top-nav"
      className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shrink-0"
    >
      {/* Left: Mobile hamburger & Personal Title */}
      <div className="flex items-center gap-3">
        <button
          id="mobile-sidebar-toggle-btn"
          type="button"
          onClick={onToggleMobileSidebar}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900 md:hidden rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-800 tracking-tight">TaskFlow</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500 font-medium">Personal Tasks</span>
        </div>
      </div>

      {/* Center: Search input */}
      <div className="flex-1 max-w-md mx-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="global-task-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks, descriptions, labels..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
          />
        </div>
      </div>

      {/* Right: Actions & User menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Create Task Action */}
        <button
          id="top-nav-new-task-btn"
          type="button"
          onClick={onOpenCreateTask}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>

        {/* Notifications Button */}
        <button
          id="top-nav-notifications-btn"
          type="button"
          onClick={onOpenNotifications}
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
          )}
        </button>

        {/* User Profile Avatar Dropdown */}
        <div className="relative">
          <button
            id="top-nav-profile-menu-btn"
            type="button"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center focus:outline-none"
          >
            {photo ? (
              <img
                src={photo}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100 hover:ring-indigo-200 transition-all"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center ring-2 ring-slate-100">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </button>

          {profileDropdownOpen && (
            <div
              id="top-nav-profile-dropdown"
              className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1"
            >
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800 truncate">{displayName}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser?.email}</p>
              </div>

              <button
                id="menu-profile-btn"
                type="button"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  onNavigate('/profile');
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                Profile Settings
              </button>

              <button
                id="menu-team-settings-btn"
                type="button"
                onClick={() => {
                  setProfileDropdownOpen(false);
                  onNavigate('/teams/settings');
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                Workspace Settings
              </button>

              <div className="border-t border-slate-100 my-1"></div>

              <button
                id="menu-logout-btn"
                type="button"
                onClick={async () => {
                  setProfileDropdownOpen(false);
                  await logout();
                  onNavigate('/login');
                }}
                className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
