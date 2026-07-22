"use client";

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, AlertTriangle, TrendingUp, 
  List, Search, RefreshCw, Eye, Edit2, Users, FileText,
  PlusCircle, Calendar, Plus, Trash2, ExternalLink, Archive, Bell, FileSpreadsheet, Inbox
} from 'lucide-react';
import CalendarView from './CalendarView';
import SuperAlertModal from './SuperAlertModal';
import AssigneeCombobox from './AssigneeCombobox';
import { exportTasksToExcel } from '@/lib/reports';
import { getTaskActorInfo } from '@/lib/taskHelpers';
const renderRemarksLog = (remarksStr) => {
  if (!remarksStr) return null;
  try {
    const parsed = JSON.parse(remarksStr);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return (
        <div className="mt-1.5 bg-zinc-50 border border-zinc-200 rounded-lg p-2 space-y-1 text-left">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">Activity &amp; Remarks Log</span>
          <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
            {parsed.map((msg, index) => (
              <div key={index} className="text-[10px] leading-relaxed text-zinc-700 border-b border-zinc-100 pb-1 last:border-0 last:pb-0">
                <span className="font-bold text-zinc-800">{msg.sender} ({msg.role}):</span>{" "}
                <span className="italic font-medium">"{msg.message || msg.content}"</span>
                <span className="text-[8px] text-zinc-400 block mt-0.5">
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  } catch (e) {
    // fallback if it's plain text
  }
  return (
    <div className="mt-1 bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-left">
      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">Remarks</span>
      <p className="text-[10px] text-zinc-700 italic">"{remarksStr}"</p>
    </div>
  );
};

export default function ProgramHeadPortal({ user, taskTrigger, setTaskTrigger, notifications = [], onDeleteNotification, refreshDashboard }) {
  const [tasks, setTasks] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingArchive, setLoadingArchive] = useState(false);

  // Active Modals
  const [activeModal, setActiveModal] = useState(null); // 'faculty_tasks' | 'my_tasks' | 'calendar' | 'notifications' | 'archive' | 'nominate'
  const [showSuperAlert, setShowSuperAlert] = useState(true);
  const [warningActiveTab, setWarningActiveTab] = useState('All');

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [timeframeFilter, setTimeframeFilter] = useState('All');
  const [selectedFacultyId, setSelectedFacultyId] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('targetDate');
  const [sortDirection, setSortDirection] = useState('asc');

  // Editing/Reviewing Modal State (for Faculty Tasks)
  const [reviewingTask, setReviewingTask] = useState(null);
  const [reviewProgress, setReviewProgress] = useState(0);
  const [reviewStatus, setReviewStatus] = useState('Ongoing');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [updating, setUpdating] = useState(false);
  const [customDialog, setCustomDialog] = useState(null);
  const [nominatedTaskToAction, setNominatedTaskToAction] = useState(null);
  const [assignToUserId, setAssignToUserId] = useState('');
  const [assignToUserIds, setAssignToUserIds] = useState([]);
  const [forcingTaskId, setForcingTaskId] = useState(null);
  const [rejectingTaskId, setRejectingTaskId] = useState(null);
  const [rejectionInputReason, setRejectionInputReason] = useState('');
  const [forceNoteInput, setForceNoteInput] = useState('');
  const [rejectingTaskFromClick, setRejectingTaskFromClick] = useState(null);
  const [rejectionReasonTextClick, setRejectionReasonTextClick] = useState('');
  const [archiveSortField, setArchiveSortField] = useState('updatedAt');
  const [archiveSortDirection, setArchiveSortDirection] = useState('desc');

  const triggerConfirm = (title, message, onConfirm) => {
    setCustomDialog({ type: 'confirm', title, message, onConfirm });
  };
  const triggerAlert = (title, message) => {
    setCustomDialog({ type: 'alert', title, message });
  };

  // Self-Nomination Form States (for Program Head's own tasks)
  const [category, setCategory] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [nominationPeriod, setNominationPeriod] = useState('weekly');
  const [targetDate, setTargetDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [evidenceLink, setEvidenceLink] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Editing Self-Nomination Modal States
  const [editingTask, setEditingTask] = useState(null);
  const [editProgress, setEditProgress] = useState(0);
  const [editStatus, setEditStatus] = useState('Ongoing');
  const [editRemarks, setEditRemarks] = useState('');
  const [editEvidenceLink, setEditEvidenceLink] = useState('');
  const [updatingTask, setUpdatingTask] = useState(false);

  // Archive States
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveMonthFilter, setArchiveMonthFilter] = useState('All');
  const [archiveYearFilter, setArchiveYearFilter] = useState('All');
  const [archiveCurrentPage, setArchiveCurrentPage] = useState(1);

  // Inbox States
  const [selectedInboxTaskId, setSelectedInboxTaskId] = useState(null);
  const [inboxMessageText, setInboxMessageText] = useState('');

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

  useEffect(() => {
    fetchTasks();
    fetchArchivedTasks();
    fetchFaculty();
  }, [statusFilter, priorityFilter, timeframeFilter, selectedFacultyId]);

  useEffect(() => {
    if (taskTrigger && setTaskTrigger) {
      if (taskTrigger.userId === user.id) {
        if (taskTrigger.status === 'Pending Acceptance') {
          setNominatedTaskToAction(taskTrigger);
        } else {
          handleOpenEditSelf(taskTrigger);
        }
      } else {
        if (taskTrigger.status === 'Rejected') {
          setForcingTaskId(taskTrigger.id);
        } else {
          handleOpenReview(taskTrigger);
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
      if (timeframeFilter !== 'All') url.searchParams.append('timeframe', timeframeFilter);
      if (selectedFacultyId !== 'All') url.searchParams.append('userId', selectedFacultyId);
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
      console.error('Error fetching department tasks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchArchivedTasks() {
    setLoadingArchive(true);
    try {
      const url = new URL('/api/tasks', window.location.origin);
      url.searchParams.append('archived', 'true');
      if (selectedFacultyId !== 'All') url.searchParams.append('userId', selectedFacultyId);
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

  async function fetchFaculty() {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        // Filter only department staff
        setFacultyList(data.users.filter(u => u.departmentId === user.departmentId && u.role === 'FACULTY_STAFF'));
      }
    } catch (err) {
      console.error('Error fetching faculty list:', err);
    }
  }

  
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

  // Approve update request (Awaiting Approval) from subordinate
  const handleAcceptUpdate = async (taskId) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      const status = task?.progress === 100 ? 'Completed' : 'Ongoing';
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setReviewingTask(null);
        fetchTasks();
        fetchArchivedTasks();
        triggerAlert('Approved', status === 'Completed' ? 'Task marked as Completed and archived.' : 'Progress update approved.');
      }
    } catch (err) { console.error(err); }
  };

  // Reject update request — revert to Ongoing
  const handleRejectUpdate = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Ongoing' })
      });
      if (res.ok) {
        setReviewingTask(null);
        fetchTasks();
        triggerAlert('Rejected', 'Update request rejected. Task returned to Ongoing.');
      }
    } catch (err) { console.error(err); }
  };

  // Approve deletion request — actually delete the task
  const handleApproveDeletion = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        setReviewingTask(null);
        fetchTasks();
        fetchArchivedTasks();
        triggerAlert('Deletion Approved', 'The task has been permanently deleted.');
      }
    } catch (err) { console.error(err); }
  };

  // Reject deletion request
  const handleRejectDeletion = async (taskId, reason) => {
    const finalReason = reason || reviewRemarks;
    if (!finalReason || !finalReason.trim()) {
      triggerAlert('Remarks Required', 'Please enter a reason in the "Rejection Reason" field before rejecting this deletion request.');
      return;
    }
    triggerConfirm('Reject Deletion Request', 'Are you sure you want to reject this deletion request? This will notify the assignee.', async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Rejected', remarks: finalReason.trim() })
        });
        if (res.ok) {
          setReviewingTask(null);
          setReviewRemarks('');
          fetchTasks();
          triggerAlert('Deletion Rejected', 'Deletion request rejected. Task marked as Rejected.');
        }
      } catch (err) { console.error(err); }
    });
  };


  const handleExport = (timeframe) => {
    const now = new Date();
    let filtered = [...tasks, ...archivedTasks];
    let title = `${user.departmentName || user.name} Department Tasks Report`;

    if (timeframe === 'weekly') {
      const ago = new Date(); ago.setDate(now.getDate() - 7);
      filtered = filtered.filter(t => new Date(t.entryDate || t.createdAt) >= ago);
      title += ' - Weekly';
    } else if (timeframe === 'monthly') {
      const ago = new Date(); ago.setMonth(now.getMonth() - 1);
      filtered = filtered.filter(t => new Date(t.entryDate || t.createdAt) >= ago);
      title += ' - Monthly';
    } else if (timeframe === 'yearly') {
      const ago = new Date(); ago.setFullYear(now.getFullYear() - 1);
      filtered = filtered.filter(t => new Date(t.entryDate || t.createdAt) >= ago);
      title += ' - Yearly';
    }
    exportTasksToExcel(filtered, title);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTasks();
  };

  const handleOpenReview = (task) => {
    setReviewingTask(task);
    setReviewProgress(task.progress);
    setReviewStatus(task.status);
    // Always clear so the supervisor must actively type a new rejection reason
    setReviewRemarks('');
  };

  const handleUpdateTaskReview = async (e) => {
      e.preventDefault();
      triggerConfirm('Submit Review', 'Are you sure you want to save your review and signing changes?', () => {
        executeUpdateTaskReview();
      });
    };
    const executeUpdateTaskReview = async () => {
    setUpdating(true);

    try {
      const res = await fetch(`/api/tasks/${reviewingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress: reviewProgress,
          status: reviewStatus,
          remarks: reviewRemarks.trim()
        })
      });

      if (res.ok) {
        setReviewingTask(null);
        fetchTasks();
        fetchArchivedTasks();
        fetchFaculty();
      }
    } catch (err) {
      console.error('Error reviewing task', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleApproveCompletion = (task) => {
    const isCompleted = task.progress === 100;
    const title = isCompleted ? 'Approve Completion' : 'Approve Progress Update';
    const message = isCompleted 
      ? `Approve "${task.taskDescription?.substring(0,50)}" as completed? It will be archived immediately.`
      : `Approve the progress update to ${task.progress}% for "${task.taskDescription?.substring(0,50)}"?`;
    const targetStatus = isCompleted ? 'Completed' : 'Ongoing';
    const successMsg = isCompleted 
      ? 'Task has been marked as Completed and archived.' 
      : 'Progress update has been approved.';

    triggerConfirm(title, message, async () => {
      try {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: targetStatus, remarks: reviewRemarks.trim() || task.remarks })
        });
        if (res.ok) {
          setReviewingTask(null);
          setReviewRemarks('');
          fetchTasks();
          fetchArchivedTasks();
          fetchFaculty();
          triggerAlert('Approved', successMsg);
        }
      } catch (err) {
        console.error('Error approving completion', err);
      }
    });
  };

  const handleRejectCompletion = (task) => {
    if (!reviewRemarks.trim()) {
      triggerAlert('Remarks Required', 'Please enter a reason in the "Rejection Reason" field before rejecting this progress update.');
      return;
    }
    triggerConfirm('Reject Update Request', `Reject the progress update for "${task.taskDescription?.substring(0,50)}"? This will notify the assignee and require them to resubmit.`, async () => {
      try {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          // Do NOT send progress — only status + remarks. The API handles archived=false for Rejected.
          body: JSON.stringify({ status: 'Rejected', remarks: reviewRemarks.trim() })
        });
        if (res.ok) {
          setReviewingTask(null);
          setReviewRemarks('');
          fetchTasks();
          fetchArchivedTasks();
          fetchFaculty();
          triggerAlert('Rejected', 'Update request has been rejected. Assignee will be notified.');
        }
      } catch (err) {
        console.error('Error rejecting completion', err);
      }
    });
  };

  const handleRejectNomination = async (taskId, reason) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected', rejectionReason: reason })
      });
      if (res.ok) {
        fetchTasks();
        triggerAlert('Task Rejected', 'Rejection submitted. Your supervisor has been notified.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelNomination = async (taskId) => {
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

  const handleForceTaskDirect = async (taskId, note) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Ongoing', assignedNote: note })
      });
      if (res.ok) {
        fetchTasks();
        triggerAlert('Task Forced', 'Task has been successfully pushed and made active (Ongoing).');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleForceTaskSubmit = async (e) => {
    e.preventDefault();
    if (!forceNoteInput.trim()) {
      triggerAlert('Required', 'Please provide a note/explanation for forcing this task.');
      return;
    }
    const tId = forcingTaskId;
    const note = forceNoteInput.trim();
    setForcingTaskId(null);
    setForceNoteInput('');
    await handleForceTaskDirect(tId, note);
  };

  const handleCancelPHNominatedTask = async (taskId) => {
    triggerConfirm('Cancel Task', 'Are you sure you want to cancel this rejected task nomination? This will permanently delete it.', async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
        if (res.ok) {
          fetchTasks();
          triggerAlert('Task Cancelled', 'Nomination was successfully cancelled.');
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleCreateSelfTask = async (e) => {
      e.preventDefault();
      triggerConfirm('Submit Nomination', 'Are you sure you want to submit this self-nominated task?', () => {
        executeCreateSelfTask();
      });
    };
    const executeCreateSelfTask = async () => {
    if (!category.trim() || !taskDescription.trim() || !priority || !targetDate) {
      setFormError('Please fill in Category, Task Description, Priority, and Target Date.');
      return;
    }

    const selfUserId = user?.id || user?.userId;
    const selectedIds = assignToUserIds.length > 0
      ? assignToUserIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id))
      : (assignToUserId && !isNaN(parseInt(assignToUserId, 10))
          ? [parseInt(assignToUserId, 10)]
          : (selfUserId ? [parseInt(selfUserId, 10)] : []));

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
          evidenceLink: evidenceLink.trim(),
          userIds: selectedIds
        })
      });

      if (res.ok) {
        setCategory('');
        setTaskDescription('');
        setRemarks('');
        setEvidenceLink('');
        setAssignToUserIds([]);
        setAssignToUserId('');
        setActiveModal(null);
        fetchTasks();
        if (selectedIds.some(id => Number(id) !== Number(user.id))) {
          triggerAlert('Task Assigned', 'The task has been successfully nominated and assigned to the selected assignee(s).');
        } else {
          triggerAlert('Nomination Successful', 'Your self-nominated task has been successfully created and is now awaiting supervisor approval!');
        }
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

  const handleOpenEditSelf = (task) => {
    if (task.status === 'Rejected' || task.status === 'Pending Acceptance' || task.status === 'Awaiting Approval' || task.status === 'Awaiting Deletion' || task.status === 'Completed') {
      return;
    }
    setEditingTask(task);
    setEditProgress(task.progress);
    setEditStatus(task.status === 'Awaiting Approval' ? 'Completed' : task.status);
    setEditRemarks('');
    setEditEvidenceLink(task.evidenceLink || '');
  };

  const handleUpdateSelfTask = async (e) => {
      e.preventDefault();
      triggerConfirm('Save Changes', 'Are you sure you want to update this deliverable?', () => {
        executeUpdateSelfTask();
      });
    };
    const executeUpdateSelfTask = async () => {
    setUpdatingTask(true);

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
      console.error('Error updating self task', err);
    } finally {
      setUpdatingTask(false);
    }
  };

  const deleteNominationPHAction = async (taskId) => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Awaiting Deletion' })
        });
        if (res.ok) fetchTasks();
      } catch (err) {
        console.error(err);
      }
    };
    
    const handleRequestDeletion = async (taskId) => {
    triggerConfirm('Request Deletion', 'Are you sure you want to request deletion of this task nomination?', () => { deleteNominationPHAction(taskId); }); return;
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

  const deletePHAction = async (taskId) => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
        if (res.ok) {
          setReviewingTask(null);
          fetchTasks();
          fetchArchivedTasks();
          triggerAlert('Task Deleted', 'Nomination has been successfully deleted.');
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    const handleDeleteTask = async (taskId) => {
    triggerConfirm('Delete Task', 'Are you sure you want to permanently delete this task nomination?', () => { deletePHAction(taskId); }); return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchTasks();
        fetchArchivedTasks();
      }
    } catch (err) {
      console.error('Error deleting task', err);
    }
  };

  // Split tasks (Active, uncompleted only)
  const facultyTasks = tasks.filter(t => t.userId !== user.id && !t.archived && t.status !== 'Completed');
  const myTasks = tasks.filter(t => t.userId === user.id && !t.archived && t.status !== 'Completed');

  // Metrics
  const totalTasks = tasks.length;
  const delayedTasks = tasks.filter(t => t.status === 'Delayed').length;
  const pendingApprovals = tasks.filter(t => t.status === 'Awaiting Approval' && t.userId !== user.id).length;
  const pendingDeletions = tasks.filter(t => t.status === 'Awaiting Deletion' && t.userId !== user.id).length;
  const rejectedNominations = tasks.filter(t => t.status === 'Rejected' && t.nominatedById === user.id);
  const pendingAcceptance = tasks.filter(t => t.status === 'Pending Acceptance' && t.nominatedById === user.id);
  const myPendingAcceptances = tasks.filter(t => t.status === 'Pending Acceptance' && t.userId === user.id);
  const convoTasks = tasks.filter(t => 
    t.status === 'Rejected' || 
    t.rejectionReason || 
    t.assignedNote || 
    t.remarks
  );

  return (
    <>
      <div className="space-y-8 animate-fadeIn text-zinc-950">
      
      {/* Super Alert Modal for Overdue deadlines */}
      {showSuperAlert && (
        <SuperAlertModal
          tasks={tasks}
          user={user}
          onClose={() => setShowSuperAlert(false)}
          onAcceptTask={handleAcceptTaskDirect}
          onRejectTask={handleRejectTaskDirect}
          onForceTask={handleForceTaskDirect}
          onCancelTask={handleCancelNomination}
          onAcceptDelete={(taskId, isDeletion) => isDeletion ? handleApproveDeletion(taskId) : handleAcceptUpdate(taskId)}
          onRejectDelete={(taskId, reason) => handleRejectDeletion(taskId, reason)}
          onRefresh={fetchTasks}
          refreshDashboard={refreshDashboard}
          notifications={notifications}
          onDeleteNotification={onDeleteNotification}
          onTaskClick={(task) => {
            setShowSuperAlert(false);
            if (task.userId === user.id) {
              handleOpenEditSelf(task);
            } else {
              setReviewingTask(task);
              setReviewProgress(task.progress);
              setReviewStatus(task.status);
              setReviewRemarks('');
            }
          }}
          onRefresh={fetchTasks}
          notifications={notifications}
          onDeleteNotification={onDeleteNotification}
        />
      )}

      {/* Greeting Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-zinc-900">Department Head: {user.name}</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">
            Manage your faculty's tasks, approve deliverables, and manage your own nominations.
          </p>
        </div>
        <button
          onClick={() => setActiveModal('nominate')}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 shadow transition-all duration-200 active:scale-95 text-sm"
        >
          <Plus className="h-4 w-4" />
          Nominate My Task
        </button>
      </div>

      {/* Cards Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Faculty Tasks */}
        <button
          onClick={() => setActiveModal('faculty_tasks')}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-blue-500 rounded-2xl p-6 text-left shadow-sm transition-all duration-300 group flex flex-col justify-between hover:shadow-md min-h-[200px]"
        >
          <div className="flex justify-between items-start w-full">
            <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition duration-300">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            {(pendingApprovals > 0 || pendingDeletions > 0) && (
              <span className="bg-purple-100 text-purple-800 text-[10px] px-2.5 py-1 rounded-full font-black border border-purple-200">
                {pendingApprovals + pendingDeletions} Action Req.
              </span>
            )}
          </div>
          <div>
            <h3 className="font-black text-lg text-zinc-900 group-hover:text-blue-600 transition duration-300 leading-tight">
              Faculty Accomplishments
            </h3>
            <p className="text-xs text-zinc-500 font-semibold mt-2 leading-relaxed">
              Review and approve nominated tasks from your faculty members.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 mt-2">
            Open Faculty List →
          </span>
        </button>

        {/* Card 2: Important Notices */}
        <button
          onClick={() => setActiveModal('notifications')}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-red-500 rounded-2xl p-6 text-left shadow-sm transition-all duration-300 group flex flex-col justify-between hover:shadow-md min-h-[200px]"
        >
          <div className="flex justify-between items-start w-full">
            <div className="p-3 bg-red-50 rounded-xl group-hover:bg-red-100 transition duration-300">
              <Bell className="h-6 w-6 text-red-600" />
            </div>
            {delayedTasks > 0 && (
              <span className="bg-red-100 text-red-850 text-[10px] px-2.5 py-1 rounded-full font-black border border-red-200 animate-pulse">
                {delayedTasks} Warnings
              </span>
            )}
          </div>
          <div>
            <h3 className="font-black text-lg text-zinc-900 group-hover:text-red-600 transition duration-300 leading-tight">
              Important Notices
            </h3>
            <p className="text-xs text-zinc-500 font-semibold mt-2 leading-relaxed">
              Check overdue alerts or warning flags inside the department.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 mt-2">
            Open Alerts →
          </span>
        </button>

        {/* Card 3: My Self-Nominations */}
        <button
          onClick={() => setActiveModal('my_tasks')}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-700 rounded-2xl p-6 text-left shadow-sm transition-all duration-300 group flex flex-col justify-between hover:shadow-md min-h-[200px]"
        >
          <div className="flex justify-between items-start w-full">
            <div className="p-3 bg-zinc-50 rounded-xl group-hover:bg-zinc-100 transition duration-300">
              <List className="h-6 w-6 text-zinc-700" />
            </div>
            {myTasks.filter(t => t.status === 'Delayed').length > 0 && (
              <span className="bg-red-100 text-red-800 text-[10px] px-2.5 py-1 rounded-full font-black border border-red-200">
                {myTasks.filter(t => t.status === 'Delayed').length} Delayed
              </span>
            )}
          </div>
          <div>
            <h3 className="font-black text-lg text-zinc-900 group-hover:text-zinc-700 transition duration-300 leading-tight">
              My Self-Nominations
            </h3>
            <p className="text-xs text-zinc-500 font-semibold mt-2 leading-relaxed">
              Manage your own personal deliverables and updates.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-zinc-700 mt-2">
            Open My List →
          </span>
        </button>

        {/* Card 4: Completed Archive */}
        <button
          onClick={() => setActiveModal('archive')}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-purple-500 rounded-2xl p-6 text-left shadow-sm transition-all duration-300 group flex flex-col justify-between hover:shadow-md min-h-[200px]"
        >
          <div className="flex justify-between items-start w-full">
            <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition duration-300">
              <Archive className="h-6 w-6 text-purple-600" />
            </div>
            <span className="bg-purple-100 text-purple-800 text-[10px] px-2.5 py-1 rounded-full font-black border border-purple-200">
              {archivedTasks.length} Completed
            </span>
          </div>
          <div>
            <h3 className="font-black text-lg text-zinc-900 group-hover:text-purple-600 transition duration-300 leading-tight">
              Completed Archive
            </h3>
            <p className="text-xs text-zinc-500 font-semibold mt-2 leading-relaxed">
              Manual access to see all completed and archived tasks inside the portal.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 mt-2">
            Open Archive →
          </span>
        </button>

      </div>


      </div>

      {/* ──────────────────────────────── MODALS ──────────────────────────────── */}

      {/* Faculty Tasks List Modal */}


      {/* Force Task Explanation Modal popup */}
      {forcingTaskId && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scaleIn text-zinc-900 border border-zinc-200" onClick={e => e.stopPropagation()}>
            <h4 className="font-black text-base text-zinc-900 uppercase tracking-wider mb-2">Force Task Assignment</h4>
            <p className="text-xs text-zinc-500 font-medium mb-4 leading-relaxed">Provide an explanation or note (mandatory) explaining why this task is required.</p>
            <form onSubmit={handleForceTaskSubmit} className="space-y-4">
              <textarea
                value={forceNoteInput}
                onChange={(e) => setForceNoteInput(e.target.value)}
                placeholder="Supervisor explanation/instruction note..."
                rows={3}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 px-4 text-xs font-medium placeholder-zinc-400 focus:bg-white focus:outline-none resize-none"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setForcingTaskId(null); setForceNoteInput(''); }}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 font-bold rounded-lg text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-xs transition shadow-md"
                >
                  Push Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {activeModal === 'faculty_tasks' && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden" style={{maxHeight:'88vh'}} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-200 p-6 shrink-0">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Faculty Deliverables & Statuses
              </h3>
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => { if (e.target.value) { handleExport(e.target.value); e.target.value = ''; } }}
                  className="rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs font-bold text-zinc-700 focus:outline-none cursor-pointer"
                >
                  <option value="">📊 Export Excel Report</option>
                  <option value="weekly">Weekly Report</option>
                  <option value="monthly">Monthly Report</option>
                  <option value="yearly">Yearly Report</option>
                  <option value="all">All Tasks</option>
                </select>
                <button 
                  onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}
                  className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-3 mb-4 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 w-full justify-between">
                  <div className="relative flex-1 min-w-[200px]">
                    <input
                      type="text"
                      placeholder="Search category, task description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-8 pr-3 text-xs focus:outline-none"
                    />
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={selectedFacultyId}
                      onChange={(e) => setSelectedFacultyId(e.target.value)}
                      className="rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs focus:outline-none"
                    >
                      <option value="All">All Faculty</option>
                      {facultyList.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>

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

              {/* Sorting controls */}
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
                  📅 Target Date {sortField === 'targetDate' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
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

              {/* List */}
              {loading ? (
                <div className="text-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 mx-auto"></div>
                </div>
              ) : facultyTasks.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-xl">
                  No active faculty tasks found.
                </div>
              ) : (
                <div className="overflow-x-auto border border-zinc-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Faculty Member</th>
                        <th className="py-3 px-4">Task Details</th>
                        <th className="py-3 px-4">Target Date</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Progress / Status</th>
                        <th className="py-3 px-4 text-right">Review Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {[...facultyTasks].sort((a, b) => {
                        let aVal = sortField.includes('.') ? getVal(a, sortField) : a[sortField];
                        let bVal = sortField.includes('.') ? getVal(b, sortField) : b[sortField];
                        if (sortField === 'targetDate') {
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
                      if (task.status === 'Not Started') statusColor = 'text-zinc-600 bg-zinc-100 border-zinc-200';
                      if (task.status === 'Awaiting Approval') {
                        if (task.progress === 0 && task.previousProgress === null) {
                          statusColor = 'text-blue-800 bg-blue-100 border-blue-200';
                        } else {
                          statusColor = 'text-purple-800 bg-purple-100 border-purple-200';
                        }
                      }
                      if (task.status === 'Awaiting Deletion') statusColor = 'text-orange-800 bg-orange-100 border-orange-200';

                      let prioColor = 'text-zinc-700 bg-zinc-100';
                      if (task.priority === 'High') prioColor = 'text-red-700 bg-red-100';
                      if (task.priority === 'Medium') prioColor = 'text-yellow-700 bg-yellow-100';

                      return (
                        <tr key={task.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-100'} hover:bg-zinc-200/50 transition group border-b border-zinc-200`}>
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-bold text-zinc-800">{task.user?.name}</p>
                              <p className="text-[10px] text-zinc-400 font-medium">{task.user?.position}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4 max-w-sm">
                            <div>
                              <span className="bg-blue-55 border border-blue-200 rounded px-2 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                                {task.category}
                              </span>
                              <p className="font-bold text-zinc-950 mt-1">{task.taskDescription}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-zinc-500 font-semibold">
                            {task.targetDate ? new Date(task.targetDate).toLocaleDateString() : 'No Target'}
                          </td>
                          <td className="py-4 px-4 font-bold">
                            <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${prioColor}`}>
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
                                  className={`h-full rounded-full ${isCompleted ? 'bg-green-500' : isDelayed ? 'bg-red-500' : 'bg-green-500'}`}
                                  style={{ width: `${task.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => handleOpenReview(task)}
                              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg active:scale-95 shadow transition"
                            >
                              Review & Sign
                            </button>
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

      {/* My Personal Tasks Modal */}
      {activeModal === 'my_tasks' && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden" style={{maxHeight:'88vh'}}>
            <div className="flex justify-between items-center border-b border-zinc-100 px-6 py-4 flex-shrink-0">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <List className="h-5 w-5 text-zinc-700" />
                My Nominations & Deliverables
              </h3>
              <button 
                onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}
                className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
              >
                Close List
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              {/* Sorting Bar */}
              <div className="flex items-center gap-2 mb-4 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 text-xs text-blue-900">
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
                  📅 Target Date {sortField === 'targetDate' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
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

            {loading ? (
              <div className="text-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 mx-auto"></div>
              </div>
            ) : myTasks.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-xl">
                No self-nominated tasks found.
              </div>
            ) : (
              <div className="overflow-x-auto border border-zinc-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Task Details</th>
                      <th className="py-3 px-4">Target Date</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Progress / Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {myTasks.sort((a, b) => {
                      let aVal = a[sortField];
                      let bVal = b[sortField];
                      if (sortField === 'targetDate') {
                        aVal = aVal ? new Date(aVal).getTime() : Infinity;
                        bVal = bVal ? new Date(bVal).getTime() : Infinity;
                      } else {
                        aVal = aVal ? String(aVal).toLowerCase() : '';
                        bVal = bVal ? String(bVal).toLowerCase() : '';
                      }
                      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
                      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
                      return 0;
                    }).map(task => {
                      const isDelayed = task.status === 'Delayed';
                      const isCompleted = task.status === 'Completed';

                      let statusColor = 'text-yellow-800 bg-yellow-100 border-yellow-200';
                      if (isCompleted) statusColor = 'text-green-800 bg-green-100 border-green-200';
                      if (isDelayed) statusColor = 'text-red-800 bg-red-100 border-red-200';
                      if (task.status === 'Not Started') statusColor = 'text-zinc-600 bg-zinc-100 border-zinc-200';
                      if (task.status === 'Awaiting Approval') {
                        if (task.progress === 0 && task.previousProgress === null) {
                          statusColor = 'text-blue-800 bg-blue-100 border-blue-200';
                        } else {
                          statusColor = 'text-purple-800 bg-purple-100 border-purple-200';
                        }
                      }
                      if (task.status === 'Rejected') statusColor = 'text-rose-800 bg-rose-100 border-rose-300';

                      let prioColor = 'text-zinc-700 bg-zinc-100';
                      if (task.priority === 'High') prioColor = 'text-red-700 bg-red-100';
                      if (task.priority === 'Medium') prioColor = 'text-yellow-700 bg-yellow-100';

                      return (
                        <tr key={task.id} className="hover:bg-zinc-50 transition group">
                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="bg-blue-50 border border-blue-200/80 rounded px-1.5 py-0.5 text-[9px] font-bold text-blue-700 uppercase tracking-wider">
                                  {task.category}
                                </span>
                                <span className="font-bold text-zinc-950 text-xs">{task.taskDescription}</span>
                              </div>
                              {/* Actor Labels */}
                              <div className="flex flex-wrap items-center gap-1 text-[9px] leading-tight">
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
                            {task.targetDate ? new Date(task.targetDate).toLocaleDateString() : 'No Target'}
                          </td>
                          <td className="py-4 px-4 font-bold">
                            <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${prioColor}`}>
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
                                  className={`h-full rounded-full ${isCompleted ? 'bg-green-500' : isDelayed ? 'bg-red-500' : 'bg-green-500'}`}
                                  style={{ width: `${task.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                           <td className="py-4 px-4 text-right">
                            <div className="flex justify-end gap-1.5 items-center">
                              {(() => {
                                const isWaiting = task.status === 'Awaiting Approval' || task.status === 'Awaiting Deletion';
                                const isRejected = task.status === 'Rejected';
                                const isPending = task.status === 'Pending Acceptance';
                                const isDisabled = isWaiting || isCompleted || isRejected || isPending;

                                const buttonTitle = isWaiting ? 'Pending approval' :
                                  isCompleted ? 'Completed' :
                                  isRejected ? 'Task Rejected - Awaiting Supervisor action' :
                                  isPending ? 'Pending Acceptance - Respond via Alert/Inbox' :
                                  'Edit Task';

                                return (
                                  <>
                                    <button
                                      disabled={isDisabled}
                                      onClick={() => handleOpenEditSelf(task)}
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
            )}
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
          onRejectTask={handleRejectNomination}
          onCancelTask={handleCancelNomination}
          onAcceptDelete={(taskId, isDeletion) => isDeletion ? handleApproveDeletion(taskId) : handleAcceptUpdate(taskId)}
          onRejectDelete={(taskId, reason) => handleRejectDeletion(taskId, reason)}
          onTaskClick={(task) => {
            setActiveModal(null);
            if (task.userId === user.id) {
              handleOpenEditSelf(task);
            } else {
              handleOpenReview(task);
            }
          }}
          onRefresh={fetchTasks}
          refreshDashboard={refreshDashboard}
          notifications={notifications}
          onDeleteNotification={onDeleteNotification}
        />
      )}

      {/* Archive Modal */}
      {activeModal === 'archive' && (() => {
        // Filter archive tasks
        const filteredArchive = archivedTasks.filter(t => {
          if (archiveSearch.trim() !== '') {
            const query = archiveSearch.toLowerCase();
            const desc = t.taskDescription?.toLowerCase() || '';
            const cat = t.category?.toLowerCase() || '';
            const owner = t.user?.name?.toLowerCase() || '';
            if (!desc.includes(query) && !cat.includes(query) && !owner.includes(query)) return false;
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
                    Completed Archive (Department)
                  </h3>
                  <p className="text-xs text-zinc-500 font-semibold mt-1">
                    Inspecting completed accomplishments. Cleared from active workspace view.
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
                    onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}
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
                      placeholder="Search archive by description, category, assignee..."
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
                          <th className="py-2.5 px-4 cursor-pointer hover:bg-zinc-100 transition" onClick={() => { archiveSortField === 'user.name' ? setArchiveSortDirection(d => d === 'asc' ? 'desc' : 'asc') : (setArchiveSortField('user.name'), setArchiveSortDirection('asc')); }}>Owner {archiveSortField === 'user.name' ? (archiveSortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                          <th className="py-2.5 px-4 cursor-pointer hover:bg-zinc-100 transition" onClick={() => { archiveSortField === 'taskDescription' ? setArchiveSortDirection(d => d === 'asc' ? 'desc' : 'asc') : (setArchiveSortField('taskDescription'), setArchiveSortDirection('asc')); }}>Task Details {archiveSortField === 'taskDescription' ? (archiveSortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                          <th className="py-2.5 px-4 cursor-pointer hover:bg-zinc-100 transition" onClick={() => { archiveSortField === 'updatedAt' ? setArchiveSortDirection(d => d === 'asc' ? 'desc' : 'asc') : (setArchiveSortField('updatedAt'), setArchiveSortDirection('asc')); }}>Completion Date {archiveSortField === 'updatedAt' ? (archiveSortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                          <th className="py-2.5 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {paginatedArchive.sort((a, b) => {
                          let aVal = archiveSortField.includes('.') ? getVal(a, archiveSortField) : a[archiveSortField];
                          let bVal = archiveSortField.includes('.') ? getVal(b, archiveSortField) : b[archiveSortField];
                          if (archiveSortField === 'updatedAt') {
                            aVal = aVal ? new Date(aVal).getTime() : 0;
                            bVal = bVal ? new Date(bVal).getTime() : 0;
                          } else {
                            aVal = aVal ? String(aVal).toLowerCase() : '';
                            bVal = bVal ? String(bVal).toLowerCase() : '';
                          }
                          if (aVal < bVal) return archiveSortDirection === 'asc' ? -1 : 1;
                          if (aVal > bVal) return archiveSortDirection === 'asc' ? 1 : -1;
                          return 0;
                        }).map((t, idx) => (
                          <tr key={t.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-100'} hover:bg-zinc-200/50 transition`}>
                            <td className="py-3 px-4 font-bold text-zinc-800">{t.user?.name}</td>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden" style={{maxHeight:'88vh'}} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg"><PlusCircle className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <h3 className="text-base font-black text-zinc-900">Nominate My Task</h3>
                  <p className="text-[11px] text-zinc-400 font-medium">Submit a personal deliverable for tracking</p>
                </div>
              </div>
              <button onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }} className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition">✕ Cancel</button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <form onSubmit={handleCreateSelfTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                  Assign To / Nominate User(s) (Type letter to filter, Select One or Multiple)
                </label>
                <AssigneeCombobox
                  users={[user, ...facultyList]}
                  selectedUserIds={assignToUserIds}
                  onChange={setAssignToUserIds}
                  placeholder="Type name, letter, or role to filter assignees..."
                  allowSelf={true}
                  currentUserId={user.id}
                />
              </div>
              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-800 text-xs font-bold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. HQ Syllabus, Exam Prep"
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

              <div className="border-t border-zinc-100 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}
                  className="rounded-lg hover:bg-zinc-50 text-zinc-500 py-2 px-4 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 font-bold text-xs shadow disabled:opacity-50"
                >
                  {submitting ? 'Nominating...' : 'Submit'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}


      {/* ─── MODAL OVERLAYS FOR EDITS ─── */}

      {/* Reviewing Faculty Task Modal */}
      {reviewingTask && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setReviewingTask(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden" style={{maxHeight:'88vh'}} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg"><Eye className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <h3 className="text-base font-black text-zinc-900">Review Faculty Deliverable</h3>
                  <p className="text-[11px] text-zinc-400 font-medium">Owner: <strong className="text-zinc-700">{reviewingTask.user?.name}</strong> — {reviewingTask.taskDescription?.substring(0,60)}</p>
                </div>
              </div>
              <button onClick={(e) => { if (e.target === e.currentTarget) setReviewingTask(null); }} className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition">✕ Cancel</button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-6">

            {reviewingTask.status === 'Awaiting Approval' ? (
              /* === AWAITING APPROVAL BANNER === */
              <div className="space-y-5">
                <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
                  <div className="text-2xl mt-0.5">⏳</div>
                  <div>
                    <p className="text-sm font-black text-amber-800">Progress Update Requested</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      <strong>{reviewingTask.user?.name}</strong> submitted a progress update request.
                      Current recorded progress: <strong>{reviewingTask.progress}%</strong>
                    </p>
                  </div>
                </div>

                {/* Progress Preview */}
                <div>
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                    <span className="text-zinc-500">Submitted Progress</span>
                    <span className="text-amber-600 text-sm font-black">{reviewingTask.progress}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-zinc-100 overflow-hidden">
                    <div className="h-3 rounded-full bg-amber-400 transition-all" style={{ width: `${reviewingTask.progress}%` }} />
                  </div>
                </div>

                {/* Supervisor Remarks */}
                <div className="space-y-2">
                  {reviewingTask.remarks && (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                      {renderRemarksLog(reviewingTask.remarks)}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-red-600 uppercase tracking-wider mb-1.5">Rejection Reason <span className="text-red-500">* Required to Reject</span></label>
                    <textarea
                      rows={2}
                      value={reviewRemarks}
                      onChange={(e) => setReviewRemarks(e.target.value)}
                      placeholder="Required: State clearly why this update is being rejected..."
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:bg-white focus:outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 border-t border-zinc-100 pt-4">
                  <button
                    type="button"
                    onClick={() => handleRejectCompletion(reviewingTask)}
                    className="flex-1 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 py-3 text-sm font-black transition"
                  >
                    ✕ Reject Update
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveCompletion(reviewingTask)}
                    className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white py-3 text-sm font-black shadow-lg transition"
                  >
                    ✓ Approve{reviewingTask.progress === 100 ? ' & Complete' : ' Update'}
                  </button>
                </div>
              </div>
            ) : reviewingTask.status === 'Awaiting Deletion' ? (
              /* === AWAITING DELETION BANNER === */
              <div className="space-y-5">
                <div className="rounded-xl border-2 border-orange-305 bg-orange-50 p-4 flex items-start gap-3">
                  <div className="text-2xl mt-0.5">🗑️</div>
                  <div>
                    <p className="text-sm font-black text-orange-800">Deletion Request Pending</p>
                    <p className="text-xs text-orange-700 mt-0.5">
                      <strong>{reviewingTask.user?.name}</strong> has requested to delete this task.
                      You can approve the deletion to permanently remove this deliverable, or reject it to return it to Ongoing.
                    </p>
                  </div>
                </div>

                {/* Supervisor Remarks */}
                <div className="space-y-2">
                  {reviewingTask.remarks && (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                      {renderRemarksLog(reviewingTask.remarks)}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-red-600 uppercase tracking-wider mb-1.5">Rejection Reason <span className="text-red-500">* Required to Reject</span></label>
                    <textarea
                      rows={2}
                      value={reviewRemarks}
                      onChange={(e) => setReviewRemarks(e.target.value)}
                      placeholder="Required: State clearly why this deletion is being rejected..."
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:bg-white focus:outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 border-t border-zinc-100 pt-4">
                  <button
                    type="button"
                    onClick={() => handleRejectDeletion(reviewingTask.id, reviewRemarks)}
                    className="flex-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 py-3 text-sm font-black transition"
                  >
                    ✕ Reject Deletion
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveDeletion(reviewingTask.id)}
                    className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white py-3 text-sm font-black shadow-lg transition"
                  >
                    🗑️ Approve Deletion
                  </button>
                </div>
              </div>
            ) : (reviewingTask.status !== 'Awaiting Approval' && reviewingTask.status !== 'Awaiting Deletion') ? (
              /* === READ-ONLY VIEWING FOR SUPERVISOR === */
              <div className="space-y-6 text-zinc-900">
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Current Status</span>
                    <span className="rounded border px-2 py-0.5 text-xs font-bold bg-blue-50 text-blue-700 border-blue-200">
                      {reviewingTask.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      <span>Task Progress</span>
                      <span>{reviewingTask.progress}%</span>
                    </div>
                    <div className="w-full bg-zinc-200 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-green-600 h-full rounded-full transition-all duration-300" style={{ width: `${reviewingTask.progress}%` }}></div>
                    </div>
                  </div>

                  {reviewingTask.remarks && (
                    <div className="pt-2 border-t border-zinc-200">
                      {renderRemarksLog(reviewingTask.remarks)}
                    </div>
                  )}

                  {reviewingTask.evidenceLink && (
                    <div className="pt-2 border-t border-zinc-200">
                      <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px] block mb-1">Evidence Link</span>
                      <a
                        href={reviewingTask.evidenceLink.startsWith('http') ? reviewingTask.evidenceLink : `https://${reviewingTask.evidenceLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline font-bold"
                      >
                        {reviewingTask.evidenceLink}
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setReviewingTask(null)}
                    className="rounded-lg bg-zinc-800 hover:bg-zinc-900 text-white py-2 px-6 font-bold text-xs shadow transition"
                  >
                    Close Viewer
                  </button>
                </div>
              </div>
            ) : (
              /* === NORMAL REVIEW FORM === */
              <form onSubmit={handleUpdateTaskReview} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Action Status</label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:outline-none"
                  >
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed (Approve & Archive)</option>
                    <option value="Delayed">Delayed / Overdue</option>
                    <option value="Not Started">Not Started</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider mb-2">
                    <span className="text-zinc-500">Supervised Progress</span>
                    <span className="text-blue-600 text-sm">{reviewProgress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={reviewProgress}
                    onChange={(e) => setReviewProgress(parseInt(e.target.value, 10))}
                    style={{ background: `linear-gradient(to right, #22c55e 0%, #22c55e ${reviewProgress}%, #e4e4e7 ${reviewProgress}%, #e4e4e7 100%)` }} className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-green-600 bg-zinc-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Supervisor Remarks</label>
                  <input
                    type="text"
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    placeholder="e.g. Good job, approved."
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
                  <button
                    type="button"
                    onClick={(e) => { if (e.target === e.currentTarget) setReviewingTask(null); }}
                    className="rounded-lg hover:bg-zinc-50 text-zinc-500 py-2 px-4 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 px-5 text-xs font-bold shadow disabled:opacity-50"
                  >
                    {updating ? 'Saving...' : 'Approve & Save'}
                  </button>
                </div>
              </form>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Editing Self Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setEditingTask(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden" style={{maxHeight:'88vh'}} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-zinc-100 rounded-lg"><Edit2 className="h-5 w-5 text-zinc-700" /></div>
                <div>
                  <h3 className="text-base font-black text-zinc-900">Edit My Deliverable</h3>
                  <p className="text-[11px] text-zinc-400 font-medium">Task: <strong className="text-zinc-700">{editingTask.taskDescription?.substring(0,60)}</strong></p>
                </div>
              </div>
              <button onClick={(e) => { if (e.target === e.currentTarget) setEditingTask(null); }} className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition">✕ Cancel</button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <form onSubmit={handleUpdateSelfTask} className="space-y-4">
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
                  style={{ background: `linear-gradient(to right, #22c55e 0%, #22c55e ${editProgress}%, #e4e4e7 ${editProgress}%, #e4e4e7 100%)` }} className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-green-600 bg-zinc-200"
                />
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

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Evidence Link (Optional)</label>
                <input
                  type="text"
                  value={editEvidenceLink}
                  onChange={(e) => setEditEvidenceLink(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-3 text-xs focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
                <button
                  type="button"
                  onClick={(e) => { if (e.target === e.currentTarget) setEditingTask(null); }}
                  className="rounded-lg hover:bg-zinc-50 text-zinc-500 py-2 px-4 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingTask}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 px-5 text-xs font-bold shadow disabled:opacity-50"
                >
                  {updatingTask ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
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

      {/* Click-routed Nomination Action Modal for PH */}
      {nominatedTaskToAction && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setNominatedTaskToAction(null)}>
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
  
    </>
  );
}