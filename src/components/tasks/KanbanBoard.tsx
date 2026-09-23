import React from 'react';
import { Plus, CheckCircle2, Clock, Eye, ListTodo } from 'lucide-react';
import { Task, TaskStatus } from '../../types';
import { TaskCard } from './TaskCard';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onQuickAddTask: (status: TaskStatus) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

interface ColumnConfig {
  id: TaskStatus;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  headerColor: string;
  badgeBg: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'TODO',
    title: 'To Do',
    icon: ListTodo,
    headerColor: 'text-slate-700',
    badgeBg: 'bg-slate-200 text-slate-700',
  },
  {
    id: 'IN_PROGRESS',
    title: 'In Progress',
    icon: Clock,
    headerColor: 'text-indigo-700',
    badgeBg: 'bg-indigo-100 text-indigo-700',
  },
  {
    id: 'REVIEW',
    title: 'In Review',
    icon: Eye,
    headerColor: 'text-purple-700',
    badgeBg: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'COMPLETED',
    title: 'Completed',
    icon: CheckCircle2,
    headerColor: 'text-emerald-700',
    badgeBg: 'bg-emerald-100 text-emerald-700',
  },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onTaskClick,
  onQuickAddTask,
  onStatusChange,
}) => {
  const getTasksForColumn = (status: TaskStatus) => {
    return tasks.filter((t) => t.status === status);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onStatusChange(taskId, targetStatus);
    }
  };

  return (
    <div
      id="kanban-board-container"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 p-4 lg:p-6 min-h-[calc(100vh-8rem)] items-start overflow-x-auto"
    >
      {COLUMNS.map((col) => {
        const colTasks = getTasksForColumn(col.id);
        const Icon = col.icon;

        return (
          <div
            key={col.id}
            id={`kanban-column-${col.id.toLowerCase()}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className="bg-slate-100/70 border border-slate-200/80 rounded-xl flex flex-col p-3.5 min-w-[280px] h-full min-h-[450px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${col.headerColor}`} />
                <h3 className={`text-xs font-bold uppercase tracking-wider ${col.headerColor}`}>
                  {col.title}
                </h3>
                <span
                  id={`column-count-${col.id.toLowerCase()}`}
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${col.badgeBg}`}
                >
                  {colTasks.length}
                </span>
              </div>

              <button
                id={`quick-add-${col.id.toLowerCase()}-btn`}
                type="button"
                onClick={() => onQuickAddTask(col.id)}
                className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-white transition-colors"
                title={`Add task to ${col.title}`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Task Cards Column */}
            <div className="flex-1 space-y-2.5 overflow-y-auto min-h-[100px]">
              {colTasks.length === 0 ? (
                <div className="h-32 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center p-4 text-center">
                  <p className="text-xs text-slate-400 font-medium">No tasks</p>
                  <button
                    type="button"
                    onClick={() => onQuickAddTask(col.id)}
                    className="mt-1 text-[11px] text-indigo-600 font-semibold hover:underline"
                  >
                    + Add task
                  </button>
                </div>
              ) : (
                colTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', task.id);
                    }}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <TaskCard
                      task={task}
                      onClick={() => onTaskClick(task)}
                      onStatusChange={(newStatus) => onStatusChange(task.id, newStatus)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
