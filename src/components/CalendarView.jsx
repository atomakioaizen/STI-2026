"use client";

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function CalendarView({ tasks, onClose }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayTasks, setSelectedDayTasks] = useState(null);
  const [selectedDayStr, setSelectedDayStr] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper: Get tasks due on a specific date
  const getTasksForDate = (date) => {
    return tasks.filter(task => {
      if (!task.targetDate) return false;
      const target = new Date(task.targetDate);
      return (
        target.getDate() === date.getDate() &&
        target.getMonth() === date.getMonth() &&
        target.getFullYear() === date.getFullYear()
      );
    });
  };

  // Helper: Check if date has tasks with specific statuses
  const getStatusCounts = (dayTasks) => {
    const counts = { completed: 0, ongoing: 0, delayed: 0 };
    dayTasks.forEach(t => {
      if (t.status === 'Completed') counts.completed++;
      else if (t.status === 'Delayed') counts.delayed++;
      else counts.ongoing++;
    });
    return counts;
  };

  // Generate calendar days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  
  const daysArray = [];
  
  // Fill in blanks for previous month
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  
  // Fill in current month days
  for (let i = 1; i <= lastDay; i++) {
    daysArray.push(new Date(year, month, i));
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayTasks(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayTasks(null);
  };

  const handleDayClick = (dayDate) => {
    if (!dayDate) return;
    const dayTasks = getTasksForDate(dayDate);
    setSelectedDayTasks(dayTasks);
    setSelectedDayStr(dayDate.toLocaleDateString('en-US', { dateStyle: 'long' }));
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 max-w-4xl w-full mx-auto animate-scaleIn text-zinc-900">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2 text-zinc-800">
          <CalendarIcon className="h-6 w-6 text-blue-600" />
          Task Deadline Calendar
        </h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            Close Calendar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Calendar Grid */}
        <div className="md:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <span className="font-extrabold text-lg text-zinc-800">
              {monthNames[month]} {year}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={handlePrevMonth}
                className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-semibold text-zinc-500 text-xs uppercase tracking-wider mb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {daysArray.map((dayDate, index) => {
              if (!dayDate) {
                return <div key={`empty-${index}`} className="aspect-square bg-zinc-50/50 rounded-lg border border-zinc-100/50" />;
              }

              const dayTasks = getTasksForDate(dayDate);
              const hasTasks = dayTasks.length > 0;
              const { completed, ongoing, delayed } = getStatusCounts(dayTasks);
              
              const isToday = new Date().toDateString() === dayDate.toDateString();

              return (
                <button
                  key={`day-${index}`}
                  onClick={() => handleDayClick(dayDate)}
                  className={`aspect-square rounded-lg border flex flex-col items-center justify-between p-1 transition relative group ${
                    isToday 
                      ? 'border-blue-600 bg-blue-50/50 font-bold' 
                      : 'border-zinc-200 bg-white hover:bg-zinc-50'
                  }`}
                >
                  <span className={`text-xs ${isToday ? 'text-blue-700' : 'text-zinc-700'}`}>{dayDate.getDate()}</span>
                  
                  {/* Indicators for tasks */}
                  {hasTasks && (
                    <div className="flex gap-0.5 justify-center w-full mt-1">
                      {delayed > 0 && <span className="h-1.5 w-1.5 rounded-full bg-red-500" title={`${delayed} Delayed`} />}
                      {ongoing > 0 && <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" title={`${ongoing} Ongoing`} />}
                      {completed > 0 && <span className="h-1.5 w-1.5 rounded-full bg-green-500" title={`${completed} Completed`} />}
                    </div>
                  )}

                  {/* Hover count helper */}
                  {hasTasks && (
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 bg-zinc-800 text-white text-[9px] px-1.5 py-0.5 rounded shadow pointer-events-none transition duration-150 z-20 whitespace-nowrap">
                      {dayTasks.length} task(s) due
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details Panel */}
        <div className="md:col-span-2 border-t md:border-t-0 md:border-l border-zinc-100 md:pl-6 pt-4 md:pt-0">
          <h4 className="font-bold text-zinc-700 text-sm tracking-wide mb-3 uppercase">
            Deadlines on this Day
          </h4>
          
          {selectedDayTasks === null ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-400 bg-zinc-50 rounded-xl p-4 border border-zinc-100">
              <CalendarIcon className="h-8 w-8 text-zinc-300 mb-2" />
              <p className="text-xs">Click a date on the calendar to inspect task deadlines.</p>
            </div>
          ) : selectedDayTasks.length === 0 ? (
            <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100 text-center text-zinc-500 h-48 flex items-center justify-center">
              <div>
                <p className="text-xs font-semibold text-zinc-600 mb-1">{selectedDayStr}</p>
                <p className="text-xs">No task deadlines scheduled for this date.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              <p className="text-xs font-bold text-zinc-600 border-b border-zinc-100 pb-1">{selectedDayStr}</p>
              {selectedDayTasks.map(t => {
                const getStatusColor = (status) => {
                  if (status === 'Completed') return 'bg-green-100 text-green-800 border-green-200';
                  if (status === 'Delayed') return 'bg-red-100 text-red-800 border-red-200';
                  if (status === 'Ongoing') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                  return 'bg-zinc-100 text-zinc-800 border-zinc-200';
                };

                return (
                  <div key={t.id} className="p-3 bg-white border border-zinc-200 rounded-xl shadow-sm text-left hover:border-zinc-300 transition">
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <span className="font-bold text-xs text-zinc-800 line-clamp-1">{t.category}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getStatusColor(t.status)}`}>
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 line-clamp-2 mb-2 font-medium">{t.taskDescription}</p>
                    <div className="flex justify-between items-center text-[10px] text-zinc-400 font-semibold">
                      <span>Owner: {t.user?.name || 'Staff'}</span>
                      <span className="bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">Priority: {t.priority}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
