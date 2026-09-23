import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  CheckCircle2,
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '../../types';

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onOpenCreateTaskWithDate: (dateStr: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  onTaskClick,
  onOpenCreateTaskWithDate,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Map tasks to dates YYYY-MM-DD
  const tasksByDate = new Map<string, Task[]>();
  tasks.forEach((t) => {
    if (t.dueDate) {
      const existing = tasksByDate.get(t.dueDate) || [];
      existing.push(t);
      tasksByDate.set(t.dueDate, existing);
    }
  });

  const getDayString = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const todayStr = getDayString(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate()
  );

  // Generate calendar grid cells (42 cells: 6 weeks)
  const calendarCells: {
    day: number;
    monthOffset: number; // -1 prev, 0 current, 1 next
    dateStr: string;
    isCurrentMonth: boolean;
  }[] = [];

  // Previous month padding
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonthIndex = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    calendarCells.push({
      day: d,
      monthOffset: -1,
      dateStr: getDayString(prevYear, prevMonthIndex, d),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({
      day: d,
      monthOffset: 0,
      dateStr: getDayString(year, month, d),
      isCurrentMonth: true,
    });
  }

  // Next month padding to fill out 35 or 42 cells
  const remaining = 42 - calendarCells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonthIndex = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    calendarCells.push({
      day: d,
      monthOffset: 1,
      dateStr: getDayString(nextYear, nextMonthIndex, d),
      isCurrentMonth: false,
    });
  }

  return (
    <div id="calendar-view-container" className="p-4 lg:p-6 space-y-4">
      {/* Header Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              {monthNames[month]} {year}
            </h2>
            <p className="text-xs text-slate-500">Scheduled task due dates</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="cal-today-btn"
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
            <button
              id="cal-prev-month-btn"
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-50 text-slate-600 transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-200" />
            <button
              id="cal-next-month-btn"
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-50 text-slate-600 transition-colors"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/75 text-center py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Day Cells Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {calendarCells.map((cell, idx) => {
            const dayTasks = tasksByDate.get(cell.dateStr) || [];
            const isToday = cell.dateStr === todayStr;

            return (
              <div
                key={idx}
                id={`calendar-cell-${cell.dateStr}`}
                className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors group relative ${
                  cell.isCurrentMonth ? 'bg-white hover:bg-indigo-50/20' : 'bg-slate-50/50'
                }`}
                onClick={() => onOpenCreateTaskWithDate(cell.dateStr)}
              >
                {/* Cell Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-indigo-600 text-white font-bold'
                        : cell.isCurrentMonth
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {cell.day}
                  </span>

                  <button
                    type="button"
                    title="Add task on this day"
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCreateTaskWithDate(cell.dateStr);
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Day Tasks List */}
                <div className="space-y-1 my-1 overflow-y-auto max-h-[85px]">
                  {dayTasks.map((t) => {
                    const isDone = t.status === 'COMPLETED';
                    return (
                      <div
                        key={t.id}
                        id={`cal-task-${t.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskClick(t);
                        }}
                        className={`px-1.5 py-1 rounded text-[10px] font-medium truncate flex items-center gap-1 cursor-pointer transition-all border ${
                          isDone
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 line-through opacity-75'
                            : t.priority === 'URGENT'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        }`}
                        title={t.title}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isDone
                              ? 'bg-emerald-500'
                              : t.priority === 'URGENT'
                              ? 'bg-rose-500'
                              : 'bg-indigo-500'
                          }`}
                        />
                        <span className="truncate">{t.title}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[9px] text-slate-400 text-right">
                  {dayTasks.length > 0 && `${dayTasks.length} task${dayTasks.length > 1 ? 's' : ''}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
