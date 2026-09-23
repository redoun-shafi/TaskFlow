import React, { useState } from 'react';
import {
  Calendar,
  AlertTriangle,
  MoreVertical,
  CheckCircle2,
  Circle,
  Clock,
  Filter,
  ArrowUpDown,
  Search,
  Plus,
  Lock,
  Users,
  Layers,
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { getPriorityBadge, getStatusBadge } from './TaskCard';

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onOpenCreateTask: () => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onDeleteTask: (task: Task) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onTaskClick,
  onOpenCreateTask,
  onStatusChange,
  onDeleteTask,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [phaseFilter, setPhaseFilter] = useState<string>('ALL');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'dueDate' | 'priority' | 'title' | 'createdAt'>('createdAt');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Extract all unique phases from tasks
  const allPhases = Array.from(
    new Set(tasks.map((t) => t.phase).filter((p): p is string => Boolean(p && p.trim())))
  );

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (phaseFilter !== 'ALL') {
      if (phaseFilter === 'NONE' && t.phase) return false;
      if (phaseFilter !== 'NONE' && t.phase !== phaseFilter) return false;
    }
    if (visibilityFilter !== 'ALL') {
      const isPriv = t.isPrivate !== false && (t.teamId === 'personal' || !t.teamId || t.isPrivate === true);
      if (visibilityFilter === 'PRIVATE' && !isPriv) return false;
      if (visibilityFilter === 'SHARED' && isPriv) return false;
    }
    return true;
  });

  const priorityWeight: Record<TaskPriority, number> = {
    URGENT: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let diff = 0;
    if (sortField === 'dueDate') {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 9999999999999;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 9999999999999;
      diff = dateA - dateB;
    } else if (sortField === 'priority') {
      diff = priorityWeight[b.priority] - priorityWeight[a.priority];
    } else if (sortField === 'title') {
      diff = a.title.localeCompare(b.title);
    } else {
      const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      diff = tA - tB;
    }
    return sortAsc ? diff : -diff;
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    phaseFilter !== 'ALL' ||
    visibilityFilter !== 'ALL';

  return (
    <div id="task-list-view" className="p-4 lg:p-6 space-y-4">
      {/* Filter and Control Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Visibility filter */}
          <select
            id="filter-visibility-select"
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Visibility</option>
            <option value="PRIVATE">🔒 Private Only</option>
            <option value="SHARED">👥 Shared with Team</option>
          </select>

          {/* Phase filter */}
          <select
            id="filter-phase-select"
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Phases</option>
            {allPhases.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            <option value="NONE">No Phase</option>
          </select>

          {/* Status filter */}
          <select
            id="filter-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REVIEW">In Review</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Priority filter */}
          <select
            id="filter-priority-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {hasActiveFilters && (
            <button
              id="clear-filters-btn"
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setPriorityFilter('ALL');
                setPhaseFilter('ALL');
                setVisibilityFilter('ALL');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            id="list-add-task-btn"
            type="button"
            onClick={onOpenCreateTask}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Tasks Table / Scannable Rows */}
      {sortedTasks.length === 0 ? (
        <div
          id="task-list-empty-state"
          className="bg-white rounded-xl border border-slate-200 p-12 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">No tasks found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {tasks.length === 0
              ? 'Get started by creating your first task.'
              : 'Try clearing your filters or changing your criteria.'}
          </p>
          <button
            id="empty-create-task-btn"
            type="button"
            onClick={onOpenCreateTask}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Status</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-slate-800"
                    onClick={() => toggleSort('title')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Task Title</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 w-32">Phase</th>
                  <th className="py-3 px-4 w-28">Visibility</th>
                  <th
                    className="py-3 px-4 w-24 cursor-pointer hover:text-slate-800"
                    onClick={() => toggleSort('priority')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Priority</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 w-36">Assignee</th>
                  <th
                    className="py-3 px-4 w-28 cursor-pointer hover:text-slate-800"
                    onClick={() => toggleSort('dueDate')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Due Date</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 w-16 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedTasks.map((task) => {
                  const pBadge = getPriorityBadge(task.priority);
                  const isCompleted = task.status === 'COMPLETED';
                  const isOverdue =
                    task.dueDate &&
                    !isCompleted &&
                    new Date(task.dueDate).setHours(23, 59, 59, 999) < Date.now();
                  const isPrivate =
                    task.isPrivate !== false &&
                    (task.teamId === 'personal' || !task.teamId || task.isPrivate === true);

                  return (
                    <tr
                      key={task.id}
                      id={`task-row-${task.id}`}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => onTaskClick(task)}
                    >
                      {/* Status Toggle Checkbox */}
                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(
                            task.id,
                            isCompleted ? 'TODO' : 'COMPLETED'
                          );
                        }}
                      >
                        <button
                          type="button"
                          className="text-slate-400 hover:text-emerald-600 transition-colors"
                          title={isCompleted ? 'Mark incomplete' : 'Mark completed'}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Title & Labels */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors ${
                              isCompleted ? 'line-through text-slate-400' : ''
                            }`}
                          >
                            {task.title}
                          </span>
                          {task.labels && task.labels.length > 0 && (
                            <div className="hidden sm:flex items-center gap-1">
                              {task.labels.slice(0, 2).map((l, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600"
                                >
                                  {l}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Phase */}
                      <td className="py-3 px-4">
                        {task.phase ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/70 truncate max-w-[130px]">
                            <Layers className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                            <span className="truncate">{task.phase}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Visibility / Team */}
                      <td className="py-3 px-4">
                        {isPrivate ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200">
                            <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            <span>Private</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 truncate max-w-[110px]">
                            <Users className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                            <span className="truncate">{task.teamName || 'Team'}</span>
                          </span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${pBadge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${pBadge.dot}`}></span>
                          {pBadge.label}
                        </span>
                      </td>

                      {/* Assignee */}
                      <td className="py-3 px-4">
                        {task.assigneeName ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[9px] flex items-center justify-center shrink-0">
                              {task.assigneeName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-slate-700 truncate max-w-[110px]">
                              {task.assigneeName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Unassigned</span>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-4">
                        {task.dueDate ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                              isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-600'
                            }`}
                          >
                            {isOverdue && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                            {task.dueDate}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors text-[11px]"
                          title="Delete task"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
