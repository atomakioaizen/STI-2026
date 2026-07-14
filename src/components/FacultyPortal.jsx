"use client";

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, AlertTriangle, TrendingUp, 
  PlusCircle, Calendar, List, Search, Plus, 
  Trash2, ExternalLink, RefreshCw, Archive, Bell, FileSpreadsheet
} from 'lucide-react';
import CalendarView from './CalendarView';
import SuperAlertModal from './SuperAlertModal';
import { exportTasksToExcel } from '@/lib/reports';

export default function FacultyPortal({ user }) {
  const [tasks, setTasks] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingArchive, setLoadingArchive] = useState(false);
  
  // Modals visibility
  const [activeModal, setActiveModal] = useState(null); // 'tasks' | 'calendar' | 'notifications' | 'archive' | 'nominate'
  const [showSuperAlert, setShowSuperAlert] = useState(true);

  // Filters for active tasks modal
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('targetDate');
  const [sortDirection, setSortDirection] = useState('asc');

  // Nomination Form State
  const [category, setCategory] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [nominationPeriod, setNominationPeriod] = useState('weekly'); 
  const [targetDate, setTargetDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [evidenceLink, setEvidenceLink] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit/Update Modal State
  const [editingTask, setEditingTask] = useState(null);
  const [editProgress, setEditProgress] = useState(0);
  const [editRemarks, setEditRemarks] = useState('');
  const [editEvidenceLink, setEditEvidenceLink] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchArchivedTasks();
  }, [statusFilter, priorityFilter]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const url = new URL('/api/tasks', window.location.origin);
      url.searchParams.append('archived', 'false');
      if (statusFilter !== 'All') url.searchParams.append('status', statusFilter);
      if (priorityFilter !== 'All') url.searchParams.append('priority', priorityFilter);
      if (searchQuery.trim() !== '') url.searchParams.append('search', searchQuery);
      
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchArchivedTasks() {
    setLoadingArchive(true);
    try {
      const url = new URL('/api/tasks', window.location.origin);
      url.searchParams.append('archived', 'true');
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setArchivedTasks(data.tasks);
      }
    } catch (err) {
      console.error('Error fetching archived tasks:', err);
    } finally {
      setLoadingArchive(false);
    }
  }

  const handleExport = (timeframe) => {
    const now = new Date();
    let filtered = [...tasks, ...archivedTasks];
    let title = `${user.name} Tasks Report`;

    if (timeframe === 'weekly') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      filtered = filtered.filter(t => new Date(t.entryDate || t.createdAt) >= oneWeekAgo);
      title = `${user.name} Weekly Tasks Report`;
    } else if (timeframe === 'monthly') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      filtered = filtered.filter(t => new Date(t.entryDate || t.createdAt) >= oneMonthAgo);
      title = `${user.name} Monthly Tasks Report`;
    } else if (timeframe === 'yearly') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      filtered = filtered.filter(t => new Date(t.entryDate || t.createdAt) >= oneYearAgo);
      title = `${user.name} Yearly Tasks Report`;
    }

    exportTasksToExcel(filtered, title);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTasks();
  };

  // Auto-calculate target date based on nomination period
  useEffect(() => {
    const now = new Date();
    if (nominationPeriod === 'weekly') {
      const day = now.getDay();
      const diff = 6 - day; 
      const saturday = new Date(now);
      saturday.setDate(now.getDate() + diff);
      setTargetDate(saturday.toISOString().split('T')[0]);
    } else if (nominationPeriod === 'monthly') {
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setTargetDate(endOfMonth.toISOString().split('T')[0]);
    } else if (nominationPeriod === 'yearly') {
      const endOfYear = new Date(now.getFullYear(), 11, 31);
      setTargetDate(endOfYear.toISOString().split('T')[0]);
    } else if (nominationPeriod === 'custom') {
      setTargetDate('');
    }
  }, [nominationPeriod]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!category.trim() || !taskDescription.trim() || !priority) {
      setFormError('Please fill in Category, Task Description and Priority.');
      return;
    }

    setFormError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: category.trim(),
          taskDescription: taskDescription.trim(),
          priority,
          targetDate: targetDate ? new Date(targetDate).toISOString() : null,
          progress: 0,
          remarks: remarks.trim(),
          evidenceLink: evidenceLink.trim()
        })
      });

      if (res.ok) {
        setCategory('');
        setTaskDescription('');
        setRemarks('');
        setEvidenceLink('');
        setActiveModal(null);
        fetchTasks();
      } else {
        const data = await res.json();
        setFormError(data.error || 'Failed to nominate task.');
      }
    } catch (err) {
      setFormError('Connection error. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setEditProgress(task.progress);
    setEditRemarks(task.remarks || '');
    setEditEvidenceLink(task.evidenceLink || '');
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress: editProgress,
          remarks: editRemarks.trim(),
          evidenceLink: editEvidenceLink.trim()
        })
      });

      if (res.ok) {
        setEditingTask(null);
        fetchTasks();
        fetchArchivedTasks();
      }
    } catch (err) {
      console.error('Error updating task', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleQuickComplete = async (taskId) => {
    if (!confirm('Request completion approval from your head?\nThis will set the task to 100% and notify your supervisor.')) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: 100 })
      });
      if (res.ok) {
        fetchTasks();
        fetchArchivedTasks();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to request completion.');
      }
    } catch (err) {
      console.error('Error requesting completion', err);
    }
  };

  const handleRequestDeletion = async (taskId) => {
    if (!confirm('Are you sure you want to request deletion of this task nomination?')) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Awaiting Deletion' })
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Error requesting deletion', err);
    }
  };

  const handleRestoreTask = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false, status: 'Ongoing', progress: 90 })
      });
      if (res.ok) {
        fetchTasks();
        fetchArchivedTasks();
      }
    } catch (err) {
      console.error('Error restoring task', err);
    }
  };

  // Metrics (Active only)
  const totalTasks = tasks.length;
  const ongoingTasks = tasks.filter(t => t.status === 'Ongoing').length;
  const delayedTasks = tasks.filter(t => t.status === 'Delayed').length;
  const awaitingApprovalTasks = tasks.filter(t => t.status === 'Awaiting Approval').length;
  const completedCount = archivedTasks.length;

  return (
    <div className="space-y-8 animate-fadeIn text-zinc-950">
      
      {/* Super Warning alert popup if urgent */}
      {showSuperAlert && (
        <SuperAlertModal 
          tasks={tasks} 
          onClose={() => setShowSuperAlert(false)} 
        />
      )}

      {/* Greeting Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-zinc-900">Mabuhay, {user.name}!</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">
            Simpleng portal para sa faculty at staff. Mag-nominate ng tasks at i-update ang progress nang madali.
          </p>
        </div>
        <button
          onClick={() => setActiveModal('nominate')}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 shadow transition-all duration-200 active:scale-95 text-sm"
        >
          <Plus className="h-4 w-4" />
          Nominate Task
        </button>
      </div>

      {/* Dashboard Modular Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Active Tasks */}
        <button
          onClick={() => setActiveModal('tasks')}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 text-left shadow-sm transition group"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition">
              <List className="h-6 w-6 text-blue-600" />
            </div>
            {delayedTasks > 0 && (
              <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-red-200">
                {delayedTasks} Delayed
              </span>
            )}
          </div>
          <h3 className="mt-4 font-black text-lg text-zinc-900 group-hover:text-blue-600 transition">
            My Active Tasks
          </h3>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            {totalTasks} active tasks, {ongoingTasks} ongoing, {awaitingApprovalTasks} pending approval.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-600">
            Open List →
          </span>
        </button>
        {/* Card 2: Calendar */}
        <button
          onClick={() => document.getElementById('floating-calendar-trigger')?.click()}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 text-left shadow-sm transition group"
        >
          <div className="p-3 bg-yellow-50 rounded-xl group-hover:bg-yellow-100 transition inline-block">
            <Calendar className="h-6 w-6 text-yellow-600" />
          </div>
          <h3 className="mt-4 font-black text-lg text-zinc-900 group-hover:text-yellow-600 transition">
            Built-in Calendar
          </h3>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Check all deadlines scheduled on a monthly map. Don't miss dates!
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-yellow-600">
            Open Interactive Calendar →
          </span>
        </button>

        {/* Card 3: Notifications Alert Centre */}
        <button
          onClick={() => setActiveModal('notifications')}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 text-left shadow-sm transition group"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-red-50 rounded-xl group-hover:bg-red-100 transition">
              <Bell className="h-6 w-6 text-red-600" />
            </div>
            {delayedTasks > 0 && (
              <span className="h-3.5 w-3.5 rounded-full bg-red-600 animate-ping" />
            )}
          </div>
          <h3 className="mt-4 font-black text-lg text-zinc-900 group-hover:text-red-600 transition">
            Important Alerts
          </h3>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Check warnings, pending actions, and urgent task notices.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-red-600">
            Open Alerts →
          </span>
        </button>

        {/* Card 4: Archive */}
        <button
          onClick={() => setActiveModal('archive')}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 text-left shadow-sm transition group"
        >
          <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition inline-block">
            <Archive className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="mt-4 font-black text-lg text-zinc-900 group-hover:text-purple-600 transition">
            Completed Archive
          </h3>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            {completedCount} archived tasks. Locked accomplishments.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-purple-600">
            View Archive →
          </span>
        </button>
      </div>

      {/* Hidden trigger for calendar modal */}
      <button id="floating-calendar-trigger" onClick={() => setActiveModal('calendar')} className="hidden" />

      {/* Active Tasks Modal */}
      {activeModal === 'tasks' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-5xl w-full h-[85vh] flex flex-col animate-scaleIn text-zinc-900 overflow-hidden">
            <div className="flex justify-between items-center border-b border-zinc-150 p-6 shrink-0">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <List className="h-5 w-5 text-blue-600" />
                My Active Tasks & Nominations
              </h3>
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleExport(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs font-bold text-zinc-705 focus:outline-none cursor-pointer"
                >
                  <option value="">📊 Export Excel Report</option>
                  <option value="weekly">Weekly Report</option>
                  <option value="monthly">Monthly Report</option>
                  <option value="yearly">Yearly Report</option>
                  <option value="all">All Tasks</option>
                </select>
                <button 
                  onClick={() => setActiveModal(null)}
                  className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              {/* Filter Bar */}
              <div className="flex flex-wrap items-center gap-3 mb-4 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 w-full justify-between">
                  <div className="relative flex-1 min-w-[200px]">
                    <input
                      type="text"
                      placeholder="Search category, task description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-8 pr-3 text-xs focus:border-zinc-300 focus:outline-none"
                    />
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs focus:outline-none"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Not Started">Not Started</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Awaiting Approval">Awaiting Approval</option>
                      <option value="Awaiting Deletion">Awaiting Deletion</option>
                      <option value="Delayed">Delayed</option>
                    </select>

                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs focus:outline-none"
                    >
                      <option value="All">All Priorities</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>

                    <button
                      type="button"
                      onClick={fetchTasks}
                      className="p-2 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-lg transition active:scale-95"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-zinc-600" />
                    </button>
                  </div>
                </form>
              </div>

              {/* Sorting Bar */}
              <div className="flex items-center gap-2 mb-3 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 text-xs text-blue-900">
                <span className="font-bold">Sort Tasks By:</span>
                <button
                  onClick={() => {
                    if (sortField === 'targetDate') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('targetDate');
                      setSortDirection('asc');
                    }
                  }}
                  className={`px-2.5 py-1 rounded font-bold border transition ${sortField === 'targetDate' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
                >
                  📅 Deadline Date {sortField === 'targetDate' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </button>
                <button
                  onClick={() => {
                    if (sortField === 'entryDate') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('entryDate');
                      setSortDirection('asc');
                    }
                  }}
                  className={`px-2.5 py-1 rounded font-bold border transition ${sortField === 'entryDate' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
                >
                  📅 Entry Date {sortField === 'entryDate' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </button>
                <button
                  onClick={() => {
                    if (sortField === 'priority') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('priority');
                      setSortDirection('asc');
                    }
                  }}
                  className={`px-2.5 py-1 rounded font-bold border transition ${sortField === 'priority' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
                >
                  ⚡ Priority {sortField === 'priority' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                </button>
              </div>

              {/* Table Area */}
              {loading ? (
                <div className="text-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto"></div>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-xl">
                  <p className="text-sm font-semibold">No active tasks found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-zinc-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Task Details</th>
                        <th className="py-3 px-4">Nominated</th>
                        <th className="py-3 px-4">Deadline</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Status & Progress</th>
                        <th className="py-3 px-4">Evidence</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-250">
                      {[...tasks].sort((a, b) => {
                        let aVal = a[sortField];
                        let bVal = b[sortField];
                        if (sortField === 'targetDate' || sortField === 'entryDate') {
                          aVal = aVal ? new Date(aVal).getTime() : Infinity;
                          bVal = bVal ? new Date(bVal).getTime() : Infinity;
                        } else {
                          aVal = aVal ? String(aVal).toLowerCase() : '';
                          bVal = bVal ? String(bVal).toLowerCase() : '';
                        }
                        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
                        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
                        return 0;
                      }).map((task, idx) => {
                      const isDelayed = task.status === 'Delayed';
                      const isCompleted = task.status === 'Completed';

                      let statusColor = 'text-yellow-800 bg-yellow-100 border-yellow-200';
                      if (isCompleted) statusColor = 'text-green-800 bg-green-100 border-green-200';
                      if (isDelayed) statusColor = 'text-red-800 bg-red-100 border-red-200';
                      if (task.status === 'Not Started') statusColor = 'text-zinc-650 bg-zinc-100 border-zinc-200';
                      if (task.status === 'Awaiting Approval') statusColor = 'text-purple-800 bg-purple-100 border-purple-200';
                      if (task.status === 'Awaiting Deletion') statusColor = 'text-orange-800 bg-orange-100 border-orange-200';

                      let prioColor = 'text-zinc-700 bg-zinc-100';
                      if (task.priority === 'High') prioColor = 'text-red-700 bg-red-100';
                      if (task.priority === 'Medium') prioColor = 'text-yellow-750 bg-yellow-100';

                      return (
                        <tr key={task.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-100'} hover:bg-zinc-200/50 transition group border-b border-zinc-200`}>
                          <td className="py-4 px-4 max-w-sm">
                            <div>
                              <span className="rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                                {task.category}
                              </span>
                              <h4 className="mt-1 text-sm font-bold text-zinc-900">
                                {task.taskDescription}
                              </h4>
                              {task.remarks && (
                                <p className="mt-1 text-xs text-zinc-500 italic">
                                  Remarks: {task.remarks}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-zinc-500 font-semibold">
                            {new Date(task.entryDate).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4 text-zinc-500 font-semibold">
                            {task.targetDate ? new Date(task.targetDate).toLocaleDateString() : 'No Target'}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-block rounded px-2 py-0.5 font-bold ${prioColor}`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1 w-24">
                              <div className="flex justify-between items-center font-bold">
                                <span className={`rounded border px-1.5 py-0.2 text-[9px] ${statusColor}`}>
                                  {task.status}
                                </span>
                                <span className="text-zinc-500">{task.progress}%</span>
                              </div>
                              <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isCompleted ? 'bg-green-500' : isDelayed ? 'bg-red-500' : task.status === 'Awaiting Approval' ? 'bg-purple-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${task.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {task.evidenceLink ? (
                              <a
                                href={task.evidenceLink.startsWith('http') ? task.evidenceLink : `https://${task.evidenceLink}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 underline font-bold"
                              >
                                <span>Link</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-zinc-400">None</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {(() => {
                                const isLocked = isCompleted || task.status === 'Awaiting Approval' || task.status === 'Awaiting Deletion';
                                if (isLocked) {
                                  return (
                                    <span className="text-[10px] text-zinc-400 font-bold border border-zinc-200 rounded px-1.5 py-0.5">
                                      Locked
                                    </span>
                                  );
                                }
                                return (
                                  <>
                                    <button
                                      onClick={() => handleOpenEdit(task)}
                                      className="p-1 px-2 border border-zinc-200 bg-white hover:bg-zinc-50 rounded text-zinc-700 font-bold"
                                    >
                                      Update
                                    </button>
                                    <button
                                      onClick={() => handleQuickComplete(task.id)}
                                      className="p-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded"
                                      title="Complete"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleRequestDeletion(task.id)}
                                      className="p-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      )}


      {/* Alerts Modal */}
      {activeModal === 'notifications' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 max-w-lg w-full animate-scaleIn text-zinc-900 text-center">
            <h3 className="text-xl font-bold flex items-center gap-2 justify-center text-red-600 mb-2">
              <Bell className="h-6 w-6" />
              Urgent Notifications Center
            </h3>
            <p className="text-xs text-zinc-500 font-semibold mb-6">
              Review task warnings and nearing deadlines. Keep details complete!
            </p>
            <div className="text-left space-y-3 max-h-[300px] overflow-y-auto mb-6">
              {tasks.filter(t => t.status === 'Delayed').map(t => (
                <div key={t.id} className="p-3 bg-red-50 border border-red-200 rounded-xl flex gap-3 items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-xs text-red-800 uppercase tracking-wide">Delayed Task Alert</h4>
                    <p className="text-xs text-zinc-700 font-medium mt-0.5">{t.taskDescription}</p>
                    <p className="text-[10px] text-zinc-500 font-bold mt-1">Due: {t.targetDate ? new Date(t.targetDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.status === 'Awaiting Approval').map(t => (
                <div key={t.id} className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex gap-3 items-start">
                  <Clock className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-xs text-purple-800 uppercase tracking-wide">Awaiting Review</h4>
                    <p className="text-xs text-zinc-700 font-medium mt-0.5">{t.taskDescription}</p>
                    <p className="text-[10px] text-zinc-500 font-bold mt-1">Status: Pending Program Head's signature.</p>
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.status === 'Ongoing' && !t.targetDate).map(t => (
                <div key={t.id} className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex gap-3 items-start">
                  <Clock className="h-5 w-5 text-zinc-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-xs text-zinc-800 uppercase tracking-wide">Missing Deadline</h4>
                    <p className="text-xs text-zinc-700 font-medium mt-0.5">{t.taskDescription}</p>
                    <p className="text-[10px] text-zinc-500 font-bold mt-1">Missing deadline! Add target date via update modal.</p>
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.status === 'Ongoing' && t.targetDate).length === 0 && tasks.filter(t => t.status === 'Delayed').length === 0 && (
                <p className="text-center text-xs text-zinc-400 font-semibold py-8">
                  No critical alerts right now. Keep up the good work!
                </p>
              )}
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold py-3.5 px-6 rounded-xl border border-zinc-200 text-sm tracking-wider uppercase transition"
            >
              Close Alerts
            </button>
          </div>
        </div>
      )}

      {/* Completed Archive Modal */}
      {activeModal === 'archive' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 max-w-5xl w-full animate-scaleIn text-zinc-900">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2 text-purple-750">
                  <Archive className="h-6 w-6" />
                  Task Archive & Completed Activities
                </h3>
                <p className="text-xs text-zinc-500 font-semibold mt-1">
                  Manual opening to view completed entries. Kept out of clutter automatically.
                </p>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
              >
                Close Archive
              </button>
            </div>

            {loadingArchive ? (
              <div className="text-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent mx-auto"></div>
              </div>
            ) : archivedTasks.length === 0 ? (
              <div className="text-center py-16 text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-xl">
                No completed or archived tasks are present.
              </div>
            ) : (
              <div className="overflow-x-auto border border-zinc-200 rounded-xl max-h-[350px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Task Details</th>
                      <th className="py-2.5 px-4">Completed Date</th>
                      <th className="py-2.5 px-4">Evidence</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {archivedTasks.map((t, idx) => (
                      <tr key={t.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-100'} hover:bg-zinc-200/50 transition`}>
                        <td className="py-3 px-4">
                          <div>
                            <span className="bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.2 rounded font-bold text-[9px] uppercase">
                              {t.category}
                            </span>
                            <p className="font-bold text-zinc-800 mt-1">{t.taskDescription}</p>
                            {t.remarks && <p className="text-[10px] italic text-zinc-500 mt-0.5">Remarks: {t.remarks}</p>}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-500">
                          {new Date(t.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          {t.evidenceLink ? (
                            <a 
                              href={t.evidenceLink} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-blue-600 font-bold hover:underline"
                            >
                              Evidence Link
                            </a>
                          ) : (
                            <span className="text-zinc-450">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRestoreTask(t.id)}
                            className="text-xs bg-zinc-100 hover:bg-zinc-200 font-bold text-zinc-700 px-2 py-1 rounded border border-zinc-200"
                            title="Restore Task to Active List"
                          >
                            Unarchive / Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nominate Task Modal */}
      {activeModal === 'nominate' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 max-w-xl w-full animate-scaleIn text-zinc-900">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-blue-600" />
                Nominate a Task / Milestone
              </h3>
              <button 
                onClick={() => setActiveModal(null)}
                className="text-zinc-450 hover:text-zinc-700 text-xs px-2 py-1 rounded"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-800 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g.HQ Syllabus, Exam Prep, Student Concern"
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Specific Task Description</label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Provide details about what you need to achieve..."
                  rows={3}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:outline-none"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Period</label>
                  <select
                    value={nominationPeriod}
                    onChange={(e) => setNominationPeriod(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:outline-none"
                  >
                    <option value="weekly">This Week</option>
                    <option value="monthly">This Month</option>
                    <option value="yearly">This Year</option>
                    <option value="custom">Specific Target Date</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Target Completion Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  disabled={nominationPeriod !== 'custom'}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Evidence Link (Optional)</label>
                <input
                  type="text"
                  value={evidenceLink}
                  onChange={(e) => setEvidenceLink(e.target.value)}
                  placeholder="Google Drive, ELMS URL, etc."
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div className="border-t border-zinc-100 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-lg hover:bg-zinc-50 text-zinc-500 py-2 px-4 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 font-bold text-xs shadow disabled:opacity-50"
                >
                  {submitting ? 'Nominating...' : 'Submit Nomination'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Update Progress Modal Overlay */}
      {editingTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl animate-scaleIn text-zinc-900">
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Update Accomplishment</h3>
            <p className="text-zinc-500 text-xs mb-4">Task: <span className="text-zinc-950 font-bold">{editingTask.taskDescription}</span></p>

            <form onSubmit={handleUpdateTask} className="space-y-4">
              
              {/* Progress Slider */}
              <div>
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider mb-2">
                  <span className="text-zinc-500">Progress</span>
                  <span className="text-blue-600 text-sm">{editProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={editProgress}
                  onChange={(e) => setEditProgress(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-zinc-400 font-bold mt-1">
                  <span>0% (Not Started)</span>
                  <span>50% (Ongoing)</span>
                  <span>100% (Completed)</span>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Remarks</label>
                <input
                  type="text"
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Remarks..."
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-3 text-xs focus:bg-white focus:outline-none"
                />
              </div>

              {/* Evidence Link */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Evidence Link</label>
                <input
                  type="text"
                  value={editEvidenceLink}
                  onChange={(e) => setEditEvidenceLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-3 text-xs focus:bg-white focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="rounded-lg hover:bg-zinc-50 text-zinc-500 py-2 px-4 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 px-5 text-xs font-bold shadow disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
}
