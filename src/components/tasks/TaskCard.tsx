import React from 'react';
import {
  Calendar,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  MoreVertical,
  Lock,
  Users,
  Layers,
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '../../types';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onStatusChange?: (newStatus: TaskStatus) => void;
}

export const getPriorityBadge = (priority: TaskPriority) => {
  switch (priority) {
    case 'URGENT':
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        label: 'Urgent',
      };
    case 'HIGH':
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        label: 'High',
      };
    case 'MEDIUM':
      return {
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
        label: 'Medium',
      };
    case 'LOW':
    default:
      return {
        bg: 'bg-slate-50 text-slate-600 border-slate-200',
        dot: 'bg-slate-400',
        label: 'Low',
      };
  }
};

export const getStatusBadge = (status: TaskStatus) => {
  switch (status) {
    case 'COMPLETED':
      return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Completed' };
    case 'REVIEW':
      return { bg: 'bg-purple-50 text-purple-700 border-purple-200', label: 'In Review' };
    case 'IN_PROGRESS':
      return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'In Progress' };
    case 'TODO':
    default:
      return { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: 'To Do' };
  }
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onStatusChange }) => {
  const pBadge = getPriorityBadge(task.priority);
  const isOverdue =
    task.dueDate &&
    task.status !== 'COMPLETED' &&
    new Date(task.dueDate).setHours(23, 59, 59, 999) < Date.now();

  const isPrivate =
    task.isPrivate !== false &&
    (task.teamId === 'personal' || !task.teamId || task.isPrivate === true);

  return (
    <div
      id={`task-card-${task.id}`}
      onClick={onClick}
      className="group bg-white rounded-xl border border-slate-200/80 p-3.5 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer relative"
    >
      {/* Top Row: Priority & Visibility Pill */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${pBadge.bg}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${pBadge.dot}`}></span>
          {pBadge.label}
        </span>

        {/* Visibility indicator: Private vs Team */}
        {isPrivate ? (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200/60"
            title="Private Task (Only visible to you)"
          >
            <Lock className="w-2.5 h-2.5 text-slate-400" />
            <span>Private</span>
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/70 truncate max-w-[130px]"
            title={`Shared with ${task.teamName || 'Team'}`}
          >
            <Users className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
            <span className="truncate">{task.teamName || 'Team'}</span>
          </span>
        )}
      </div>

      {/* Phase Badge if present */}
      {task.phase && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50/70 text-indigo-700 border border-indigo-200/60">
            <Layers className="w-3 h-3 text-indigo-500 shrink-0" />
            <span className="truncate max-w-[190px]">{task.phase}</span>
          </span>
        </div>
      )}

      {/* Title */}
      <h4
        className={`text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-1.5 ${
          task.status === 'COMPLETED' ? 'line-through text-slate-400' : ''
        }`}
      >
        {task.title}
      </h4>

      {/* Description Snippet */}
      {task.description && (
        <p className="text-[11px] text-slate-500 line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {/* Labels row if any */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex items-center gap-1 overflow-hidden mb-2.5">
          {task.labels.slice(0, 2).map((lbl, idx) => (
            <span
              key={idx}
              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 max-w-[80px] truncate"
            >
              {lbl}
            </span>
          ))}
          {task.labels.length > 2 && (
            <span className="text-[10px] text-slate-400 font-medium">
              +{task.labels.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Footer Meta Row */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto text-[11px] text-slate-500">
        {/* Due Date Indicator */}
        {task.dueDate ? (
          <div
            className={`flex items-center gap-1 font-medium ${
              isOverdue ? 'text-rose-600' : 'text-slate-500'
            }`}
          >
            {isOverdue ? (
              <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
            ) : (
              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
            )}
            <span className="text-[10px]">{task.dueDate}</span>
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2.5">
          {/* Attachments & Comments counters */}
          {task.attachments && task.attachments.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Paperclip className="w-3 h-3" />
              {task.attachments.length}
            </span>
          )}

          {/* Assignee Avatar */}
          {task.assigneeName ? (
            <div
              className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[9px] flex items-center justify-center border border-white shadow-xs"
              title={`Assigned to ${task.assigneeName}`}
            >
              {task.assigneeName.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div
              className="w-5 h-5 rounded-full border border-dashed border-slate-300 text-slate-400 text-[9px] flex items-center justify-center"
              title="Unassigned"
            >
              -
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
