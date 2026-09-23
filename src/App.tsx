import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TeamProvider, useTeam } from './context/TeamContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardView } from './components/dashboard/DashboardView';
import { TaskList } from './components/tasks/TaskList';
import { KanbanBoard } from './components/tasks/KanbanBoard';
import { CalendarView } from './components/tasks/CalendarView';
import { TaskModal } from './components/tasks/TaskModal';
import { TaskDetailModal } from './components/tasks/TaskDetailModal';
import { TeamModal } from './components/teams/TeamModal';
import { TeamMembersView } from './components/teams/TeamMembersView';
import { TeamSettingsView } from './components/teams/TeamSettingsView';
import { ProfileView } from './components/profile/ProfileView';
import { NotificationsDrawer } from './components/notifications/NotificationsDrawer';
import { LoginView } from './components/auth/LoginView';
import { RegisterView } from './components/auth/RegisterView';
import { taskService } from './services/taskService';
import { activityService } from './services/activityService';
import { Task, TaskPriority, TaskStatus, Activity } from './types';
import { Loader2, Columns3, List, Plus } from 'lucide-react';

function MainApp() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { currentTeam } = useTeam();
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation state (path) synchronized with HashRouter
  const currentPath =
    !location.pathname || location.pathname === '/'
      ? '/dashboard'
      : `${location.pathname}${location.search}`;

  const setCurrentPath = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate]
  );

  useEffect(() => {
    if (!location.pathname || location.pathname === '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  // Tasks & Activity state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskDefaultStatus, setTaskDefaultStatus] = useState<TaskStatus>('TODO');
  const [taskDefaultDueDate, setTaskDefaultDueDate] = useState<string>('');

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [createTeamModalOpen, setCreateTeamModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Load tasks and activity for the current personal user
  const loadWorkspaceData = useCallback(async () => {
    if (!currentUser) {
      setTasks([]);
      setActivities([]);
      return;
    }
    try {
      const [userTasks, userActivities] = await Promise.all([
        taskService.getUserTasks(currentUser.uid),
        activityService.getUserActivity(currentUser.uid, 25),
      ]);

      let mergedTasks = userTasks;
      if (currentTeam?.id) {
        try {
          const teamTasks = await taskService.getTeamTasks(currentTeam.id);
          const taskMap = new Map<string, Task>();
          userTasks.forEach((t) => taskMap.set(t.id, t));
          teamTasks.forEach((t) => taskMap.set(t.id, t));
          mergedTasks = Array.from(taskMap.values());
        } catch (e) {
          console.warn('Optional team tasks fetch note:', e);
        }
      }

      setTasks(mergedTasks);
      setActivities(userActivities);

      setSelectedTask((prev) => {
        if (!prev) return null;
        const matched = mergedTasks.find((t) => t.id === prev.id);
        return matched || prev;
      });
    } catch (e) {
      console.warn('Failed to load tasks data:', e);
    }
  }, [currentUser, currentTeam]);

  useEffect(() => {
    if (currentUser) {
      loadWorkspaceData();
    }
  }, [currentUser, loadWorkspaceData]);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-600 tracking-wide">
          Loading TaskFlow...
        </p>
      </div>
    );
  }

  // Unauthenticated screens
  if (!currentUser) {
    if (authView === 'register') {
      return (
        <RegisterView
          onSuccess={() => setCurrentPath('/dashboard')}
          onNavigateToLogin={() => setAuthView('login')}
        />
      );
    }
    return (
      <LoginView
        onSuccess={() => setCurrentPath('/dashboard')}
        onNavigateToRegister={() => setAuthView('register')}
      />
    );
  }

  // Filter tasks by global search
  const filteredTasks = tasks.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchTitle = t.title.toLowerCase().includes(q);
    const matchDesc = t.description?.toLowerCase().includes(q);
    const matchLabel = t.labels?.some((l) => l.toLowerCase().includes(q));
    const matchAssignee = t.assigneeName?.toLowerCase().includes(q);
    return matchTitle || matchDesc || matchLabel || matchAssignee;
  });

  const myTasks = filteredTasks.filter((t) => t.assigneeId === currentUser.uid);

  // Status change handler
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const existing = tasks.find((t) => t.id === taskId);
    if (!existing) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await taskService.updateTask(
        taskId,
        existing,
        { status: newStatus },
        {
          uid: currentUser.uid,
          displayName: userProfile?.displayName || currentUser.displayName,
          photoURL: userProfile?.photoURL || currentUser.photoURL,
        }
      );
      loadWorkspaceData();
    } catch (e) {
      console.error('Failed to change status:', e);
      loadWorkspaceData();
    }
  };

  const handleOpenCreateTask = (status: TaskStatus = 'TODO', dueDate: string = '') => {
    setTaskToEdit(null);
    setTaskDefaultStatus(status);
    setTaskDefaultDueDate(dueDate);
    setTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setDetailModalOpen(false);
    setTaskToEdit(task);
    setTaskModalOpen(true);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
  };

  const handleQuickAddTask = async (title: string, priority: TaskPriority = 'MEDIUM') => {
    if (!title.trim() || !currentUser) return;
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      await taskService.createTask({
        title: title.trim(),
        status: 'TODO',
        priority,
        teamId: currentTeam?.id || 'personal',
        creator: {
          uid: currentUser.uid,
          displayName: userProfile?.displayName || currentUser.displayName,
          email: currentUser.email,
        },
        assignee: {
          uid: currentUser.uid,
          displayName: userProfile?.displayName || currentUser.displayName || 'Me',
          email: currentUser.email || '',
        },
        dueDate: todayStr,
        labels: ['Daily'],
        teamMemberIds: [currentUser.uid],
      });
      loadWorkspaceData();
    } catch (e) {
      console.error('Failed to quick add daily task:', e);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      await taskService.deleteTask(task, {
        uid: currentUser.uid,
        displayName: userProfile?.displayName || currentUser.displayName,
      });
      loadWorkspaceData();
    } catch (e) {
      console.error('Failed to delete task:', e);
    }
  };

  // Render main screen according to currentPath
  const renderCurrentView = () => {
    if (currentPath === '/dashboard') {
      return (
        <DashboardView
          tasks={filteredTasks}
          activities={activities}
          onTaskClick={handleTaskClick}
          onOpenCreateTask={(status, dueDate) => handleOpenCreateTask(status, dueDate)}
          onQuickAddTask={handleQuickAddTask}
          onStatusChange={handleStatusChange}
          onDeleteTask={handleDeleteTask}
          onNavigate={(path) => setCurrentPath(path)}
        />
      );
    }

    if (currentPath === '/my-tasks') {
      return (
        <div className="space-y-4">
          <div className="px-4 lg:px-6 pt-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">My Tasks</h2>
              <p className="text-xs text-slate-500">
                Tasks assigned to you ({myTasks.length})
              </p>
            </div>
            <button
              id="my-tasks-create-btn"
              type="button"
              onClick={() => handleOpenCreateTask('TODO')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Task</span>
            </button>
          </div>
          <TaskList
            tasks={myTasks}
            onTaskClick={handleTaskClick}
            onOpenCreateTask={() => handleOpenCreateTask('TODO')}
            onStatusChange={handleStatusChange}
            onDeleteTask={handleDeleteTask}
          />
        </div>
      );
    }

    if (currentPath.startsWith('/tasks')) {
      const isKanban = currentPath.includes('view=kanban');

      return (
        <div className="space-y-2">
          {/* View switcher header */}
          <div className="px-4 lg:px-6 pt-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">All Tasks</h2>
              <p className="text-xs text-slate-500">
                Personal task list &bull; {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  id="view-list-toggle-btn"
                  type="button"
                  onClick={() => setCurrentPath('/tasks')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    !isKanban
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>List</span>
                </button>
                <button
                  id="view-kanban-toggle-btn"
                  type="button"
                  onClick={() => setCurrentPath('/tasks?view=kanban')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    isKanban
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Columns3 className="w-3.5 h-3.5" />
                  <span>Kanban</span>
                </button>
              </div>
            </div>
          </div>

          {isKanban ? (
            <KanbanBoard
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
              onQuickAddTask={(status) => handleOpenCreateTask(status)}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <TaskList
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
              onOpenCreateTask={() => handleOpenCreateTask('TODO')}
              onStatusChange={handleStatusChange}
              onDeleteTask={handleDeleteTask}
            />
          )}
        </div>
      );
    }

    if (currentPath === '/calendar') {
      return (
        <CalendarView
          tasks={filteredTasks}
          onTaskClick={handleTaskClick}
          onOpenCreateTaskWithDate={(dateStr) => handleOpenCreateTask('TODO', dateStr)}
        />
      );
    }

    if (currentPath === '/teams/members') {
      return <TeamMembersView />;
    }

    if (currentPath === '/teams/settings') {
      return (
        <TeamSettingsView
          onTeamDeleted={() => setCurrentPath('/dashboard')}
        />
      );
    }

    if (currentPath === '/profile') {
      return <ProfileView />;
    }

    if (currentPath === '/notifications') {
      return (
        <div className="p-4 lg:p-6 max-w-2xl mx-auto">
          <NotificationsDrawer
            isOpen={true}
            onClose={() => setCurrentPath('/dashboard')}
            onNavigateToTask={(taskId) => {
              const matched = tasks.find((t) => t.id === taskId);
              if (matched) handleTaskClick(matched);
            }}
          />
        </div>
      );
    }

    return (
      <DashboardView
        tasks={filteredTasks}
        activities={activities}
        onTaskClick={handleTaskClick}
        onOpenCreateTask={() => handleOpenCreateTask('TODO')}
        onNavigate={(path) => setCurrentPath(path)}
      />
    );
  };

  return (
    <AppLayout
      currentPath={currentPath}
      onNavigate={(path) => setCurrentPath(path)}
      onOpenCreateTask={() => handleOpenCreateTask('TODO')}
      onOpenCreateTeam={() => setCreateTeamModalOpen(true)}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onOpenNotifications={() => setNotificationsOpen(true)}
    >
      {renderCurrentView()}

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
        defaultStatus={taskDefaultStatus}
        defaultDueDate={taskDefaultDueDate}
        onTaskSaved={loadWorkspaceData}
        onTaskDeleted={() => {
          setSelectedTask(null);
          loadWorkspaceData();
        }}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedTask(null);
        }}
        onEditTask={handleOpenEditTask}
        onTaskUpdated={loadWorkspaceData}
      />

      {/* Create Team Modal */}
      <TeamModal
        isOpen={createTeamModalOpen}
        onClose={() => setCreateTeamModalOpen(false)}
        onTeamCreated={() => loadWorkspaceData()}
      />

      {/* Quick Notifications Drawer */}
      <NotificationsDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onNavigateToTask={(taskId) => {
          const matched = tasks.find((t) => t.id === taskId);
          if (matched) handleTaskClick(matched);
        }}
      />
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TeamProvider>
        <NotificationProvider>
          <MainApp />
        </NotificationProvider>
      </TeamProvider>
    </AuthProvider>
  );
}
