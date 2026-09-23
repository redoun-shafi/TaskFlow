import React, { useState } from 'react';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Plus,
  ArrowRight,
  TrendingUp,
  Activity as ActivityIcon,
  Calendar,
  Sparkles,
  ListTodo,
  Tag,
  Trash2,
  Lock,
  Users,
  Layers,
  Globe,
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus, Activity } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface DashboardViewProps {
  tasks: Task[];
  activities: Activity[];
  onTaskClick: (task: Task) => void;
  onOpenCreateTask: (status?: TaskStatus, dueDate?: string) => void;
  onQuickAddTask?: (title: string, priority?: TaskPriority) => Promise<void>;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onDeleteTask?: (task: Task) => void;
  onNavigate: (path: string) => void;
}

// Circular progress indicator component with animated SVG ring
const CircularProgress: React.FC<{ percentage: number; size?: number; strokeWidth?: number }> = ({
  percentage,
  size = 124,
  strokeWidth = 10,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePercentage = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (safePercentage / 100) * circumference;
  const isComplete = safePercentage >= 100;

  return (
    <div
      id="round-progress-meter"
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100"
          fill="transparent"
        />
        {/* Animated Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`transition-all duration-700 ease-out ${
            isComplete
              ? 'text-emerald-500'
              : safePercentage >= 60
              ? 'text-indigo-600'
              : 'text-indigo-500'
          }`}
          fill="transparent"
        />
      </svg>
      {/* Centered Percentage Text */}
      <div className="absolute flex flex-col items-center justify-center text-center select-none">
        <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
          {safePercentage}%
        </span>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${
            isComplete ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          {isComplete ? 'Complete' : 'Progress'}
        </span>
      </div>
    </div>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  activities,
  onTaskClick,
  onOpenCreateTask,
  onQuickAddTask,
  onStatusChange,
  onDeleteTask,
  onNavigate,
}) => {
  const { currentUser, userProfile } = useAuth();

  // Daily list filtering state
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'pending' | 'completed'>('today');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('MEDIUM');
  const [quickAdding, setQuickAdding] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Daily task calculation
  const todayTasks = tasks.filter((t) => {
    if (!t.dueDate) return true; // Tasks without due date count as flexible/daily
    return t.dueDate === todayStr || t.dueDate.startsWith(todayStr);
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === 'IN_PROGRESS' || t.status === 'REVIEW'
  ).length;
  const todoTasks = tasks.filter((t) => t.status === 'TODO').length;

  const overdueTasks = tasks.filter(
    (t) =>
      t.dueDate &&
      t.status !== 'COMPLETED' &&
      new Date(t.dueDate).setHours(23, 59, 59, 999) < Date.now()
  );

  // Focus completion calculation based on active tab view
  const targetTasksForRate = activeTab === 'today' ? todayTasks : tasks;
  const targetCompletedCount = targetTasksForRate.filter((t) => t.status === 'COMPLETED').length;
  const completionRate =
    targetTasksForRate.length > 0
      ? Math.round((targetCompletedCount / targetTasksForRate.length) * 100)
      : 0;

  // Filtered task list according to activeTab
  const displayedDailyTasks = tasks.filter((t) => {
    if (activeTab === 'today') {
      if (!t.dueDate) return true;
      return t.dueDate === todayStr || t.dueDate.startsWith(todayStr);
    }
    if (activeTab === 'pending') {
      return t.status !== 'COMPLETED';
    }
    if (activeTab === 'completed') {
      return t.status === 'COMPLETED';
    }
    return true; // 'all'
  });

  const displayName = userProfile?.displayName || currentUser?.displayName || 'there';

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || !onQuickAddTask) return;

    setQuickAdding(true);
    try {
      await onQuickAddTask(quickTitle.trim(), quickPriority);
      setQuickTitle('');
    } finally {
      setQuickAdding(false);
    }
  };

  const handleToggleTaskStatus = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onStatusChange) return;
    const nextStatus: TaskStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    onStatusChange(task.id, nextStatus);
  };

  const priorityStyles: Record<TaskPriority, { dot: string; label: string }> = {
    LOW: { dot: 'bg-slate-400', label: 'text-slate-600' },
    MEDIUM: { dot: 'bg-amber-400', label: 'text-amber-700' },
    HIGH: { dot: 'bg-rose-500', label: 'text-rose-700' },
    URGENT: { dot: 'bg-red-600', label: 'text-red-700' },
  };

  return (
    <div id="dashboard-view" className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner & Daily Progress Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Welcome Text */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100/80">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>Personal Task Manager</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Good day, {displayName}
            </h1>
            <p className="text-xs text-slate-500 max-w-md leading-relaxed">
              Track your daily goals, check off completed milestones, and stay focused on what
              matters today.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              id="dash-new-task-btn"
              type="button"
              onClick={() => onOpenCreateTask('TODO', todayStr)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </button>
            <button
              id="dash-open-kanban-btn"
              type="button"
              onClick={() => onNavigate('/tasks?view=kanban')}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>Kanban Board</span>
            </button>
            <button
              id="dash-open-calendar-btn"
              type="button"
              onClick={() => onNavigate('/calendar')}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Calendar</span>
            </button>
            <button
              id="dash-open-custom-url-btn"
              type="button"
              onClick={() => onNavigate('/custom-url')}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/60 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
              title="View your ready-to-use live URL and free custom domain setup"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              <span>Custom URL</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 uppercase">
                Free
              </span>
            </button>
          </div>
        </div>

        {/* Round Progress Meter Card (% with round progress) */}
        <div
          id="daily-progress-card"
          className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {activeTab === 'today' ? "Today's Progress" : 'Overall Progress'}
            </h3>
            <p className="text-xs text-slate-500">
              <span className="font-bold text-slate-800">{targetCompletedCount}</span> of{' '}
              <span className="font-bold text-slate-800">{targetTasksForRate.length}</span> tasks
              completed
            </p>
            <p className="text-[11px] text-slate-400 pt-1">
              {completionRate === 100
                ? '🎉 Excellent work! All tasks checked off.'
                : completionRate >= 50
                ? '🔥 Over halfway through your goals!'
                : '💪 Ready to conquer your daily list?'}
            </p>
          </div>

          <CircularProgress percentage={completionRate} size={112} strokeWidth={9} />
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Tasks */}
        <div
          id="stat-total-tasks"
          className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total</span>
            <div className="p-1 rounded-md bg-slate-100 text-slate-600">
              <CheckSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalTasks}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">{todoTasks} to do</p>
        </div>

        {/* Active / In Progress */}
        <div
          id="stat-in-progress"
          className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active</span>
            <div className="p-1 rounded-md bg-indigo-50 text-indigo-600">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-600">{inProgressTasks}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">In progress & review</p>
        </div>

        {/* Completed */}
        <div
          id="stat-completed"
          className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Completed</span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{completedTasks}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% of all tasks
          </p>
        </div>

        {/* Overdue */}
        <div
          id="stat-overdue"
          className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Overdue</span>
            <div className="p-1 rounded-md bg-rose-50 text-rose-600">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600">{overdueTasks.length}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">Needs attention</p>
        </div>
      </div>

      {/* Main Section: Daily Task List with Add Task and All Tasks Shown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: The Interactive Daily Task List */}
        <div className="lg:col-span-2 space-y-4">
          <div
            id="daily-task-list-widget"
            className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
          >
            {/* Header & Tabs */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <ListTodo className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-tight">
                    Daily Task List
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {displayedDailyTasks.length} {activeTab === 'today' ? 'daily' : activeTab} task
                    {displayedDailyTasks.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  id="tab-today-tasks-btn"
                  type="button"
                  onClick={() => setActiveTab('today')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    activeTab === 'today'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Today ({todayTasks.length})
                </button>
                <button
                  id="tab-all-tasks-btn"
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    activeTab === 'all'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({tasks.length})
                </button>
                <button
                  id="tab-pending-tasks-btn"
                  type="button"
                  onClick={() => setActiveTab('pending')}
                  className={`hidden sm:block px-3 py-1 rounded-md font-semibold transition-all ${
                    activeTab === 'pending'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending
                </button>
                <button
                  id="tab-completed-tasks-btn"
                  type="button"
                  onClick={() => setActiveTab('completed')}
                  className={`hidden sm:block px-3 py-1 rounded-md font-semibold transition-all ${
                    activeTab === 'completed'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>

            {/* Quick Add Task Input Bar */}
            <div className="p-4 border-b border-slate-100 bg-white">
              <form onSubmit={handleQuickAddSubmit} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    id="quick-add-task-input"
                    type="text"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    placeholder="Add a new daily task... (Press Enter to save)"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium"
                  />
                </div>

                {/* Priority Selector */}
                <select
                  id="quick-add-priority-select"
                  value={quickPriority}
                  onChange={(e) => setQuickPriority(e.target.value as TaskPriority)}
                  className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-600"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>

                <button
                  id="quick-add-task-submit-btn"
                  type="submit"
                  disabled={!quickTitle.trim() || quickAdding}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>
            </div>

            {/* Task Items List */}
            <div className="divide-y divide-slate-100">
              {displayedDailyTasks.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">No tasks in this list</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    Type a task above or use the "New Task" button to add your daily goals.
                  </p>
                </div>
              ) : (
                displayedDailyTasks.map((task) => {
                  const isDone = task.status === 'COMPLETED';
                  const priority = priorityStyles[task.priority] || priorityStyles.MEDIUM;

                  return (
                    <div
                      key={task.id}
                      id={`daily-task-item-${task.id}`}
                      onClick={() => onTaskClick(task)}
                      className={`group p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        isDone ? 'bg-slate-50/40' : ''
                      }`}
                    >
                      {/* Checkbox & Title */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          id={`toggle-task-check-${task.id}`}
                          type="button"
                          onClick={(e) => handleToggleTaskStatus(task, e)}
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                            isDone
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                              : 'border border-slate-300 text-transparent hover:border-indigo-500 hover:text-indigo-400'
                          }`}
                          aria-label={isDone ? 'Mark as incomplete' : 'Mark as complete'}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p
                              className={`text-xs font-semibold truncate transition-all ${
                                isDone ? 'line-through text-slate-400' : 'text-slate-800'
                              }`}
                            >
                              {task.title}
                            </p>
                            {task.phase && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                <Layers className="w-2.5 h-2.5 text-indigo-500" />
                                <span>{task.phase}</span>
                              </span>
                            )}
                            {task.isPrivate || task.teamId === 'personal' ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium text-slate-500 bg-slate-100">
                                <Lock className="w-2.5 h-2.5 text-slate-400" />
                                <span>Private</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200">
                                <Users className="w-2.5 h-2.5 text-indigo-500" />
                                <span>{task.teamName || 'Team'}</span>
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Meta: Priority, Due Date, Delete */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Priority indicator */}
                        <span
                          className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 ${priority.label}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`}></span>
                          {task.priority.toLowerCase()}
                        </span>

                        {/* Due date badge */}
                        {task.dueDate && (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
                              task.dueDate === todayStr
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            {task.dueDate === todayStr ? 'Today' : task.dueDate}
                          </span>
                        )}

                        {/* Quick Delete */}
                        {onDeleteTask && (
                          <button
                            id={`delete-daily-task-${task.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTask(task);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-opacity"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* View Full List Footer */}
            <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                {completedTasks} completed &bull; {tasks.length - completedTasks} remaining
              </span>
              <button
                type="button"
                onClick={() => onNavigate('/tasks')}
                className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>Open All Tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Activity Log & Shortcuts */}
        <div className="space-y-4">
          {/* Quick Shortcuts */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Productivity Views
            </h3>
            <div className="space-y-2">
              <div
                onClick={() => onNavigate('/tasks?view=kanban')}
                className="p-3 rounded-xl border border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Kanban Board</h4>
                    <p className="text-[11px] text-slate-500">Visual workflow columns</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <div
                onClick={() => onNavigate('/calendar')}
                className="p-3 rounded-xl border border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Calendar View</h4>
                    <p className="text-[11px] text-slate-500">Day & week schedules</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Recent Activity Log */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <ActivityIcon className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recent Actions
              </h3>
            </div>

            {activities.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No recent activity recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 6).map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-2.5 text-xs pb-2 border-b border-slate-100 last:border-0 last:pb-0"
                  >
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-800 leading-snug">
                        <span className="font-semibold">{act.userName}</span>{' '}
                        <span className="text-slate-600">{act.details}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
