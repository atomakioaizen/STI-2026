import React, { useState } from 'react';
import { ShieldAlert, ChevronDown, ChevronUp, Clock, UserCheck, AlertCircle, Calendar } from 'lucide-react';
import { getSupervisorInactivityList } from '@/lib/taskHelpers';

export default function SupervisorResponsivenessModal({ isOpen, onClose, tasks = [], users = [], user }) {
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedSpecificDate, setSelectedSpecificDate] = useState('');
  const [expandedSupervisorId, setExpandedSupervisorId] = useState(null);

  if (!isOpen) return null;

  const months = [
    { label: 'All Months', value: 'ALL' },
    { label: 'January', value: '0' },
    { label: 'February', value: '1' },
    { label: 'March', value: '2' },
    { label: 'April', value: '3' },
    { label: 'May', value: '4' },
    { label: 'June', value: '5' },
    { label: 'July', value: '6' },
    { label: 'August', value: '7' },
    { label: 'September', value: '8' },
    { label: 'October', value: '9' },
    { label: 'November', value: '10' },
    { label: 'December', value: '11' }
  ];

  const years = ['ALL', '2024', '2025', '2026', '2027', '2028'];

  // Filter tasks based on selected Month, Year, and Specific Date
  const filteredTasks = tasks.filter(t => {
    const taskDateStr = t.updatedAt || t.entryDate || t.createdAt;
    if (!taskDateStr) return true;
    const taskDate = new Date(taskDateStr);

    // Specific Date filter
    if (selectedSpecificDate) {
      const selDate = new Date(selectedSpecificDate);
      if (taskDate.toDateString() !== selDate.toDateString()) return false;
    }

    // Month filter
    if (selectedMonth !== 'ALL') {
      if (taskDate.getMonth() !== parseInt(selectedMonth, 10)) return false;
    }

    // Year filter
    if (selectedYear !== 'ALL') {
      if (taskDate.getFullYear() !== parseInt(selectedYear, 10)) return false;
    }

    return true;
  });

  const allGroups = getSupervisorInactivityList(filteredTasks, users);
  const supervisorGroups = allGroups.filter(g => {
    if (user?.role === 'SECRETARY') {
      return g.supervisorRole === 'SCHOOL_ADMIN' || g.supervisorRole === 'PRINCIPAL' || g.supervisorRole === 'PROGRAM_HEAD';
    } else if (user?.role === 'SCHOOL_ADMIN') {
      return g.supervisorRole === 'PRINCIPAL' || g.supervisorRole === 'PROGRAM_HEAD';
    } else if (user?.role === 'PRINCIPAL') {
      return g.supervisorRole === 'PROGRAM_HEAD';
    }
    return true;
  });

  const totalUnactedCount = supervisorGroups.reduce((acc, g) => acc + g.unactedCount, 0);

  const toggleExpand = (supId) => {
    setExpandedSupervisorId(prev => prev === supId ? null : supId);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-zinc-100 px-6 py-4 flex-shrink-0 bg-purple-50/60">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 text-purple-900">
              <ShieldAlert className="h-6 w-6 text-purple-700" />
              Supervisor Responsiveness &amp; Inactivity Tracker
            </h3>
            <p className="text-xs text-zinc-500 font-semibold mt-1">
              {user?.role === 'SECRETARY'
                ? 'Secretary Monitoring View: Track pending unacted submissions for School Administrator, Principals, and Program Heads.'
                : user?.role === 'PRINCIPAL'
                ? 'Principal Executive View: Inspect Program Heads with pending unacted submissions.'
                : 'School Administrator Executive View: Inspect Program Heads and Principals with pending unacted submissions.'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
          >
            Close ✕
          </button>
        </div>

        {/* Filter Controls & Summary Bar */}
        <div className="bg-zinc-50 border-b border-zinc-100 p-4 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Date Filters:</span>
            
            {/* Month Filter Dropdown */}
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-white border border-zinc-300 rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-800 shadow-xs focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              {months.map(m => (
                <option key={`m-${m.value}`} value={m.value}>{m.label}</option>
              ))}
            </select>

            {/* Year Filter Dropdown */}
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-white border border-zinc-300 rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-800 shadow-xs focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              {years.map(y => (
                <option key={`y-${y}`} value={y}>{y === 'ALL' ? 'All Years' : y}</option>
              ))}
            </select>

            {/* Specific Date Picker Input */}
            <div className="flex items-center gap-1 bg-white border border-zinc-300 rounded-lg px-2 py-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Exact Date:</span>
              <input
                type="date"
                value={selectedSpecificDate}
                onChange={e => setSelectedSpecificDate(e.target.value)}
                className="text-xs font-bold text-zinc-800 focus:outline-none bg-transparent cursor-pointer"
              />
              {selectedSpecificDate && (
                <button 
                  onClick={() => setSelectedSpecificDate('')}
                  className="text-[10px] text-zinc-400 hover:text-zinc-700 font-bold ml-1"
                  title="Clear Date"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="bg-purple-100 text-purple-900 border border-purple-200 px-3 py-1.5 rounded-xl font-black text-xs">
            Total Unacted Submissions: <span className="text-purple-700 text-sm font-black">{totalUnactedCount}</span>
          </div>
        </div>

        {/* Supervisor List (Collapsible Accordion) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-3">
          {supervisorGroups.length === 0 ? (
            <div className="text-center py-16 text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-xl">
              <UserCheck className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-zinc-700">100% Supervisor Responsiveness!</p>
              <p className="text-xs text-zinc-400 mt-1">All supervisors have acted on submissions promptly.</p>
            </div>
          ) : (
            supervisorGroups.map(group => {
              const isExpanded = expandedSupervisorId === group.supervisorId;

              return (
                <div 
                  key={`sup-group-${group.supervisorId}`}
                  className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs transition"
                >
                  {/* Supervisor Accordion Header */}
                  <div 
                    onClick={() => toggleExpand(group.supervisorId)}
                    className="p-4 bg-zinc-50 hover:bg-zinc-100/80 cursor-pointer flex items-center justify-between transition select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-zinc-900 text-sm">{group.supervisorName}</h4>
                          <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
                            {group.supervisorRole === 'SCHOOL_ADMIN' ? 'School Administrator' : group.supervisorRole === 'PRINCIPAL' ? 'Principal' : 'Program Head'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 font-semibold mt-0.5">
                          Department: <span className="text-zinc-800">{group.departmentName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                        group.unactedCount > 0 
                          ? 'bg-red-100 text-red-800 border-red-200' 
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}>
                        {group.unactedCount} Unacted Submissions
                      </span>
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-zinc-400" /> : <ChevronDown className="h-5 w-5 text-zinc-400" />}
                    </div>
                  </div>

                  {/* Expanded Task Breakdown */}
                  {isExpanded && (
                    <div className="p-4 border-t border-zinc-200 bg-white space-y-2">
                      <p className="text-xs font-extrabold text-zinc-500 uppercase tracking-wider mb-2">
                        Submissions Awaiting Action from {group.supervisorName}:
                      </p>
                      {group.tasks.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic py-2">No unacted submissions pending for this supervisor.</p>
                      ) : (
                        <div className="divide-y divide-zinc-100">
                          {group.tasks.map(t => (
                            <div key={`unacted-task-${t.id}`} className="py-2.5 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                              <div>
                                <span className="bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded font-bold text-[9px] uppercase">
                                  {t.category}
                                </span>
                                <p className="font-bold text-zinc-800 text-xs mt-1">{t.taskDescription}</p>
                                <p className="text-[11px] text-zinc-500 mt-0.5">
                                  Submitted by: <span className="font-bold text-zinc-700">{t.user?.name || 'Staff'}</span>
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-black text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-md flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" /> {t.pendingHours} hrs pending ({t.pendingDays} days)
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
