"use client";

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, AlertTriangle, TrendingUp, 
  PlusCircle, Calendar, List, Search, Plus, 
  Trash2, ExternalLink, RefreshCw, Archive, Bell, FileSpreadsheet, Inbox
} from 'lucide-react';
import CalendarView from './CalendarView';
import SuperAlertModal from './SuperAlertModal';
import { exportTasksToExcel } from '@/lib/reports';
import { getTaskActorInfo } from '@/lib/taskHelpers';

export default function FacultyPortal({ user, taskTrigger, setTaskTrigger, notifications = [], onDeleteNotification, refreshDashboard }) {
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
  const [archiveSortField, setArchiveSortField] = useState('updatedAt');
  const [archiveSortDirection, setArchiveSortDirection] = useState('desc');

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
    const [customDialog, setCustomDialog] = useState(null);
  const [nominatedTaskToAction, setNominatedTaskToAction] = useState(null);
  const [rejectingTaskFromClick, setRejectingTaskFromClick] = useState(null);
  const [rejectionReasonTextClick, setRejectionReasonTextClick] = useState('');
  const [rejectionReasonSingle, setRejectionReasonSingle] = useState('');
  const [submittingRejectSingle, setSubmittingRejectSingle] = useState(false);
  const [rejectingTaskId, setRejectingTaskId] = useState(null);
  const [rejectionInputReason, setRejectionInputReason] = useState(''); // { type: 'confirm'|'alert', title: '', message: '', onConfirm: () => void }
  const triggerConfirm = (title, message, onConfirm) => {
    setCustomDialog({ type: 'confirm', title, message, onConfirm });
  };
  const triggerAlert = (title, message) => {
    setCustomDialog({ type: 'alert', title, message });
  };
  const [editProgress, setEditProgress] = useState(0);
  const [editRemarks, setEditRemarks] = useState('');
  const [editEvidenceLink, setEditEvidenceLink] = useState('');
  const [editStatus, setEditStatus] = useState('Ongoing');
  const [updating, setUpdating] = useState(false);

  // Archive States
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveMonthFilter, setArchiveMonthFilter] = useState('All');
  const [archiveYearFilter, setArchiveYearFilter] = useState('All');
  const [archiveCurrentPage, setArchiveCurrentPage] = useState(1);

  // Inbox States
  const [selectedInboxTaskId, setSelectedInboxTaskId] = useState(null);
  const [inboxMessageText, setInboxMessageText] = useState('');

  useEffect(() => {
    fetchTasks();
    fetchArchivedTasks();
  }, [statusFilter, priorityFilter, searchQuery]);

  useEffect(() => {
    if (taskTrigger && setTaskTrigger) {
      if (taskTrigger.userId === user.id) {
        if (taskTrigger.status === 'Pending Acceptance') {
          setNominatedTaskToAction(taskTrigger);
        } else {
          handleOpenEdit(taskTrigger);
        }
      }
      setTaskTrigger(null);
    }
  }, [taskTrigger]);

  const handleSendInboxMessage = async (taskId) => {
    if (!inboxMessageText.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: inboxMessageText.trim() })
      });
      if (res.ok) {
        setInboxMessageText('');
        fetchTasks();
        fetchArchivedTasks();
      }
    } catch (err) {
      console.error('Error sending message', err);
    }
  };

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
        if (refreshDashboard) {
          refreshDashboard();
        }
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
    if (!category.trim() || !taskDescription.trim() || !priority || !targetDate) {
      setFormError('Please fill in Category, Task Description, Priority, and Target Date.');
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
        triggerAlert('Nomination Successful', 'Your deliverable has been successfully created and submitted!');
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
    if (task.status === 'Rejected' || task.status === 'Pending Acceptance' || task.status === 'Awaiting Approval' || task.status === 'Awaiting Deletion' || task.status === 'Completed') {
      return;
    }
    setEditingTask(task);
    setEditProgress(task.progress);
    setEditStatus(task.status === 'Awaiting Approval' ? 'Completed' : task.status);
    setEditRemarks('');
    setEditEvidenceLink(task.evidenceLink || '');
  };

  const handleUpdateTask = async (e) => {
      e.preventDefault();
      triggerConfirm('Update Progress', 'Are you sure you want to save changes to this deliverable?', () => {
        executeUpdateTask();
      });
    };
    const executeUpdateTask = async () => {
    setUpdating(true);

    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress: editProgress,
          status: editStatus,
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

  
  const handleAcceptTaskDirect = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Ongoing' })
      });
      if (res.ok) {
        fetchTasks();
        triggerAlert('Task Accepted', 'Task has been successfully added to your active deliverables.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectTaskDirect = async (taskId, reason) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected', rejectionReason: reason })
      });
      if (res.ok) {
        fetchTasks();
        triggerAlert('Task Rejected', 'Rejection submitted. Your supervisor has been notified.');
      } else {
        const data = await res.json();
        triggerAlert('Error', data.error || 'Failed to reject task.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickComplete = async (taskId) => {
    triggerConfirm('Request Completion', 'Request completion approval from your head? This will set the task to 100% and notify your supervisor.', () => { requestCompletionAction(taskId); }); return;
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
        triggerAlert('Error', data.error || 'Failed to request completion.');
      }
    } catch (err) {
      console.error('Error requesting completion', err);
    }
  };

  const deleteNominationAction = async (taskId) => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Awaiting Deletion' })
        });
        if (res.ok) {
          fetchTasks();
          triggerAlert('Success', 'Deletion request sent successfully.');
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    const handleCancelTaskDirect = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTasks();
        triggerAlert('Cancelled', 'Nomination cancelled and deleted.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptDeleteDirect = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTasks();
        triggerAlert('Deleted', 'Task has been deleted.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectDeleteDirect = async (taskId, reason) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected', remarks: reason || 'Rejection of deletion request' })
      });
      if (res.ok) {
        fetchTasks();
        triggerAlert('Rejected', 'Deletion request rejected.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptTask = async (taskId) => {
    triggerConfirm('Accept Task', 'Do you want to accept this nominated task and add it to your active list?', async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Not Started' })
        });
        if (res.ok) {
          fetchTasks();
          triggerAlert('Task Accepted', 'Task has been successfully added to your active deliverables.');
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleRejectTaskSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionInputReason.trim()) {
      triggerAlert('Required', 'Please provide a reason for rejection.');
      return;
    }
    const tId = rejectingTaskId;
    const reason = rejectionInputReason.trim();
    setRejectingTaskId(null);
    setRejectionInputReason('');

    try {
      const res = await fetch(`/api/tasks/${tId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected', rejectionReason: reason })
      });
      if (res.ok) {
        fetchTasks();
        triggerAlert('Task Rejected', 'Rejection submitted. Your supervisor has been notified.');
      } else {
        const data = await res.json();
        triggerAlert('Error', data.error || 'Failed to reject task.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestDeletion = async (taskId) => {
    triggerConfirm('Request Deletion', 'Are you sure you want to request deletion of this task nomination?', () => { deleteNominationAction(taskId); }); return;
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
    <>
      <div className="space-y-8 animate-fadeIn text-zinc-950">
      
      {/* Super Warning alert popup if urgent */}
      {showSuperAlert && (
        <SuperAlertModal 
          tasks={tasks} 
          user={user}
          onClose={() => setShowSuperAlert(false)} 
          onAcceptTask={handleAcceptTaskDirect}
          onRejectTask={handleRejectTaskDirect}
          onCancelTask={handleCancelTaskDirect}
          onRefresh={fetchTasks}
          refreshDashboard={refreshDashboard}
          notifications={notifications}
          onDeleteNotification={onDeleteNotification}
          onTaskClick={(task) => {
            setShowSuperAlert(false);
            handleOpenEdit(task);
          }}
        />
      )}

      {/* Greeting Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-zinc-900">Mabuhay, {user.name?.replaceAll('Lll', '3rd')}!</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">
            Faculty and Administrative Staff Portal. Nominate tasks, track deliverables, and manage progress updates.
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Active Tasks */}
        <button
          onClick={() => setActiveModal('tasks')}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-blue-500 rounded-2xl p-6 text-left shadow-sm transition-all duration-300 group flex flex-col justify-between hover:shadow-md min-h-[200px]"
        >
          <div className="flex justify-between items-start w-full">
            <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition duration-300">
              <List className="h-6 w-6 text-blue-600" />
            </div>
            {delayedTasks > 0 && (
              <span className="bg-red-100 text-red-800 text-[10px] px-2.5 py-1 rounded-full font-black border border-red-200">
                {delayedTasks} Delayed
              </span>
            )}
          </div>
          <div>
            <h3 className="font-black text-lg text-zinc-900 group-hover:text-blue-600 transition duration-300 leading-tight">
              My Active Tasks
            </h3>
            <p className="text-xs text-zinc-500 font-semibold mt-2 leading-relaxed">
              Manage your ongoing assignments, submit updates, and request completions.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 mt-2">
            Open List →
          </span>
        </button>

        {/* Card 3: Notifications Alert Centre */}
        <button
          onClick={() => setActiveModal('notifications')}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-red-500 rounded-2xl p-6 text-left shadow-sm transition-all duration-300 group flex flex-col justify-between hover:shadow-md min-h-[200px]"
        >
          <div className="flex justify-between items-start w-full">
            <div className="p-3 bg-red-50 rounded-xl group-hover:bg-red-100 transition duration-300">
              <Bell className="h-6 w-6 text-red-600" />
            </div>
            {delayedTasks > 0 && (
              <span className="bg-red-100 text-red-855 text-[10px] px-2.5 py-1 rounded-full font-black border border-red-200 animate-pulse">
                {delayedTasks} Warnings
              </span>
            )}
          </div>
          <div>
            <h3 className="font-black text-lg text-zinc-900 group-hover:text-red-600 transition duration-300 leading-tight">
              Important Alerts
            </h3>
            <p className="text-xs text-zinc-500 font-semibold mt-2 leading-relaxed">
              Check warnings, pending actions, and urgent task notices inside your portal.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 mt-2">
            Open Alerts →
          </span>
        </button>

        {/* Card 4: Archive */}
        <button
          onClick={() => setActiveModal('archive')}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-purple-500 rounded-2xl p-6 text-left shadow-sm transition-all duration-300 group flex flex-col justify-between hover:shadow-md min-h-[200px]"
        >
          <div className="flex justify-between items-start w-full">
            <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition duration-300">
              <Archive className="h-6 w-6 text-purple-600" />
            </div>
            <span className="bg-purple-100 text-purple-800 text-[10px] px-2.5 py-1 rounded-full font-black border border-purple-200">
              {completedCount} Completed
            </span>
          </div>
          <div>
            <h3 className="font-black text-lg text-zinc-900 group-hover:text-purple-600 transition duration-300 leading-tight">
              Completed Archive
            </h3>
            <p className="text-xs text-zinc-500 font-semibold mt-2 leading-relaxed">
              View historical logs of your completed accomplishments and submissions.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 mt-2">
            View Archive →
          </span>
        </button>
      </div>


      </div>

      {/* Active Tasks Modal */}


      {activeModal === 'tasks' && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden" style={{maxHeight:'88vh'}} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-200 p-6 shrink-0">
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

            <div className="flex-1 min-h-0 overflow-y-auto p-6">
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
                    if (sortField === 'status') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('status');
                      setSortDirection('asc');
                    }
                  }}
                  className={`px-2.5 py-1 rounded font-bold border transition ${sortField === 'status' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
                >
                  📌 Status {sortField === 'status' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
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
              {(() => {
                const filteredTasks = tasks.filter(t => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase().trim();
                  return (
                    t.taskDescription?.toLowerCase().includes(q) ||
                    t.category?.toLowerCase().includes(q) ||
                    t.status?.toLowerCase().includes(q) ||
                    t.priority?.toLowerCase().includes(q)
                  );
                });

                return loading ? (
                  <div className="text-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto"></div>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-16 text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-xl">
                    <p className="text-sm font-semibold">No active tasks found matching criteria.</p>
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
                      {[...tasks].filter(t => !t.archived && t.status !== 'Completed').sort((a, b) => {
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
                      if (task.status === 'Awaiting Approval') {
                        if (task.progress === 0 && task.previousProgress === null) {
                          statusColor = 'text-blue-800 bg-blue-100 border-blue-200';
                        } else {
                          statusColor = 'text-purple-800 bg-purple-100 border-purple-200';
                        }
                      }
                      if (task.status === 'Awaiting Deletion') statusColor = 'text-orange-800 bg-orange-100 border-orange-200';
                      if (task.status === 'Rejected') statusColor = 'text-rose-800 bg-rose-100 border-rose-300';

                      let prioColor = 'text-zinc-700 bg-zinc-100';
                      if (task.priority === 'High') prioColor = 'text-red-700 bg-red-100';
                      if (task.priority === 'Medium') prioColor = 'text-yellow-750 bg-yellow-100';

                      return (
                        <tr key={task.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-100'} hover:bg-zinc-200/50 transition group border-b border-zinc-200`}>
                          <td className="py-4 px-4 max-w-sm">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="rounded bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 uppercase tracking-wider">
                                  {task.category}
                                </span>
                                <span className="text-xs font-bold text-zinc-950">
                                  {task.taskDescription}
                                </span>
                              </div>
                                {/* Actor Labels */}
                                <div className="flex flex-wrap items-center gap-1 mt-1 text-[9px] leading-tight">
                                  {task.nominatedBy?.name ? (
                                    <span className="bg-blue-50/80 text-blue-700 border border-blue-200/60 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-0.5">
                                      👤 Nominated: {task.nominatedBy.name}
                                    </span>
                                  ) : (
                                    <span className="bg-zinc-100 text-zinc-600 border border-zinc-200/60 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-0.5">
                                      Self-Nominated
                                    </span>
                                  )}
                                  {(() => {
                                    const actorInfo = getTaskActorInfo(task);
                                    return (
                                      <>
                                        {actorInfo.coAssignees && (
                                          <span className="bg-indigo-50/80 text-indigo-700 border border-indigo-200/60 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-0.5">
                                            👥 Co-assigned: {actorInfo.coAssignees}
                                          </span>
                                        )}
                                        {actorInfo.lastActionBy && (
                                          <span className={`border px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-0.5 ${
                                            actorInfo.lastActionType === 'Approved' ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/60'
                                            : actorInfo.lastActionType === 'Rejected' ? 'bg-red-50/80 text-red-700 border-red-200/60'
                                            : 'bg-purple-50/80 text-purple-700 border-purple-200/60'
                                          }`}>
                                            {actorInfo.lastActionType}: {actorInfo.lastActionBy}
                                          </span>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
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
                                  {task.status === 'Awaiting Approval' ? (
                                    task.progress === 0 && task.previousProgress === null ? 'Awaiting Nomination Approval' : 'Awaiting Progress Approval'
                                  ) : task.status}
                                </span>
                                <span className="text-zinc-500">{task.progress}%</span>
                              </div>
                              <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isCompleted ? 'bg-green-500' : isDelayed ? 'bg-red-500' : task.status === 'Awaiting Approval' ? 'bg-purple-500' : 'bg-green-500'
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
                            <div className="flex items-center justify-end gap-1.5">
                              {(() => {
                                const isWaiting = task.status === 'Awaiting Approval' || task.status === 'Awaiting Deletion';
                                const isRejected = task.status === 'Rejected';
                                const isPending = task.status === 'Pending Acceptance';
                                const isDisabled = isCompleted || isWaiting || isRejected || isPending;

                                const buttonTitle = isWaiting ? 'Pending approval' :
                                  isCompleted ? 'Completed' :
                                  isRejected ? 'Task Rejected - Awaiting Supervisor action' :
                                  isPending ? 'Pending Acceptance - Respond via Alert/Inbox' :
                                  'Update Task';
                                return (
                                  <>
                                    <button
                                      disabled={isDisabled}
                                      onClick={() => handleOpenEdit(task)}
                                      className={`text-xs border px-2 py-1 rounded font-bold transition-all ${
                                        isDisabled
                                          ? 'bg-zinc-100 border-zinc-250 text-zinc-400 cursor-not-allowed opacity-60'
                                          : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700 active:scale-95'
                                      }`}
                                      title={buttonTitle}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      disabled={isDisabled}
                                      onClick={() => handleRequestDeletion(task.id)}
                                      className={`p-1 border rounded transition-all ${
                                        isDisabled
                                          ? 'bg-zinc-100 border-zinc-250 text-zinc-400 cursor-not-allowed opacity-60'
                                          : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200 active:scale-95'
                                      }`}
                                      title={buttonTitle}
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
            );
          })()}
        </div>
          </div>
        </div>
      )}

      {/* Alerts / Inbox Modal */}
      {activeModal === 'notifications' && (
        <SuperAlertModal 
          tasks={tasks}
          user={user}
          onClose={() => setActiveModal(null)}
          onAcceptTask={handleAcceptTaskDirect}
          onRejectTask={handleRejectTaskDirect}
          onCancelTask={handleCancelTaskDirect}
          onAcceptDelete={(taskId, isDeletion) => handleAcceptDeleteDirect(taskId)}
          onRejectDelete={(taskId, reason) => handleRejectDeleteDirect(taskId, reason)}
          onTaskClick={(task) => {
            setActiveModal(null);
            if (task.userId === user.id) {
              handleOpenEdit(task);
            }
          }}
          onRefresh={fetchTasks}
          refreshDashboard={refreshDashboard}
          notifications={notifications}
          onDeleteNotification={onDeleteNotification}
        />
      )}

      {/* Completed Archive Modal */}
      {activeModal === 'archive' && (() => {
        // Filter archive tasks
        const filteredArchive = archivedTasks.filter(t => {
          if (archiveSearch.trim() !== '') {
            const query = archiveSearch.toLowerCase();
            const desc = t.taskDescription?.toLowerCase() || '';
            const cat = t.category?.toLowerCase() || '';
            const status = t.status?.toLowerCase() || '';
            const priority = t.priority?.toLowerCase() || '';
            if (!desc.includes(query) && !cat.includes(query) && !status.includes(query) && !priority.includes(query)) return false;
          }
          if (archiveMonthFilter !== 'All') {
            const month = new Date(t.updatedAt).getMonth();
            if (month !== parseInt(archiveMonthFilter, 10)) return false;
          }
          if (archiveYearFilter !== 'All') {
            const year = new Date(t.updatedAt).getFullYear();
            if (year !== parseInt(archiveYearFilter, 10)) return false;
          }
          return true;
        });

        // Pagination
        const itemsPerPage = 10;
        const totalPages = Math.ceil(filteredArchive.length / itemsPerPage);
        const currentPageSafe = Math.min(archiveCurrentPage, totalPages || 1);
        const startIndex = (currentPageSafe - 1) * itemsPerPage;
        const paginatedArchive = filteredArchive.slice(startIndex, startIndex + itemsPerPage);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        // Get unique years
        const uniqueYears = Array.from(new Set(archivedTasks.map(t => new Date(t.updatedAt).getFullYear()))).sort((a,b)=>b-a);

        return (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden animate-scaleIn text-zinc-900" style={{maxHeight:'88vh'}} onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b border-zinc-100 px-6 py-4 flex-shrink-0">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2 text-purple-800">
                    <Archive className="h-6 w-6" />
                    Task Archive & Completed Activities
                  </h3>
                  <p className="text-xs text-zinc-500 font-semibold mt-1">
                    Inspecting completed accomplishments. Kept clean from active workspaces.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => { if (e.target.value) { handleExport(e.target.value); e.target.value = ''; } }}
                    className="rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs font-bold text-zinc-700 focus:outline-none cursor-pointer shadow-sm hover:border-purple-300 transition"
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

              {/* Filtering Controls */}
              <div className="bg-zinc-50 border-b border-zinc-100 p-4 shrink-0 space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search archive by description, category..."
                      value={archiveSearch}
                      onChange={(e) => { setArchiveSearch(e.target.value); setArchiveCurrentPage(1); }}
                      className="w-full bg-white border border-zinc-200 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-purple-500 font-medium"
                    />
                  </div>
                  <div className="w-full md:w-40">
                    <select
                      value={archiveYearFilter}
                      onChange={(e) => { setArchiveYearFilter(e.target.value); setArchiveCurrentPage(1); }}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-500 font-bold"
                    >
                      <option value="All">All Years</option>
                      {uniqueYears.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full md:w-40">
                    <select
                      value={archiveMonthFilter}
                      onChange={(e) => { setArchiveMonthFilter(e.target.value); setArchiveCurrentPage(1); }}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-500 font-bold"
                    >
                      <option value="All">All Months</option>
                      {months.map((m, idx) => (
                        <option key={m} value={idx.toString()}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-6">
              {loadingArchive ? (
                <div className="text-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent mx-auto"></div>
                </div>
              ) : filteredArchive.length === 0 ? (
                <div className="text-center py-16 text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-xl">
                  No completed or archived tasks are present for the selected filters.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-zinc-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider select-none">
                        <tr>
                          <th className="py-2.5 px-4">Task Details</th>
                          <th className="py-2.5 px-4">Completed Date</th>
                          <th className="py-2.5 px-4">Evidence</th>
                          <th className="py-2.5 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {paginatedArchive.map((t, idx) => (
                          <tr key={t.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-100'} hover:bg-zinc-200/50 transition`}>
                            <td className="py-3 px-4">
                              <div>
                                <span className="bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.2 rounded font-bold text-[9px] uppercase">
                                  {t.category}
                                </span>
                                <p className="font-bold text-zinc-800 mt-1">{t.taskDescription}</p>
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
                              <span className="text-[10px] bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded-full font-bold">
                                Completed / Archived
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Premium Pagination controls */}
                  <div className="flex items-center justify-between border-t border-zinc-100 pt-4 text-xs font-semibold text-zinc-500">
                    <div>
                      Showing <span className="text-zinc-800">{startIndex + 1}</span> to <span className="text-zinc-800">{Math.min(startIndex + itemsPerPage, filteredArchive.length)}</span> of <span className="text-zinc-800">{filteredArchive.length}</span> archived tasks
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setArchiveCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPageSafe === 1}
                        className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 rounded-lg disabled:opacity-50 transition font-bold"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700">
                        Page {currentPageSafe} of {totalPages || 1}
                      </span>
                      <button
                        onClick={() => setArchiveCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPageSafe === totalPages}
                        className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 rounded-lg disabled:opacity-50 transition font-bold"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Nominate Task Modal */}
      {activeModal === 'nominate' && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-scaleIn text-zinc-900" style={{maxHeight:'88vh'}} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg"><PlusCircle className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <h3 className="text-base font-black text-zinc-900">Nominate a Task / Milestone</h3>
                  <p className="text-[11px] text-zinc-400 font-medium">Submit a personal deliverable or task for tracking</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
              >
                ✕ Cancel
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTask} className="flex flex-col flex-1 min-h-0">
              {/* Scrollable Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
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
                    placeholder="e.g. HQ Syllabus, Exam Prep, Student Concern"
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
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Target Completion Date</label>
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
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Or Choose Specific Target Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    disabled={nominationPeriod !== 'custom'}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-6 py-4 border-t border-zinc-100 flex justify-end gap-2 shrink-0 bg-zinc-50/50">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-lg hover:bg-zinc-100 text-zinc-600 py-2 px-4 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 font-bold text-xs shadow disabled:opacity-50 transition"
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
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setEditingTask(null); }}>
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl animate-scaleIn text-zinc-900">
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
                  onChange={(e) => {
                    const newProgress = parseInt(e.target.value, 10);
                    setEditProgress(newProgress);
                    if (newProgress === 100) {
                      setEditStatus('Completed');
                    } else if (newProgress < 100 && editStatus === 'Completed') {
                      setEditStatus('Ongoing');
                    }
                  }}
                  style={{ background: `linear-gradient(to right, #22c55e 0%, #22c55e ${editProgress}%, #e4e4e7 ${editProgress}%, #e4e4e7 100%)` }}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-green-600 bg-zinc-200"
                />
                <div className="flex justify-between text-[10px] text-zinc-400 font-bold mt-1">
                  <span>0% (Not Started)</span>
                  <span>50% (Ongoing)</span>
                  <span>100% (Completed)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    setEditStatus(newStatus);
                    if (newStatus === 'Completed') {
                      setEditProgress(100);
                    } else if (newStatus === 'Ongoing' && editProgress === 100) {
                      setEditProgress(95);
                    }
                  }}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:bg-white focus:outline-none"
                >
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed (Submit for Approval)</option>
                </select>
              </div>

              {/* Remarks/Message Textarea */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Remarks / Message to Supervisor</label>
                <textarea
                  rows={2}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Explain your changes or resubmission note..."
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:bg-white focus:outline-none resize-none"
                />
              </div>

              {/* Evidence Link */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Evidence Link (Optional)</label>
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
      
      {/* Click-routed Nomination Action Modal for Faculty */}
      {nominatedTaskToAction && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setNominatedTaskToAction(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scaleIn text-zinc-900 border border-zinc-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">{nominatedTaskToAction.category}</span>
              <button onClick={() => setNominatedTaskToAction(null)} className="text-zinc-400 hover:text-zinc-700">✕</button>
            </div>
            <h4 className="font-black text-lg text-zinc-900 mb-1">{nominatedTaskToAction.taskDescription}</h4>
            {nominatedTaskToAction.assignedNote && (
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-2.5 my-3 font-medium">
                <span className="font-bold">Supervisor Note:</span> {nominatedTaskToAction.assignedNote}
              </p>
            )}
            <p className="text-xs text-zinc-500 mb-6 font-semibold">Please accept or reject this task assignment.</p>
            
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await handleAcceptTaskDirect(nominatedTaskToAction.id);
                  setNominatedTaskToAction(null);
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2.5 px-3 rounded-lg shadow-xs transition"
              >
                Accept Task
              </button>
              <button
                onClick={() => {
                  setRejectingTaskFromClick(nominatedTaskToAction);
                }}
                className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs py-2.5 px-3 rounded-lg transition"
              >
                Reject Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium rejection input modal from click route */}
      {rejectingTaskFromClick && (
        <div className="fixed inset-0 z-[610] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-zinc-900 border border-zinc-200 animate-scaleIn">
            <h4 className="font-black text-lg text-zinc-900 mb-1">Reject Task Nomination</h4>
            <p className="text-xs text-zinc-500 mb-4 font-semibold">Please provide a mandatory reason for rejecting this task:</p>
            <textarea
              value={rejectionReasonTextClick}
              onChange={(e) => setRejectionReasonTextClick(e.target.value)}
              placeholder="Reason for rejection (mandatory)..."
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:bg-white focus:outline-none h-28 resize-none mb-4"
              required
            />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!rejectionReasonTextClick.trim()) {
                    triggerAlert('Required', 'Reason is required to reject.');
                    return;
                  }
                  await handleRejectTaskDirect(rejectingTaskFromClick.id, rejectionReasonTextClick.trim());
                  setRejectingTaskFromClick(null);
                  setRejectionReasonTextClick('');
                  setNominatedTaskToAction(null);
                }}
                className="flex-1 bg-red-655 hover:bg-red-700 text-white font-bold text-xs py-2.5 px-3 rounded-lg shadow-xs transition"
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => setRejectingTaskFromClick(null)}
                className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs py-2.5 px-3 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
  
      {customDialog && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setCustomDialog(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scaleIn text-zinc-900 border border-zinc-200" onClick={e => e.stopPropagation()}>
            <h4 className="font-black text-base text-zinc-900 uppercase tracking-wider mb-2">{customDialog.title}</h4>
            <p className="text-xs text-zinc-500 font-medium mb-6 leading-relaxed">{customDialog.message}</p>
            <div className="flex justify-end gap-2">
              {customDialog.type === 'confirm' && (
                <button
                  onClick={() => setCustomDialog(null)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 font-bold rounded-lg text-xs transition"
                >
                  No
                </button>
              )}
              <button
                onClick={() => {
                  if (customDialog.type === 'confirm' && customDialog.onConfirm) {
                    customDialog.onConfirm();
                  }
                  setCustomDialog(null);
                }}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-lg text-xs transition shadow-md shadow-zinc-950/10"
              >
                {customDialog.type === 'confirm' ? 'Yes' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}