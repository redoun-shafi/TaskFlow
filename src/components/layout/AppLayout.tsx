import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useAuth } from '../../context/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenCreateTask: () => void;
  onOpenCreateTeam: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenNotifications: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentPath,
  onNavigate,
  onOpenCreateTask,
  onOpenCreateTeam,
  searchQuery,
  onSearchChange,
  onOpenNotifications,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { currentUser } = useAuth();

  return (
    <div id="taskflow-app-container" className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar
          currentPath={currentPath}
          onNavigate={onNavigate}
          onOpenCreateTask={onOpenCreateTask}
          onOpenCreateTeam={onOpenCreateTeam}
        />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileSidebarOpen && (
        <div
          id="mobile-drawer-backdrop"
          className="fixed inset-0 z-50 flex md:hidden"
        >
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white z-50">
            <Sidebar
              currentPath={currentPath}
              onNavigate={onNavigate}
              onOpenCreateTask={onOpenCreateTask}
              onOpenCreateTeam={onOpenCreateTeam}
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {currentUser && (
          <TopNav
            onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
            onOpenCreateTask={onOpenCreateTask}
            onNavigate={onNavigate}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            onOpenNotifications={onOpenNotifications}
          />
        )}
        <main id="main-content-scroll" className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
