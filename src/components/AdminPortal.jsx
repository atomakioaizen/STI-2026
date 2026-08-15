"use client";

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, AlertTriangle, TrendingUp, 
  List, Search, RefreshCw, Eye, Edit2, Users, FileText,
  PlusCircle, Download, Plus, Settings, ChevronRight, Archive, ShieldAlert, Calendar, Bell, Inbox
} from 'lucide-react';
import CalendarView from './CalendarView';
import InsightsView from './InsightsView';
import SuperAlertModal from './SuperAlertModal';
import DelayEscalationModal from './DelayEscalationModal';
import SupervisorResponsivenessModal from './SupervisorResponsivenessModal';
import DelayBlockAlertModal from './DelayBlockAlertModal';
import AssigneeCombobox from './AssigneeCombobox';
import { exportTasksToExcel } from '@/lib/reports';
import { generateProfessionalExcelReport } from '@/lib/excelReport';
import { getTaskActorInfo, getPendingElapsedInfo, getTaskDelayDays, getSupervisorInactivityList } from '@/lib/taskHelpers';

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

export default function AdminPortal({ user, taskTrigger, setTaskTrigger, notifications = [], onDeleteNotification, refreshDashboard }) {
  const [tasks, setTasks] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null); 

  // Active Modals / Views
  const [activeModal, setActiveModal] = useState(null); // 'tasks' | 'users' | 'departments' | 'calendar' | 'insights' | 'archive' | 'nominate'
  const [showSuperAlert, setShowSuperAlert] = useState(true);
  const [delayBlockInfo, setDelayBlockInfo] = useState({ isOpen: false });

  const getVal = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  const ROLE_LEVELS = { SCHOOL_ADMIN: 4, ADMIN: 4, SECRETARY: 3.5, PRINCIPAL: 3, PROGRAM_HEAD: 2, FACULTY: 1, STAFF: 1, FACULTY_STAFF: 1 };
  const userLevel = ROLE_LEVELS[user.role] || 0;
  const availableRoles = [
    { value: 'FACULTY', label: 'Faculty (Academic)', level: 1 },
    { value: 'STAFF', label: 'Administrative Staff', level: 1 },
    { value: 'PROGRAM_HEAD', label: 'Program Head', level: 2 },
    { value: 'PRINCIPAL', label: 'Principal', level: 3 },
    { value: 'SECRETARY', label: 'Secretary / Executive Assistant', level: 3.5 },
    { value: 'SCHOOL_ADMIN', label: 'School Admin', level: 4 }
  ].filter(r => {
    if (r.level >= userLevel) return false;
    // Principal level account cannot create or manage Administrative Staff or Secretary
    if (user.role === 'PRINCIPAL' && (r.value === 'STAFF' || r.value === 'SECRETARY')) return false;
    return true;
  });

  // User Accounts UI States
  const [showCreateAccountForm, setShowCreateAccountForm] = useState(false);
  const [userSortField, setUserSortField] = useState('name');
  const [userSortDirection, setUserSortDirection] = useState('asc');

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [timeframeFilter, setTimeframeFilter] = useState('All'); 
  const [deptFilter, setDeptFilter] = useState('All'); 
  const [selectedUserFilter, setSelectedUserFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('targetDate');
  const [sortDirection, setSortDirection] = useState('asc');

  // Modals / Form States (User creation)
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserPosition, setNewUserPosition] = useState('');
  const [newUserRole, setNewUserRole] = useState('FACULTY_STAFF');
  const [newUserDeptId, setNewUserDeptId] = useState('');
  const [userFormError, setUserFormError] = useState('');
  const [userSubmitting, setUserSubmitting] = useState(false);

  // Department creation
  const [newDeptName, setNewDeptName] = useState('');
  const [deptFormError, setDeptFormError] = useState('');
  const [deptSubmitting, setDeptSubmitting] = useState(false);
  const [deptSortField, setDeptSortField] = useState('name');
  const [deptSortDirection, setDeptSortDirection] = useState('asc');
  const [archiveSortField, setArchiveSortField] = useState('updatedAt');
  const [archiveSortDirection, setArchiveSortDirection] = useState('desc');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveMonthFilter, setArchiveMonthFilter] = useState('All');
  const [archiveYearFilter, setArchiveYearFilter] = useState('All');
  const [archiveCurrentPage, setArchiveCurrentPage] = useState(1);


  // Task Assignment States
  const [taskCategory, setTaskCategory] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskTargetDate, setTaskTargetDate] = useState('');
  const [taskNominationPeriod, setTaskNominationPeriod] = useState('weekly');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskAssigneeIds, setTaskAssigneeIds] = useState([]);
  const [taskFormError, setTaskFormError] = useState('');
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // Auto-calculate target date based on nomination period
  useEffect(() => {
    const now = new Date();
    if (taskNominationPeriod === 'weekly') {
      const day = now.getDay();
      const diff = 6 - day;
      const saturday = new Date(now);
      saturday.setDate(now.getDate() + diff);
      setTaskTargetDate(saturday.toISOString().split('T')[0]);
    } else if (taskNominationPeriod === 'monthly') {
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setTaskTargetDate(endOfMonth.toISOString().split('T')[0]);
    } else if (taskNominationPeriod === 'yearly') {
      const endOfYear = new Date(now.getFullYear(), 11, 31);
      setTaskTargetDate(endOfYear.toISOString().split('T')[0]);
    } else if (taskNominationPeriod === 'custom') {
      setTaskTargetDate('');
    }
  }, [taskNominationPeriod]);

  // Task Review States
  const [reviewingTask, setReviewingTask] = useState(null);
  const [reviewProgress, setReviewProgress] = useState(0);
  const [reviewStatus, setReviewStatus] = useState('Ongoing');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewEvidenceLink, setReviewEvidenceLink] = useState('');
  const [reviewUpdating, setReviewUpdating] = useState(false);

  // Department Members Inspection State
  const [selectedDeptMembers, setSelectedDeptMembers] = useState(null);

  // Edit User States
  const [editingUser, setEditingUser] = useState(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserPosition, setEditUserPosition] = useState('');
  const [editUserRole, setEditUserRole] = useState('FACULTY_STAFF');
  const [editUserDeptId, setEditUserDeptId] = useState('');
  const [editUserError, setEditUserError] = useState('');
  const [editUserSubmitting, setEditUserSubmitting] = useState(false);
    const [customDialog, setCustomDialog] = useState(null);
  const [forcingTaskId, setForcingTaskId] = useState(null);
  const [forceNoteInput, setForceNoteInput] = useState(''); // { type: 'confirm'|'alert', title: '', message: '', onConfirm: () => void }
  const triggerConfirm = (title, message, onConfirm) => {
    setCustomDialog({ type: 'confirm', title, message, onConfirm });
  };
  const triggerAlert = (title, message) => {
    setCustomDialog({ type: 'alert', title, message });
  };

  useEffect(() => {
    fetchTasks();
    fetchArchivedTasks();
    fetchUsers();
    fetchDepartments();
  }, [statusFilter, priorityFilter, timeframeFilter, deptFilter]);

  useEffect(() => {
    if (taskTrigger && setTaskTrigger) {
      // Admins review tasks directly
      handleOpenReview(taskTrigger);
      setTaskTrigger(null);
    }
  }, [taskTrigger]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const url = new URL('/api/tasks', window.location.origin);
      url.searchParams.append('archived', 'false');
      if (statusFilter !== 'All') url.searchParams.append('status', statusFilter);
      if (priorityFilter !== 'All') url.searchParams.append('priority', priorityFilter);
      if (timeframeFilter !== 'All') url.searchParams.append('timeframe', timeframeFilter);
      if (deptFilter !== 'All') url.searchParams.append('departmentId', deptFilter);
      
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
      if (deptFilter !== 'All') url.searchParams.append('departmentId', deptFilter);
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

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }

  async function fetchDepartments() {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments);
        if (data.departments.length > 0 && !newUserDeptId) {
          setNewUserDeptId(data.departments[0].id.toString());
        }
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  }

  const handleExport = (timeframe, scope = 'all') => {
    const now = new Date();
    let filtered = [...tasks, ...archivedTasks];

    if (scope === 'individual') {
      filtered = filtered.filter(t => Number(t.userId) === Number(user.id));
    } else if (scope === 'department') {
      filtered = filtered.filter(t => (t.user?.departmentId && t.user.departmentId === user.departmentId) || t.departmentId === user.departmentId);
    }

    let timeframeLabel = 'All Time (5-Year Historical Archive)';
    if (timeframe === 'weekly') {
      const ago = new Date(); ago.setDate(now.getDate() - 7);
      filtered = filtered.filter(t => new Date(t.entryDate || t.createdAt) >= ago);
      timeframeLabel = 'Weekly Accomplishment Report (Last 7 Days)';
    } else if (timeframe === 'monthly') {
      const ago = new Date(); ago.setMonth(now.getMonth() - 1);
      filtered = filtered.filter(t => new Date(t.entryDate || t.createdAt) >= ago);
      timeframeLabel = 'Monthly Accomplishment Report (Last 30 Days)';
    } else if (timeframe === 'yearly') {
      const ago = new Date(); ago.setFullYear(now.getFullYear() - 1);
      filtered = filtered.filter(t => new Date(t.entryDate || t.createdAt) >= ago);
      timeframeLabel = 'Yearly Accomplishment Report (Current Year)';
    }

    const reportTitle = scope === 'individual' ? `${user.name.toUpperCase()} - INDIVIDUAL ACCOMPLISHMENTS REPORT`
      : scope === 'department' ? `${user.departmentName || 'DEPARTMENT'} - DEPARTMENTAL ACCOMPLISHMENTS REPORT`
      : 'INSTITUTIONAL DELIVERABLES & ACCOMPLISHMENTS REPORT';

    generateProfessionalExcelReport({
      tasks: filtered,
      user,
      users,
      reportTitle,
      timeframeLabel
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTasks();
  };

  const handleDeleteUser = (userId) => {
    setConfirmDialog({
      title: 'Delete User Account',
      message: 'Are you sure you want to delete this user account? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
          if (res.ok) {
            fetchUsers();
            fetchTasks();
            triggerAlert('Account Deleted', 'The user account has been successfully deleted.');
          } else {
            const data = await res.json();
            triggerAlert('Deletion Error', data.error || 'Failed to delete account.');
          }
        } catch (err) {
          console.error(err);
          triggerAlert('Error', 'Connection error while deleting account.');
        }
      }
    });
  };

  const handleDeleteDepartment = (deptId) => {
    setConfirmDialog({
      title: 'Delete Department',
      message: 'Are you sure you want to delete this department? All associated users will have their department cleared.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/departments?id=${deptId}`, { method: 'DELETE' });
          if (res.ok) {
            fetchDepartments();
            fetchUsers();
            triggerAlert('Department Deleted', 'The department has been successfully deleted.');
          } else {
            const data = await res.json();
            triggerAlert('Deletion Error', data.error || 'Failed to delete department.');
          }
        } catch (err) {
          console.error(err);
          triggerAlert('Error', 'Connection error while deleting department.');
        }
      }
    });
  };

  const handleCreateUser = async (e) => {
      e.preventDefault();
      triggerConfirm('Create User Account', 'Are you sure you want to create this user account?', () => {
        executeCreateUser();
      });
    };
    const executeCreateUser = async () => {
    if (!newUserName.trim() || !newUserUsername.trim() || !newUserPassword || (newUserRole !== 'PRINCIPAL' && !newUserDeptId)) {
      setUserFormError('All fields except Position are required.');
      return;
    }

    setUserFormError('');
    setUserSubmitting(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          username: newUserUsername.trim().toLowerCase(),
          password: newUserPassword,
          position: newUserPosition.trim(),
          role: newUserRole,
          departmentId: newUserRole === 'PRINCIPAL' ? null : parseInt(newUserDeptId, 10)
        })
      });

      if (res.ok) {
        setNewUserName('');
        setNewUserUsername('');
        setNewUserPassword('');
        setNewUserPosition('');
        setShowCreateAccountForm(false);
        fetchUsers();
      } else {
        const data = await res.json();
        setUserFormError(data.error || 'Failed to create user.');
      }
    } catch (err) {
      setUserFormError('Connection error. Try again.');
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleOpenEditUser = (targetUser) => {
    setEditingUser(targetUser);
    setEditUserName(targetUser.name);
    setEditUserUsername(targetUser.username);
    setEditUserPassword('');
    setEditUserPosition(targetUser.position || '');
    
    let effectiveRole = targetUser.role;
    if (effectiveRole === 'FACULTY_STAFF') {
      const deptName = targetUser.department?.name;
      effectiveRole = (deptName === 'Admin') ? 'STAFF' : 'FACULTY';
    }
    setEditUserRole(effectiveRole);
    setEditUserDeptId(targetUser.departmentId ? targetUser.departmentId.toString() : '');
    setEditUserError('');
  };

  const handleEditUserSubmit = async (e) => {
      e.preventDefault();
      triggerConfirm('Save User Changes', 'Are you sure you want to update this user account settings?', () => {
        executeEditUserSubmit();
      });
    };
    const executeEditUserSubmit = async () => {
    if (!editUserName.trim() || !editUserUsername.trim()) {
      setEditUserError('Name and Username are required.');
      return;
    }

    setEditUserError('');
    setEditUserSubmitting(true);

    try {
      const payload = {
        name: editUserName.trim(),
        username: editUserUsername.trim().toLowerCase(),
        role: editUserRole,
        departmentId: editUserDeptId ? parseInt(editUserDeptId, 10) : null,
        position: editUserPosition.trim()
      };
      if (editUserPassword) {
        payload.password = editUserPassword;
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setEditingUser(null);
        fetchUsers();
      } else {
        const data = await res.json();
        setEditUserError(data.error || 'Failed to update user.');
      }
    } catch (err) {
      setEditUserError('Connection error. Try again.');
    } finally {
      setEditUserSubmitting(false);
    }
  };

  const handleCreateDept = async (e) => {
      e.preventDefault();
      triggerConfirm('Create Department', 'Are you sure you want to create this department?', () => {
        executeCreateDept();
      });
    };
    const executeCreateDept = async () => {
    if (!newDeptName.trim()) {
      setDeptFormError('Department name is required.');
      return;
    }

    setDeptFormError('');
    setDeptSubmitting(true);

    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeptName.trim() })
      });

      if (res.ok) {
        setNewDeptName('');
        fetchDepartments();
      } else {
        const data = await res.json();
        setDeptFormError(data.error || 'Failed to create department.');
      }
    } catch (err) {
      setDeptFormError('Connection error. Try again.');
    } finally {
      setDeptSubmitting(false);
    }
  };

  const handleAssignTask = async (e) => {
      e.preventDefault();
      const selectedIds = taskAssigneeIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

      if (selectedIds.length === 0) {
        setTaskFormError('Please select at least one assignee name / user before assigning.');
        return;
      }

      if (!taskCategory.trim() || !taskDescription.trim() || !taskTargetDate) {
        setTaskFormError('Category, Description, Assignee(s), and Target Date are required.');
        return;
      }

      setTaskFormError('');
      triggerConfirm('Assign Deliverable', 'Are you sure you want to create and assign this deliverable?', () => {
        executeAssignTask();
      });
    };
    const executeAssignTask = async () => {
    const selectedIds = taskAssigneeIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

    if (!taskCategory.trim() || !taskDescription.trim() || selectedIds.length === 0 || !taskTargetDate) {
      setTaskFormError('Category, Description, Assignee(s), and Target Date are required.');
      return;
    }

    setTaskFormError('');
    setTaskSubmitting(true);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: taskCategory.trim(),
          taskDescription: taskDescription.trim(),
          priority: taskPriority,
          targetDate: taskTargetDate ? new Date(taskTargetDate).toISOString() : null,
          progress: 0,
          userIds: selectedIds
        })
      });

      if (res.ok) {
        setTaskCategory('');
        setTaskDescription('');
        setTaskTargetDate('');
        setTaskAssigneeIds([]);
        setTaskNominationPeriod('weekly');
        setActiveModal(null);
        fetchTasks();
        triggerAlert('Assignment Successful', 'The deliverable has been successfully assigned and logged!');
      } else {
        const data = await res.json();
        setTaskFormError(data.error || 'Failed to assign task.');
      }
    } catch (err) {
      setTaskFormError('Connection error. Try again.');
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleOpenReview = (task) => {
    setReviewingTask(task);
    setReviewProgress(task.progress || 0);
    setReviewStatus(task.status || 'Ongoing');
    setReviewRemarks('');
    setReviewEvidenceLink(task.evidenceLink || '');
  };

  const handleRequestDeletion = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchTasks();
        fetchArchivedTasks();
        triggerAlert('Task Deleted', 'Task deliverable permanently deleted.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTaskReview = async (e) => {
      e.preventDefault();
      triggerConfirm('Submit Review', 'Are you sure you want to save review changes and sign off?', () => {
        executeUpdateTaskReview();
      });
    };
    const executeUpdateTaskReview = async () => {
    setReviewUpdating(true);

    try {
      const res = await fetch(`/api/tasks/${reviewingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress: reviewProgress,
          status: reviewStatus,
          evidenceLink: reviewEvidenceLink.trim(),
          remarks: reviewRemarks.trim()
        })
      });

      if (res.ok) {
        setReviewingTask(null);
        fetchTasks();
        fetchArchivedTasks();
        triggerAlert('Task Updated', 'Task progress updated successfully.');
      } else {
        const data = await res.json();
        triggerAlert('Error', data.error || 'Failed to update task.');
      }
    } catch (err) {
      console.error('Error reviewing task', err);
    } finally {
      setReviewUpdating(false);
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

  const deleteAdminAction = async (taskId) => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
        if (res.ok) {
          fetchTasks();
          fetchArchivedTasks();
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
        triggerAlert('Task Forced', 'Task has been successfully pushed and made active.');
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

  const handleAcceptTaskAdmin = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Ongoing' })
      });
      if (res.ok) {
        fetchTasks();
        triggerAlert('Task Accepted', 'Task has been successfully accepted and added to your active deliverables.');
      } else {
        const data = await res.json();
        triggerAlert('Error', data.error || 'Failed to accept task.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectTaskAdmin = async (taskId, reason) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Rejected', rejectionReason: reason })
      });
      if (res.ok) {
        fetchTasks();
        triggerAlert('Task Rejected', 'Task rejected.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveDeletion = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTasks();
        triggerAlert('Deletion Approved', 'Task deleted.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectDeletion = async (taskId, reason) => {
    const finalReason = reason || reviewRemarks;
    if (!finalReason || !finalReason.trim()) {
      triggerAlert('Remarks Required', 'Please enter a reason before rejecting this deletion request.');
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
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleApproveUpdate = async (taskId) => {
    try {
      const taskRes = await fetch(`/api/tasks`);
      if (taskRes.ok) {
        const data = await taskRes.json();
        const task = data.tasks.find(t => t.id === taskId);
        if (task) {
          const isPrincipalAdminNomination = (task.nominatedBy?.role === 'PRINCIPAL' || task.nominatedBy?.position?.toLowerCase().includes('principal')) && (task.user?.department?.name === 'Admin' || task.user?.position?.toLowerCase().includes('admin')) && task.status === 'Awaiting Approval';
          const nextStatus = isPrincipalAdminNomination ? 'Pending Acceptance' : (task.progress === 100 ? 'Completed' : 'Ongoing');

          const res = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus })
          });
          if (res.ok) {
            fetchTasks();
            triggerAlert('Approved', isPrincipalAdminNomination ? 'Principal nomination approved and sent to Admin Staff as Pending Acceptance.' : 'Progress update approved.');
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelAdminNominatedTask = async (taskId) => {
    triggerConfirm('Cancel Task', 'Are you sure you want to cancel this rejected task nomination? This will permanently delete it.', async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
        if (res.ok) {
          fetchTasks();
          setReviewingTask(null);
          triggerAlert('Task Cancelled', 'Nomination was successfully cancelled.');
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleDeleteTask = async (taskId) => {
    triggerConfirm('Delete Task', 'Are you sure you want to permanently delete this task deliverable?', () => { deleteAdminAction(taskId); }); return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTasks();
        fetchArchivedTasks();
      }
    } catch (err) {
      console.error('Error deleting task', err);
    }
  };

  const scopedTasksForWarnings = user.role === 'SECRETARY' ? tasks.filter(t => Number(t.userId) === Number(user.id)) : tasks;
  const delayedCount = scopedTasksForWarnings.filter(t => t.status === 'Delayed').length;
  const awaitingApprovalCount = scopedTasksForWarnings.filter(t => t.status === 'Awaiting Approval').length;
  const awaitingDeletionCount = scopedTasksForWarnings.filter(t => t.status === 'Awaiting Deletion').length;
  const totalWarnings = delayedCount + awaitingApprovalCount + awaitingDeletionCount;

  return (
    <>
      <div className="space-y-8 animate-fadeIn text-zinc-950">

      {/* Super Warning alert popup if urgent */}
      {showSuperAlert && (
        <SuperAlertModal 
          tasks={tasks}
          user={user}
          onClose={() => setShowSuperAlert(false)}
          onAcceptTask={handleAcceptTaskAdmin}
          onRejectTask={handleRejectTaskAdmin}
          onCancelTask={handleCancelAdminNominatedTask}
          onForceTask={handleForceTaskDirect}
          onAcceptDelete={(taskId, isDeletion) => isDeletion ? handleApproveDeletion(taskId) : handleApproveUpdate(taskId)}
          onRejectDelete={(taskId, reason) => handleRejectDeletion(taskId, reason)}
          onTaskClick={(task) => {
            setShowSuperAlert(false);
            if (task.userId === user.id) {
              handleOpenReview(task);
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
      
      {/* Greetings Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 shadow-sm">
        <div className="flex-1">
          <h2 className="text-2xl font-black text-zinc-900">Administrator Console</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">
            Manage institutional users, departments, set task deadlines, and monitor compliance.
          </p>
        </div>

        {/* Real-time STI Completed Tasks Compact Stat Badge */}
        <div className="flex items-center gap-2.5 bg-emerald-50/90 border border-emerald-200/80 rounded-xl px-3.5 py-2 shrink-0">
          <div className="p-1 bg-emerald-500 text-white rounded-lg">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
              Total STI Tasks Completed:
            </span>
            <span className="text-sm font-black text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg">
              {archivedTasks.length + tasks.filter(t => t.status === 'Completed' || t.progress === 100).length}
            </span>
          </div>
        </div>

        <button
          onClick={() => setActiveModal('nominate')}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 shadow transition duration-200 active:scale-95 text-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          Assign Task to User
        </button>
      </div>

      {/* Cards Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Task Nominations / Institutional Deliverables */}
        {user.role !== 'SECRETARY' && (
          <button
            onClick={() => {
              setSelectedUserFilter('All');
              setActiveModal('tasks');
            }}
            className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 text-left shadow-sm transition group"
          >
            <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition inline-block">
              <List className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="mt-4 font-black text-lg text-zinc-900 group-hover:text-blue-600 transition">
              Manage Tasks
            </h3>
            <p className="text-xs text-zinc-500 font-semibold mt-1">
              Check and review task completion, nominations, and delayed requests across departments.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-600">
              Open Tasks List →
            </span>
          </button>
        )}

        {/* Card: My Self Nominations */}
        {(() => {
          const mySelfTasks = tasks.filter(t => Number(t.userId) === Number(user.id) && !t.archived && t.status !== 'Completed');
          return (
            <button
              onClick={() => {
                setSelectedUserFilter(user.id.toString());
                setActiveModal('tasks');
              }}
              className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-indigo-500 rounded-2xl p-6 text-left shadow-sm transition group flex flex-col justify-between"
            >
              <div className="flex justify-between items-start w-full">
                <div className="p-3 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition inline-block">
                  <PlusCircle className="h-6 w-6 text-indigo-600" />
                </div>
                {mySelfTasks.length > 0 && (
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2.5 py-1 rounded-full font-black border border-indigo-200">
                    {mySelfTasks.length} Active
                  </span>
                )}
              </div>
              <div>
                <h3 className="mt-4 font-black text-lg text-zinc-900 group-hover:text-indigo-600 transition">
                  My Self Nominations
                </h3>
                <p className="text-xs text-zinc-500 font-semibold mt-1">
                  View and manage your own personal tasks and deliverables.
                </p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
                View My Tasks ({mySelfTasks.length}) →
              </span>
            </button>
          );
        })()}

        {/* Card 2: Manage Users */}
        <button
          onClick={() => setActiveModal('users')}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 text-left shadow-sm transition group"
        >
          <div className="p-3 bg-green-50 rounded-xl group-hover:bg-green-100 transition inline-block">
            <Users className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="mt-4 font-black text-lg text-zinc-900 group-hover:text-green-600 transition">
            User Accounts ({users.length})
          </h3>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Add new staff, edit privileges, assign principal or program head roles.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-green-600">
            Manage Users →
          </span>
        </button>

        {/* Card 3: Departments */}
        <button
          onClick={() => setActiveModal('departments')}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 text-left shadow-sm transition group"
        >
          <div className="p-3 bg-zinc-50 rounded-xl group-hover:bg-zinc-200 transition inline-block">
            <Settings className="h-6 w-6 text-zinc-700" />
          </div>
          <h3 className="mt-4 font-black text-lg text-zinc-900 group-hover:text-zinc-700 transition">
            Departments ({departments.length})
          </h3>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Create and oversee departments in the academic structure.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-zinc-700">
            Configure Depts →
          </span>
        </button>

        {/* Card 4: Important Notices */}
        <button
          onClick={() => setActiveModal('notifications')}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-red-500 rounded-2xl p-6 text-left shadow-sm transition group flex flex-col justify-between min-h-[200px] hover:shadow-md"
        >
          <div className="flex justify-between items-start w-full">
            <div className="p-3 bg-red-50 rounded-xl group-hover:bg-red-100 transition inline-block">
              <Bell className="h-6 w-6 text-red-600" />
            </div>
            {totalWarnings > 0 && (
              <span className="bg-red-100 text-red-850 text-[10px] px-2.5 py-1 rounded-full font-black border border-red-200 animate-pulse">
                {totalWarnings} Warnings
              </span>
            )}
          </div>
          <div>
            <h3 className="mt-4 font-black text-lg text-zinc-900 group-hover:text-red-600 transition">
              Important Notices
            </h3>
            <p className="text-xs text-zinc-500 font-semibold mt-1">
              Check overdue alerts, warning flags, or pending approvals.
            </p>
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-red-600">
            Open Alerts →
          </span>
        </button>

        {/* Card 5: Archive */}
        <button
          onClick={() => setActiveModal('archive')}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 text-left shadow-sm transition group"
        >
          <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition inline-block">
            <Archive className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="mt-4 font-black text-lg text-zinc-900 group-hover:text-purple-600 transition">
            Archived Activities
          </h3>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            {archivedTasks.length + tasks.filter(t => t.status === 'Completed' || t.progress === 100).length} archived & completed tasks.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-purple-600">
            Open Archive →
          </span>
        </button>

        {/* Card 6: Delay & Escalations Tracker (Stat Card #1) */}
        {user.role !== 'SECRETARY' && (
          <button
            onClick={() => setActiveModal('delay_tracker')}
            className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-red-400 rounded-2xl p-6 text-left shadow-sm transition group"
          >
            <div className="flex justify-between items-start w-full">
              <div className="p-3 bg-red-50 rounded-xl group-hover:bg-red-100 transition inline-block">
                <Clock className="h-6 w-6 text-red-600" />
              </div>
              {tasks.filter(t => !t.archived && t.status !== 'Completed' && getTaskDelayDays(t) >= 3).length > 0 && (
                <span className="bg-red-100 text-red-800 text-[10px] px-2.5 py-1 rounded-full font-black border border-red-200 animate-pulse">
                  {tasks.filter(t => !t.archived && t.status !== 'Completed' && getTaskDelayDays(t) >= 3).length} Delayed
                </span>
              )}
            </div>
            <h3 className="mt-4 font-black text-lg text-zinc-900 group-hover:text-red-600 transition leading-tight">
              Delay &amp; Justification Tracker
            </h3>
            <p className="text-xs text-zinc-500 font-semibold mt-1">
              Track delay days, 3-day justifications, &amp; 4-7+ day NTE Drive reference links.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-red-600">
              Open Tracker →
            </span>
          </button>
        )}

        {/* Card 7: Supervisor Responsiveness Tracker (SCHOOL_ADMIN & SECRETARY) */}
        {(user.role === 'SCHOOL_ADMIN' || user.role === 'SECRETARY') && (
          <button
            onClick={() => setActiveModal('supervisor_responsiveness')}
            className="bg-white hover:bg-zinc-50 border border-purple-200 hover:border-purple-400 rounded-2xl p-6 text-left shadow-sm transition group border-2 border-dashed"
          >
            <div className="flex justify-between items-start w-full">
              <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition inline-block">
                <ShieldAlert className="h-6 w-6 text-purple-750" />
              </div>
              {getSupervisorInactivityList(tasks, users).reduce((acc, g) => acc + g.unactedCount, 0) > 0 && (
                <span className="bg-purple-100 text-purple-900 text-[10px] px-2.5 py-1 rounded-full font-black border border-purple-300">
                  {getSupervisorInactivityList(tasks, users).reduce((acc, g) => acc + g.unactedCount, 0)} Inactive
                </span>
              )}
            </div>
            <h3 className="mt-4 font-black text-lg text-zinc-900 group-hover:text-purple-800 transition leading-tight">
              Supervisor Responsiveness Tracker
            </h3>
            <p className="text-xs text-zinc-500 font-semibold mt-1">
              Executive view: Collapsible Program Head &amp; Principal unacted submissions tracker.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-purple-750">
              Inspect Supervisor Inactivity →
            </span>
          </button>
        )}

        {/* Card 8: Audit Logs & Insights (SCHOOL_ADMIN ONLY) */}
        {user.role === 'SCHOOL_ADMIN' && (
          <button
            onClick={() => setActiveModal('insights')}
            className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 text-left shadow-sm transition group"
          >
            <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition inline-block">
              <TrendingUp className="h-6 w-6 text-purple-700" />
            </div>
            <h3 className="mt-4 font-black text-lg text-zinc-900 group-hover:text-purple-800 transition">
              Activity Insights &amp; Logs
            </h3>
            <p className="text-xs text-zinc-500 font-semibold mt-1">
              Check actions, logins, and movements of all types of user logs.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-purple-750">
              Open Insights Panel →
            </span>
          </button>
        )}

      </div>

      </div>

      {/* ──────────────────────────────── MODALS ──────────────────────────────── */}

      {/* Audit Logs Insight Modal */}


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

      {activeModal === 'insights' && user.role === 'SCHOOL_ADMIN' && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden p-6" style={{ height: '85vh', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <InsightsView onClose={() => setActiveModal(null)} />
          </div>
        </div>
      )}

      {/* Task nominations modal */}
      {activeModal === 'tasks' && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden" style={{maxHeight:'88vh'}} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <List className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900">Institutional Deliverables</h3>
                  <p className="text-[11px] text-zinc-400 font-medium">{tasks.length} active tasks across all departments</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      const [tf, scope] = e.target.value.split(':');
                      handleExport(tf, scope || 'all');
                      e.target.value = '';
                    }
                  }}
                  className="rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs font-bold text-zinc-700 focus:outline-none cursor-pointer shadow-xs"
                >
                  <option value="">📊 Export Accomplishments to Excel ▾</option>
                  <optgroup label="👤 My Individual Accomplishments">
                    <option value="weekly:individual">My Weekly Accomplishments (Last 7 Days)</option>
                    <option value="monthly:individual">My Monthly Accomplishments (Last 30 Days)</option>
                    <option value="yearly:individual">My Yearly Accomplishments (Current Year)</option>
                    <option value="all:individual">My Full Accomplishment Archive (5-Year)</option>
                  </optgroup>
                  <optgroup label="🏢 Institutional / Full Report">
                    <option value="weekly:all">Institutional Weekly Report (Last 7 Days)</option>
                    <option value="monthly:all">Institutional Monthly Report (Last 30 Days)</option>
                    <option value="yearly:all">Institutional Yearly Report (Current Year)</option>
                    <option value="all:all">Full Institutional Archive (5-Year)</option>
                  </optgroup>
                </select>
                <button 
                  onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}
                  className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6">
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
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                      className="rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs focus:outline-none"
                    >
                      <option value="All">All Departments</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs focus:outline-none font-bold"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending Acceptance">Pending Acceptance</option>
                      <option value="Ongoing">Ongoing (In Progress)</option>
                      <option value="Awaiting Approval">Awaiting Approval</option>
                      <option value="Awaiting Deletion">Awaiting Deletion</option>
                      <option value="Completed">Completed</option>
                      <option value="Delayed">Delayed ⚠️</option>
                      <option value="Rejected">Rejected</option>
                    </select>

                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs focus:outline-none font-bold text-zinc-700 cursor-pointer"
                    >
                      <option value="All">⚡ All Priorities</option>
                      <option value="High">🔴 High Priority</option>
                      <option value="Medium">🟡 Medium Priority</option>
                      <option value="Low">⚪ Low Priority</option>
                    </select>

                    <button
                      type="submit"
                      className="p-2 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-lg transition active:scale-95"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-zinc-650" />
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
                  📅 Deadline Date {sortField === 'targetDate' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
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

              {(() => {
                const filteredTasks = tasks.filter(t => {
                  if (t.archived) return false;
                  if (selectedUserFilter !== 'All' && Number(t.userId) !== Number(selectedUserFilter)) return false;
                  if (deptFilter !== 'All' && Number(t.user?.departmentId) !== Number(deptFilter)) return false;
                  if (statusFilter !== 'All' && t.status !== statusFilter) return false;
                  if (priorityFilter !== 'All' && (t.priority || '').toUpperCase() !== priorityFilter.toUpperCase()) return false;

                  if (!searchQuery.trim()) return true;

                  const q = searchQuery.toLowerCase().trim();

                  const ownerName = (t.user?.name || '').toLowerCase();
                  const ownerDept = (t.user?.department?.name || '').toLowerCase();
                  const nominatorName = (t.nominatedBy?.name || '').toLowerCase();
                  const taskCategory = (t.category || '').toLowerCase();
                  const taskDesc = (t.taskDescription || '').toLowerCase();
                  const statusStr = (t.status || '').toLowerCase();
                  const priorityStr = (t.priority || '').toLowerCase();
                  const progressStr = `${t.progress}%`;

                  const createdDateStr = t.entryDate ? new Date(t.entryDate).toLocaleDateString('en-US', { dateStyle: 'short' }).toLowerCase() : '';
                  const createdDateFull = t.entryDate ? new Date(t.entryDate).toLocaleDateString('en-US', { dateStyle: 'medium' }).toLowerCase() : '';
                  const targetDateStr = t.targetDate ? new Date(t.targetDate).toLocaleDateString('en-US', { dateStyle: 'short' }).toLowerCase() : '';
                  const targetDateFull = t.targetDate ? new Date(t.targetDate).toLocaleDateString('en-US', { dateStyle: 'medium' }).toLowerCase() : '';

                  return (
                    ownerName.includes(q) ||
                    ownerDept.includes(q) ||
                    nominatorName.includes(q) ||
                    taskCategory.includes(q) ||
                    taskDesc.includes(q) ||
                    statusStr.includes(q) ||
                    priorityStr.includes(q) ||
                    progressStr.includes(q) ||
                    createdDateStr.includes(q) ||
                    createdDateFull.includes(q) ||
                    targetDateStr.includes(q) ||
                    targetDateFull.includes(q)
                  );
                });

                return loading ? (
                  <div className="text-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 mx-auto"></div>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-16 text-zinc-550 bg-zinc-50 border border-zinc-200 rounded-xl">
                    No active tasks found matching criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-zinc-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Owner</th>
                        <th className="py-3 px-4">Task Details</th>
                        <th className="py-3 px-4">Date Nominated / Created</th>
                        <th className="py-3 px-4">Target Deadline Date</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Progress / Status</th>
                        <th className="py-3 px-4 text-right">Review Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {[...filteredTasks].sort((a, b) => {
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
                        if (task.status === 'Awaiting Deletion') statusColor = 'text-orange-850 bg-orange-100 border-orange-200';

                        const pUpper = (task.priority || '').toUpperCase();
                        let prioColor = 'text-zinc-700 bg-zinc-100 border border-zinc-200';
                        if (pUpper === 'HIGH') prioColor = 'text-red-800 bg-red-100 border border-red-200 font-black';
                        else if (pUpper === 'MEDIUM') prioColor = 'text-amber-800 bg-amber-100 border border-amber-200 font-bold';
                        else prioColor = 'text-zinc-700 bg-zinc-100 border border-zinc-200 font-medium';

                        return (
                          <tr key={task.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-100'} hover:bg-zinc-200/50 transition border-b border-zinc-200`}>
                            <td className="py-4 px-4">
                              <div>
                                <p className="font-bold text-zinc-800">{task.user?.name}</p>
                                <p className="text-[10px] text-zinc-400 font-bold">{task.user?.department?.name || 'No Dept'}</p>
                              </div>
                            </td>
                            <td className="py-4 px-4 max-w-sm">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="bg-blue-50 border border-blue-200/80 rounded px-1.5 py-0.5 text-[9px] font-bold text-blue-700 uppercase tracking-wider">
                                    {task.category}
                                  </span>
                                  <span className="font-bold text-zinc-950 text-xs">{task.taskDescription}</span>
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
                                        {(() => {
                                          const elapsed = getPendingElapsedInfo(task);
                                          if (!elapsed) return null;
                                          return (
                                            <span className={`px-1.5 py-0.5 rounded border font-bold inline-flex items-center gap-0.5 ${elapsed.badgeClass}`}>
                                              <Clock className="h-2.5 w-2.5" />
                                              ⏳ {elapsed.text}
                                            </span>
                                          );
                                        })()}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-zinc-500 font-semibold">
                              {task.entryDate ? new Date(task.entryDate).toLocaleDateString('en-US', { dateStyle: 'short' }) : 'N/A'}
                            </td>
                            <td className="py-4 px-4 text-zinc-800 font-bold">
                              {task.targetDate ? new Date(task.targetDate).toLocaleDateString('en-US', { dateStyle: 'short' }) : 'No Target'}
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
                                <div className={`h-full ${isCompleted ? 'bg-green-500' : isDelayed ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${task.progress}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => handleOpenReview(task)}
                              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg shadow active:scale-95"
                            >
                              Review Task
                            </button>
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

      {/* Users account modal */}
      {activeModal === 'users' && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden" style={{maxHeight:'88vh'}} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-100 px-6 py-4 flex-shrink-0">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Manage User Accounts
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const nextState = !showCreateAccountForm;
                    setShowCreateAccountForm(nextState);
                    if (nextState) {
                      setNewUserName('');
                      setNewUserUsername('');
                      setNewUserPassword('');
                      setNewUserPosition('');
                      const initialRole = availableRoles[0]?.value || 'FACULTY';
                      setNewUserRole(initialRole);
                      const filteredDepts = departments.filter(d => initialRole === 'STAFF' ? d.name === 'Admin' : d.name !== 'Admin');
                      if (filteredDepts.length > 0) {
                        setNewUserDeptId(filteredDepts[0].id.toString());
                      }
                      setUserFormError('');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow transition flex items-center gap-1"
                >
                  {showCreateAccountForm ? 'Cancel' : <><Plus className="h-4 w-4" /> Add Account</>}
                </button>
                <button 
                  onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}
                  className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">

            {/* Create New User Inline Form */}
            {showCreateAccountForm && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 mb-6">
              <h4 className="text-sm font-bold text-zinc-800 mb-3 flex items-center gap-1.5">
                <PlusCircle className="h-4 w-4 text-blue-600" />
                Add New Staff / Account
              </h4>
              {userFormError && (
                <div className="bg-red-50 border border-red-200 p-2.5 rounded-lg text-red-800 font-bold text-xs mb-3">
                  {userFormError}
                </div>
              )}
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-3" autoComplete="off">
                <input
                  type="text"
                  placeholder="Full Name (e.g. John Doe)"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs focus:outline-none focus:bg-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Username (e.g. jdoe)"
                  value={newUserUsername}
                  onChange={(e) => setNewUserUsername(e.target.value)}
                  autoComplete="off"
                  name="new_user_username_clean"
                  className="rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs focus:outline-none"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  autoComplete="new-password"
                  name="new_user_password_clean"
                  className="rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs focus:outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Position (e.g. Instructor)"
                  value={newUserPosition}
                  onChange={(e) => setNewUserPosition(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs focus:outline-none"
                />
                <select
                  value={newUserRole}
                  onChange={(e) => {
                    const selectedRole = e.target.value;
                    setNewUserRole(selectedRole);
                    if (selectedRole === 'PRINCIPAL') {
                      setNewUserDeptId('');
                    } else {
                      const filtered = departments.filter(d => {
                        if (selectedRole === 'STAFF') return d.name === 'Admin';
                        return d.name !== 'Admin';
                      });
                      if (filtered.length > 0) {
                        setNewUserDeptId(filtered[0].id.toString());
                      }
                    }
                  }}
                  className="rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs font-bold text-zinc-700 focus:outline-none"
                >
                  {availableRoles.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>

                <div className="md:col-span-4 flex items-center gap-2">
                  <span className="text-zinc-500 font-bold text-xs uppercase">Dept:</span>
                  {newUserRole === 'PRINCIPAL' ? (
                    <select
                      disabled
                      className="flex-1 rounded-lg border border-zinc-200 bg-zinc-100 py-1.5 px-3 text-xs font-bold text-zinc-400 cursor-not-allowed select-none"
                    >
                      <option value="">N/A (All Academic Programs)</option>
                    </select>
                  ) : (
                    <select
                      value={newUserDeptId}
                      onChange={(e) => setNewUserDeptId(e.target.value)}
                      className="flex-1 rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs font-bold text-zinc-700 focus:outline-none"
                    >
                      {departments.filter(d => {
                        if (newUserRole === 'STAFF') {
                          return d.name === 'Admin';
                        } else {
                          return d.name !== 'Admin';
                        }
                      }).map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={userSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg py-2 text-xs transition disabled:opacity-50"
                >
                  {userSubmitting ? 'Saving...' : 'Add Account'}
                </button>
              </form>
            </div>
            )}

            {/* Users List Table */}
            <div className="overflow-x-auto border border-zinc-200 rounded-xl max-h-[60vh]">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 cursor-pointer hover:bg-zinc-100" onClick={() => { setUserSortField('name'); setUserSortDirection(userSortDirection === 'asc' ? 'desc' : 'asc'); }}>Name / Username {userSortField === 'name' ? (userSortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                    <th className="py-2.5 px-4 cursor-pointer hover:bg-zinc-100" onClick={() => { setUserSortField('role'); setUserSortDirection(userSortDirection === 'asc' ? 'desc' : 'asc'); }}>Role {userSortField === 'role' ? (userSortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                    <th className="py-2.5 px-4 cursor-pointer hover:bg-zinc-100" onClick={() => { setUserSortField('departmentId'); setUserSortDirection(userSortDirection === 'asc' ? 'desc' : 'asc'); }}>Department {userSortField === 'departmentId' ? (userSortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                    <th className="py-2.5 px-4 cursor-pointer hover:bg-zinc-100" onClick={() => { setUserSortField('position'); setUserSortDirection(userSortDirection === 'asc' ? 'desc' : 'asc'); }}>Position {userSortField === 'position' ? (userSortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                    <th className="py-2.5 px-4 text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {[...users].sort((a, b) => {
                    let aVal = a[userSortField] || '';
                    let bVal = b[userSortField] || '';
                    if (userSortField === 'departmentId') {
                      aVal = a.department?.name || '';
                      bVal = b.department?.name || '';
                    }
                    if (aVal < bVal) return userSortDirection === 'asc' ? -1 : 1;
                    if (aVal > bVal) return userSortDirection === 'asc' ? 1 : -1;
                    return 0;
                  }).map((u, idx) => (
                    <tr key={u.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-100'} hover:bg-zinc-200/50 transition`}>
                      <td className="py-2.5 px-4">
                        <div>
                          <span className="font-bold text-zinc-800">{u.name}</span>
                          <span className="text-[10px] text-zinc-400 block">@{u.username}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-zinc-650">
                        {u.role}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-blue-650">
                        {u.department?.name || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-500 font-semibold">
                        {u.position || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="text-xs bg-zinc-105 hover:bg-zinc-200 text-zinc-705 px-2 py-1 rounded border border-zinc-200 font-bold"
                          >
                            Edit
                          </button>
                          {u.id !== user.id && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded border border-red-200 font-bold"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Departments view modal */}
      {activeModal === 'departments' && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden" style={{maxHeight:'88vh'}} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-100 px-6 py-4 flex-shrink-0">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Settings className="h-5 w-5 text-zinc-700" />
                Institutional Departments
              </h3>
              <button 
                onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}
                className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
              >
                Close
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">

            {/* Create dept */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 mb-6">
              <h4 className="text-xs font-bold text-zinc-700 mb-2 uppercase">Create Department</h4>
              {deptFormError && (
                <div className="bg-red-50 border border-red-200 p-2 rounded text-red-800 text-[10px] font-bold mb-2">
                  {deptFormError}
                </div>
              )}
              <form onSubmit={handleCreateDept} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. BSIT Department"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={deptSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs shadow"
                >
                  Create
                </button>
              </form>
            </div>

            {/* Dept list */}
            <div className="border border-zinc-200 rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto flex-1 shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider select-none">
                  <tr>
                    <th className="py-2.5 px-4 cursor-pointer hover:bg-zinc-100 transition" onClick={() => { deptSortField === 'name' ? setDeptSortDirection(d => d === 'asc' ? 'desc' : 'asc') : (setDeptSortField('name'), setDeptSortDirection('asc')); }}>Department Name {deptSortField === 'name' ? (deptSortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                    <th className="py-2.5 px-4 text-center">Assigned Members</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {[...departments].sort((a, b) => {
                    const av = String(a[deptSortField] || '').toLowerCase();
                    const bv = String(b[deptSortField] || '').toLowerCase();
                    if (av < bv) return deptSortDirection === 'asc' ? -1 : 1;
                    if (av > bv) return deptSortDirection === 'asc' ? 1 : -1;
                    return 0;
                  }).map((d, idx) => {
                    const assignedUsers = users.filter(u => u.departmentId === d.id);
                    return (
                      <tr key={d.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-100'} hover:bg-zinc-200/50`}>
                        <td className="py-2.5 px-4 font-bold text-zinc-800">{d.name}</td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedDeptMembers({ dept: d, members: assignedUsers })}
                            className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-extrabold px-3 py-1 rounded-full text-xs transition active:scale-95 flex items-center gap-1.5 mx-auto"
                            title="Click to view assigned personnel"
                          >
                            <Users className="h-3.5 w-3.5" />
                            {assignedUsers.length} {assignedUsers.length === 1 ? 'Member' : 'Members'}
                          </button>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {d.name !== 'Admin' && (
                            <button
                              onClick={() => handleDeleteDepartment(d.id)}
                              className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 px-2 py-0.5 rounded border border-red-200 font-bold"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar: now shown persistently on-page above */}

      {/* Archive Modal */}
      {activeModal === 'archive' && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden" style={{maxHeight:'88vh'}} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-100 px-6 py-4 flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2 text-purple-800">
                  <Archive className="h-6 w-6" />
                  Institution Task Archive (Completed)
                </h3>
                <p className="text-xs text-zinc-500 font-semibold mt-1">
                  Manual access to inspect completed accomplishments. Kept clean from active workspaces.
                </p>
              </div>
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const [tf, scope] = e.target.value.split(':');
                        handleExport(tf, scope || 'all');
                        e.target.value = '';
                      }
                    }}
                    className="rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs font-bold text-zinc-700 focus:outline-none cursor-pointer shadow-xs hover:border-purple-300 transition"
                  >
                    <option value="">📊 Export Accomplishments to Excel ▾</option>
                    <optgroup label="👤 My Individual Accomplishments">
                      <option value="weekly:individual">My Weekly Accomplishments (Last 7 Days)</option>
                      <option value="monthly:individual">My Monthly Accomplishments (Last 30 Days)</option>
                      <option value="yearly:individual">My Yearly Accomplishments (Current Year)</option>
                      <option value="all:individual">My Full Accomplishment Archive (5-Year)</option>
                    </optgroup>
                    <optgroup label="🏢 Institutional / Full Report">
                      <option value="weekly:all">Institutional Weekly Report (Last 7 Days)</option>
                      <option value="monthly:all">Institutional Monthly Report (Last 30 Days)</option>
                      <option value="yearly:all">Institutional Yearly Report (Current Year)</option>
                      <option value="all:all">Full Institutional Archive (5-Year)</option>
                    </optgroup>
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
                    placeholder="Search archive by description, category, owner..."
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
                    {Array.from(new Set(archivedTasks.map(t => new Date(t.updatedAt || t.createdAt).getFullYear()))).sort((a,b)=>b-a).map(y => (
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
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                      <option key={m} value={idx.toString()}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {(() => {
              const filteredArchive = archivedTasks.filter(t => {
                if (archiveSearch.trim() !== '') {
                  const query = archiveSearch.toLowerCase();
                  const desc = t.taskDescription?.toLowerCase() || '';
                  const cat = t.category?.toLowerCase() || '';
                  const owner = t.user?.name?.toLowerCase() || '';
                  const dept = t.user?.department?.name?.toLowerCase() || '';
                  const status = t.status?.toLowerCase() || '';
                  const priority = t.priority?.toLowerCase() || '';
                  if (!desc.includes(query) && !cat.includes(query) && !owner.includes(query) && !dept.includes(query) && !status.includes(query) && !priority.includes(query)) return false;
                }
                if (archiveMonthFilter !== 'All') {
                  const month = new Date(t.updatedAt || t.createdAt).getMonth();
                  if (month !== parseInt(archiveMonthFilter, 10)) return false;
                }
                if (archiveYearFilter !== 'All') {
                  const year = new Date(t.updatedAt || t.createdAt).getFullYear();
                  if (year !== parseInt(archiveYearFilter, 10)) return false;
                }
                return true;
              });

              return (
                <div className="flex-1 min-h-0 overflow-y-auto p-6">
                {loadingArchive ? (
                  <div className="text-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 mx-auto"></div>
                  </div>
                ) : filteredArchive.length === 0 ? (
                  <div className="text-center py-16 text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-xl">
                    No archived deliverables found matching criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-zinc-200 rounded-xl max-h-[60vh]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider select-none">
                        <tr>
                          <th className="py-2.5 px-4 cursor-pointer hover:bg-zinc-100 transition" onClick={() => { archiveSortField === 'user.name' ? setArchiveSortDirection(d => d === 'asc' ? 'desc' : 'asc') : (setArchiveSortField('user.name'), setArchiveSortDirection('asc')); }}>Owner {archiveSortField === 'user.name' ? (archiveSortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                          <th className="py-2.5 px-4 cursor-pointer hover:bg-zinc-100 transition" onClick={() => { archiveSortField === 'user.department.name' ? setArchiveSortDirection(d => d === 'asc' ? 'desc' : 'asc') : (setArchiveSortField('user.department.name'), setArchiveSortDirection('asc')); }}>Department {archiveSortField === 'user.department.name' ? (archiveSortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                          <th className="py-2.5 px-4 cursor-pointer hover:bg-zinc-100 transition" onClick={() => { archiveSortField === 'taskDescription' ? setArchiveSortDirection(d => d === 'asc' ? 'desc' : 'asc') : (setArchiveSortField('taskDescription'), setArchiveSortDirection('asc')); }}>Task Details {archiveSortField === 'taskDescription' ? (archiveSortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                          <th className="py-2.5 px-4 cursor-pointer hover:bg-zinc-100 transition" onClick={() => { archiveSortField === 'priority' ? setArchiveSortDirection(d => d === 'asc' ? 'desc' : 'asc') : (setArchiveSortField('priority'), setArchiveSortDirection('asc')); }}>Priority Level {archiveSortField === 'priority' ? (archiveSortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                          <th className="py-2.5 px-4">Approved By</th>
                          <th className="py-2.5 px-4 cursor-pointer hover:bg-zinc-100 transition" onClick={() => { archiveSortField === 'updatedAt' ? setArchiveSortDirection(d => d === 'asc' ? 'desc' : 'asc') : (setArchiveSortField('updatedAt'), setArchiveSortDirection('asc')); }}>Completion Date {archiveSortField === 'updatedAt' ? (archiveSortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                          <th className="py-2.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {filteredArchive.sort((a, b) => {
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
                        }).map((t, idx) => {
                          const actorInfo = getTaskActorInfo(t);
                          const approverName = actorInfo.lastActionBy || t.nominatedBy?.name || 'School Administrator';

                          return (
                            <tr key={t.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-100'} hover:bg-zinc-200/50 transition border-b border-zinc-200`}>
                              <td className="py-3 px-4 font-bold text-zinc-800">{t.user?.name}</td>
                              <td className="py-3 px-4 text-zinc-550 font-semibold">{t.user?.department?.name || 'No Dept'}</td>
                              <td className="py-3 px-4">
                                <div>
                                  <span className="bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.2 rounded font-bold text-[9px] uppercase">
                                    {t.category}
                                  </span>
                                  <p className="font-bold text-zinc-800 mt-1">{t.taskDescription}</p>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-xs font-semibold text-zinc-700">
                                {t.priority || 'Medium'}
                              </td>
                              <td className="py-3 px-4 text-xs font-semibold text-zinc-700">
                                {approverName}
                              </td>
                              <td className="py-3 px-4 font-semibold text-zinc-550">
                                {new Date(t.updatedAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {(user.role === 'SCHOOL_ADMIN' || user.role === 'PRINCIPAL') ? (
                                  <div className="flex justify-end gap-1">
                                    <button
                                      onClick={() => handleRestoreTask(t.id)}
                                      className="text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-2 py-1 rounded border border-zinc-200 font-bold"
                                    >
                                      Restore
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTask(t.id)}
                                      className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded border border-red-200 font-bold"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded-full font-bold">
                                    Completed / Archived
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                  </tbody>
                    </table>
                  </div>
                )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Alerts / Inbox Modal */}
      {activeModal === 'notifications' && (
        <SuperAlertModal 
          tasks={tasks}
          user={user}
          onClose={() => setActiveModal(null)}
          onAcceptTask={handleAcceptTaskAdmin}
          onRejectTask={handleRejectTaskAdmin}
          onCancelTask={handleCancelAdminNominatedTask}
          onForceTask={handleForceTaskDirect}
          onAcceptDelete={(taskId, isDeletion) => isDeletion ? handleApproveDeletion(taskId) : handleApproveUpdate(taskId)}
          onRejectDelete={(taskId, reason) => handleRejectDeletion(taskId, reason)}
          onTaskClick={(task) => {
            setActiveModal(null);
            if (task.userId === user.id) {
              handleOpenReview(task);
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

      {/* Delay & Escalation Tracker Modal (Stat Card #1) */}
      <DelayEscalationModal
        isOpen={activeModal === 'delay_tracker'}
        onClose={() => setActiveModal(null)}
        tasks={[...tasks, ...archivedTasks]}
        user={user}
        onRefresh={fetchTasks}
      />

      {/* Supervisor Responsiveness Tracker Modal */}
      <SupervisorResponsivenessModal
        isOpen={activeModal === 'supervisor_responsiveness'}
        onClose={() => setActiveModal(null)}
        tasks={tasks}
        users={users}
        user={user}
      />

      {/* Nominate / Assign task modal */}
      {activeModal === 'nominate' && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-scaleIn text-zinc-900" style={{maxHeight:'88vh'}} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg"><PlusCircle className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <h3 className="text-base font-black text-zinc-900">Assign Task / Milestone to Staff</h3>
                  <p className="text-[11px] text-zinc-400 font-medium">Create and delegate institutional deliverables</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition">✕ Close</button>
            </div>

            <form onSubmit={handleAssignTask} className="flex flex-col flex-1 min-h-0">
              {/* Scrollable Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                {taskFormError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-800 text-xs font-bold animate-shake">
                    {taskFormError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                    Assign User(s) / Staff (Type letter to filter, Select One or Multiple)
                  </label>
                  <AssigneeCombobox
                    users={users}
                    selectedUserIds={taskAssigneeIds}
                    onChange={setTaskAssigneeIds}
                    placeholder="Type name, letter, department, or role to filter assignees..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Category</label>
                  <input
                    type="text"
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    placeholder="e.g. Syllabus Submission, Final Grades, Report"
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:bg-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Task Description</label>
                  <textarea
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Describe the milestone or deliverable expected..."
                    rows={3}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:bg-white focus:outline-none resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">🔒 Priority (Auto-Calculated by Urgency)</label>
                    <select
                      value={taskPriority}
                      disabled={true}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-100/90 py-2.5 px-3 text-xs focus:outline-none cursor-not-allowed font-bold text-zinc-700 select-none"
                    >
                      <option value="High">High (Urgent: Today / 1-3 Days)</option>
                      <option value="Medium">Medium (Moderate: 4-7 Days)</option>
                      <option value="Low">Low (Longer: &gt; 7 Days)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">🎯 Target Deadline Period</label>
                    <select
                      value={taskNominationPeriod}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTaskNominationPeriod(val);
                        const d = new Date();
                        if (val === 'daily' || val === 'today') {
                          const dateStr = d.toISOString().split('T')[0];
                          setTaskTargetDate(dateStr);
                          setTaskPriority('High');
                        } else if (val === 'weekly') {
                          d.setDate(d.getDate() + 7);
                          setTaskTargetDate(d.toISOString().split('T')[0]);
                          setTaskPriority('Medium');
                        } else if (val === 'monthly') {
                          d.setDate(d.getDate() + 30);
                          setTaskTargetDate(d.toISOString().split('T')[0]);
                          setTaskPriority('Low');
                        } else if (val === 'yearly') {
                          d.setDate(d.getDate() + 365);
                          setTaskTargetDate(d.toISOString().split('T')[0]);
                          setTaskPriority('Low');
                        }
                      }}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:outline-none"
                    >
                      <option value="daily">Within Today (High Urgency)</option>
                      <option value="weekly">This Week Deadline (Medium Urgency)</option>
                      <option value="monthly">This Month Deadline (Low Urgency)</option>
                      <option value="yearly">This Year Deadline (Low Urgency)</option>
                      <option value="custom">Set Specific Target Deadline Date</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">📅 Target Deadline Date (Date of Deadline)</label>
                  <p className="text-[10px] text-zinc-500 font-medium mb-1.5">Specify when this deliverable must be completed. Date Created/Nominated is recorded automatically today.</p>
                  <input
                    type="date"
                    value={taskTargetDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTaskTargetDate(val);
                      if (val) {
                        const now = new Date();
                        now.setHours(0, 0, 0, 0);
                        const target = new Date(val);
                        target.setHours(0, 0, 0, 0);
                        const diffTime = target.getTime() - now.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays <= 3) setTaskPriority('High');
                        else if (diffDays <= 7) setTaskPriority('Medium');
                        else setTaskPriority('Low');
                      }
                    }}
                    disabled={taskNominationPeriod !== 'custom'}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-zinc-100 px-6 py-4 flex justify-end gap-3 bg-zinc-50/50">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-lg hover:bg-zinc-100 text-zinc-500 py-2 px-5 text-xs font-bold border border-zinc-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskSubmitting}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 px-7 font-bold text-xs shadow transition disabled:opacity-50"
                >
                  {taskSubmitting ? 'Assigning...' : 'Assign Deliverable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ─── SPECIAL MODAL OVERLAYS FOR DETAILS ─── */}

      {/* Edit User Modal Overlay */}
      {editingUser && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setEditingUser(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden animate-scaleIn text-zinc-900" style={{maxHeight:'88vh'}} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-100 px-6 py-4 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Edit Account Privileges</h3>
                <p className="text-zinc-500 text-xs mt-0.5">Editing account: <span className="font-bold text-zinc-800">@{editingUser.username}</span></p>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
              >
                Cancel
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              {editUserError && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-red-800 font-bold text-xs mb-4">
                  {editUserError}
                </div>
              )}

              <form onSubmit={handleEditUserSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Display Name</label>
                  <input
                    type="text"
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-3 text-xs focus:outline-none focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Username</label>
                  <input
                    type="text"
                    value={editUserUsername}
                    onChange={(e) => setEditUserUsername(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-3 text-xs focus:outline-none focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Password (Leave blank to keep current)</label>
                  <input
                    type="password"
                    value={editUserPassword}
                    onChange={(e) => setEditUserPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-3 text-xs focus:outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Position</label>
                  <input
                    type="text"
                    value={editUserPosition}
                    onChange={(e) => setEditUserPosition(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-3 text-xs focus:outline-none focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Role</label>
                    <select
                      value={editUserRole}
                      onChange={(e) => {
                        const selectedRole = e.target.value;
                        setEditUserRole(selectedRole);
                        if (selectedRole === 'PRINCIPAL') {
                          setEditUserDeptId('');
                        } else {
                          const filtered = departments.filter(d => {
                            if (selectedRole === 'STAFF') return d.name === 'Admin';
                            return d.name !== 'Admin';
                          });
                          if (filtered.length > 0) {
                            setEditUserDeptId(filtered[0].id.toString());
                          }
                        }
                      }}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-3 text-xs font-bold text-zinc-700 focus:outline-none focus:bg-white"
                    >
                      {availableRoles.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Department</label>
                    {editUserRole === 'PRINCIPAL' ? (
                      <select
                        disabled
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-100 py-2 px-3 text-xs font-bold text-zinc-400 cursor-not-allowed select-none"
                      >
                        <option value="">N/A (All Academic Programs)</option>
                      </select>
                    ) : (
                      <select
                        value={editUserDeptId}
                        onChange={(e) => setEditUserDeptId(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-3 text-xs font-bold text-zinc-700 focus:outline-none focus:bg-white"
                      >
                        <option value="">No Department</option>
                        {departments.filter(d => {
                          if (editUserRole === 'STAFF') {
                            return d.name === 'Admin';
                          } else {
                            return d.name !== 'Admin';
                          }
                        }).map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="rounded-lg hover:bg-zinc-50 text-zinc-500 py-2 px-4 text-xs font-bold border border-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editUserSubmitting}
                    className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 px-5 text-xs font-bold shadow disabled:opacity-50 transition"
                  >
                    {editUserSubmitting ? 'Saving...' : 'Save User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Department Personnel Inspection Modal Overlay */}
      {selectedDeptMembers && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSelectedDeptMembers(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-scaleIn text-zinc-900" style={{maxHeight:'85vh'}} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-100 px-6 py-4 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-zinc-900">
                  <Users className="h-5 w-5 text-blue-600" />
                  {selectedDeptMembers.dept.name} — Department Personnel
                </h3>
                <p className="text-xs text-zinc-500 font-semibold mt-0.5">
                  Total of {selectedDeptMembers.members.length} assigned member(s)
                </p>
              </div>
              <button 
                onClick={() => setSelectedDeptMembers(null)}
                className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
              >
                Close
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              {selectedDeptMembers.members.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-xl font-semibold text-xs">
                  No personnel currently assigned to this department.
                </div>
              ) : (
                <div className="overflow-x-auto border border-zinc-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4">Name / Username</th>
                        <th className="py-2.5 px-4">Role</th>
                        <th className="py-2.5 px-4">Position</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {selectedDeptMembers.members.map((m, idx) => (
                        <tr key={m.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'} hover:bg-zinc-100 transition`}>
                          <td className="py-2.5 px-4">
                            <span className="font-bold text-zinc-800 block">{m.name}</span>
                            <span className="text-[10px] text-zinc-400">@{m.username}</span>
                          </td>
                          <td className="py-2.5 px-4 font-bold text-purple-700">
                            {m.role}
                          </td>
                          <td className="py-2.5 px-4 text-zinc-600 font-semibold">
                            {m.position || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Task Modal Overlay */}
      {reviewingTask && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setReviewingTask(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden text-zinc-900 animate-scaleIn" style={{maxHeight:'88vh'}} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg"><Eye className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <h3 className="text-base font-black text-zinc-900 font-sans">Review Deliverable</h3>
                  <p className="text-[11px] text-zinc-400 font-semibold font-sans">Owner: <strong className="text-zinc-700">{reviewingTask.user?.name}</strong> — {reviewingTask.taskDescription?.substring(0,60)}</p>
                </div>
              </div>
              <button onClick={() => setReviewingTask(null)} className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition">✕ Close</button>
            </div>
            
            <div className="flex-1 min-h-0 overflow-y-auto p-6 font-sans">
              {/* Task Details Banner */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Assignee</span>
                  <span className="font-extrabold text-zinc-900">{reviewingTask.user?.name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Nominated By</span>
                  <span className="font-extrabold text-zinc-900">{reviewingTask.nominatedBy?.name || 'Self-Nominated'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">📅 Date Created</span>
                  <span className="font-extrabold text-zinc-900">{reviewingTask.entryDate ? new Date(reviewingTask.entryDate).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">🎯 Target Deadline</span>
                  <span className="font-extrabold text-red-650">{reviewingTask.targetDate ? new Date(reviewingTask.targetDate).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'No Target'}</span>
                </div>
              </div>

              {reviewingTask.status === 'Awaiting Approval' ? (
                /* === AWAITING APPROVAL PANEL === */
                <div className="space-y-5">
                  <div className="rounded-xl border-2 border-amber-350 bg-amber-50 p-4 flex items-start gap-3">
                    <div className="text-2xl mt-0.5">⏳</div>
                    <div>
                      <p className="text-sm font-black text-amber-800">Progress Update Requested</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        <strong>{reviewingTask.user?.name}</strong> submitted a progress update request.
                        Current recorded progress: <strong>{reviewingTask.progress}%</strong>
                      </p>
                    </div>
                  </div>

                  {/* Progress View */}
                  <div>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                      <span className="text-zinc-500">Submitted Progress</span>
                      <span className="text-amber-600 text-sm font-black">{reviewingTask.progress}%</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-zinc-100 overflow-hidden">
                      <div className="h-3 rounded-full bg-amber-400 transition-all" style={{ width: `${reviewingTask.progress}%` }} />
                    </div>
                  </div>

                  {/* Remarks timeline */}
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
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:bg-white focus:outline-none resize-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 border-t border-zinc-100 pt-4">
                    <button
                      type="button"
                      disabled={Boolean(reviewUpdating)}
                      onClick={async () => {
                        if (!reviewRemarks.trim()) {
                          triggerAlert('Remarks Required', 'Please provide a reason to reject this progress update.');
                          return;
                        }
                        setReviewUpdating('reject');
                        try {
                          await handleRejectTaskAdmin(reviewingTask.id, reviewRemarks);
                        } finally {
                          setReviewUpdating(false);
                          setReviewingTask(null);
                          setReviewRemarks('');
                        }
                      }}
                      className="flex-1 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 py-3 text-xs font-black transition flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {reviewUpdating === 'reject' ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                          <span>Rejecting...</span>
                        </>
                      ) : (
                        <span>✕ Reject Update</span>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(reviewUpdating)}
                      onClick={async () => {
                        setReviewUpdating('approve');
                        try {
                          await handleApproveUpdate(reviewingTask.id);
                        } finally {
                          setReviewUpdating(false);
                          setReviewingTask(null);
                        }
                      }}
                      className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white py-3 text-xs font-black shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {reviewUpdating === 'approve' ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Approving...</span>
                        </>
                      ) : (
                        <span>✓ Approve{reviewingTask.progress === 100 ? ' & Complete' : ' Update'}</span>
                      )}
                    </button>
                  </div>
                </div>
              ) : reviewingTask.status === 'Awaiting Deletion' ? (
                /* === AWAITING DELETION PANEL === */
                <div className="space-y-5">
                  <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-4 flex items-start gap-3">
                    <div className="text-2xl mt-0.5">🗑️</div>
                    <div>
                      <p className="text-sm font-black text-orange-850">Deletion Request Pending</p>
                      <p className="text-xs text-orange-750 mt-0.5">
                        <strong>{reviewingTask.user?.name}</strong> has requested to delete this task.
                        You can approve the deletion to permanently remove this deliverable, or reject it to return it to Ongoing.
                      </p>
                    </div>
                  </div>

                  {/* Remarks timeline */}
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
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:bg-white focus:outline-none resize-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 border-t border-zinc-100 pt-4">
                    <button
                      type="button"
                      disabled={Boolean(reviewUpdating)}
                      onClick={async () => {
                        if (!reviewRemarks.trim()) {
                          triggerAlert('Remarks Required', 'Please provide a reason to reject this deletion request.');
                          return;
                        }
                        setReviewUpdating('reject_del');
                        try {
                          await handleRejectDeletion(reviewingTask.id, reviewRemarks);
                        } finally {
                          setReviewUpdating(false);
                          setReviewingTask(null);
                        }
                      }}
                      className="flex-1 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 py-3 text-xs font-black transition flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {reviewUpdating === 'reject_del' ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent" />
                          <span>Rejecting Deletion...</span>
                        </>
                      ) : (
                        <span>✕ Reject Deletion</span>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(reviewUpdating)}
                      onClick={async () => {
                        setReviewUpdating('approve_del');
                        try {
                          await handleApproveDeletion(reviewingTask.id);
                        } finally {
                          setReviewUpdating(false);
                          setReviewingTask(null);
                        }
                      }}
                      className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white py-3 text-xs font-black shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {reviewUpdating === 'approve_del' ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Approving Deletion...</span>
                        </>
                      ) : (
                        <span>🗑️ Approve Deletion</span>
                      )}
                    </button>
                  </div>
                </div>
              ) : Number(reviewingTask.userId) === Number(user.id || user.userId) ? (
                /* === TASK OWNER INTERACTIVE FORM === */
                <form onSubmit={handleUpdateTaskReview} className="space-y-4 font-sans text-zinc-900">
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider mb-2">
                      <span className="text-zinc-500">Progress</span>
                      <span className="text-blue-600 text-sm font-black">{reviewProgress}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={reviewProgress}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setReviewProgress(val);
                        if (val === 100) setReviewStatus('Completed');
                        else if (val < 100 && reviewStatus === 'Completed') setReviewStatus('Ongoing');
                      }}
                      style={{ background: `linear-gradient(to right, #22c55e 0%, #22c55e ${reviewProgress}%, #e4e4e7 ${reviewProgress}%, #e4e4e7 100%)` }}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-green-600 bg-zinc-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Action Status</label>
                    <select
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:outline-none font-bold"
                    >
                      <option value="Ongoing">Ongoing</option>
                      <option value="Completed">Completed</option>
                      <option value="Delayed">Delayed / Overdue</option>
                      <option value="Not Started">Not Started</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Evidence Link / Reference URL</label>
                    <input
                      type="url"
                      value={reviewEvidenceLink}
                      onChange={(e) => setReviewEvidenceLink(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:bg-white focus:outline-none font-medium"
                    />
                  </div>

                  {reviewingTask.remarks && (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                      {renderRemarksLog(reviewingTask.remarks)}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Add Progress Note / Remarks</label>
                    <input
                      type="text"
                      value={reviewRemarks}
                      onChange={(e) => setReviewRemarks(e.target.value)}
                      placeholder="e.g. Updated progress to 50%."
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-3 border-t border-zinc-100 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        triggerConfirm('Delete Task', 'Are you sure you want to permanently delete this task deliverable?', async () => {
                          await deleteAdminAction(reviewingTask.id);
                          setReviewingTask(null);
                        });
                      }}
                      className="flex-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-3 text-xs font-black transition"
                    >
                      Delete Task
                    </button>

                    <button
                      type="submit"
                      disabled={reviewUpdating}
                      className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-3 text-xs font-black shadow-lg disabled:opacity-50 transition"
                    >
                      {reviewUpdating ? 'Saving...' : 'Update Task Progress'}
                    </button>
                  </div>
                </form>
              ) : (
                /* === READ-ONLY MONITORING VIEW === */
                <div className="space-y-5 text-zinc-900">
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-zinc-200/55">
                      <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Category</span>
                      <span className="text-xs font-bold text-zinc-800">{reviewingTask.category}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-zinc-200/55">
                      <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Priority</span>
                      <span className="text-xs font-bold text-zinc-800">{reviewingTask.priority}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-zinc-200/55">
                      <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Due Date</span>
                      <span className="text-xs font-bold text-zinc-800">
                        {reviewingTask.targetDate ? new Date(reviewingTask.targetDate).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'No deadline'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-zinc-200/55">
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

                  <div className="flex justify-between border-t border-zinc-100 pt-4">
                    <div className="flex gap-2">
                      {reviewingTask.status === 'Rejected' && Number(reviewingTask.nominatedById) === Number(user.id) && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setReviewingTask(null);
                              setForcingTaskId(reviewingTask.id);
                            }}
                            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 text-xs font-bold transition shadow-sm"
                          >
                            Force Push
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelAdminNominatedTask(reviewingTask.id)}
                            className="rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 py-2 px-4 text-xs font-bold transition"
                          >
                            Cancel Nomination
                          </button>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setReviewingTask(null)}
                      className="rounded-lg bg-zinc-800 hover:bg-zinc-900 text-white py-2 px-6 font-bold text-xs shadow transition animate-none"
                    >
                      Close Viewer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gorgeous Custom Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setConfirmDialog(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scaleIn text-zinc-900 border border-zinc-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <h4 className="font-black text-base uppercase tracking-wide">{confirmDialog.title}</h4>
            </div>
            <p className="text-xs text-zinc-600 font-bold mb-6 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-250 text-zinc-700 font-bold rounded-lg text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition shadow-md active:scale-95"
              >
                Confirm
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

      <DelayBlockAlertModal 
        isOpen={delayBlockInfo.isOpen}
        onClose={() => setDelayBlockInfo({ isOpen: false })}
        onOpenTracker={() => setActiveModal('delay_escalation')}
        blockInfo={delayBlockInfo}
      />
    </>
  );
}