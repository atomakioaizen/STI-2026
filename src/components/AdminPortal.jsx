"use client";

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, AlertTriangle, TrendingUp, 
  List, Search, RefreshCw, Eye, Edit2, Users, FileText,
  PlusCircle, Download, Plus, Settings, ChevronRight, Archive, ShieldAlert, Calendar
} from 'lucide-react';
import CalendarView from './CalendarView';
import InsightsView from './InsightsView';
import { exportTasksToExcel } from '@/lib/reports';

export default function AdminPortal({ user }) {
  const [tasks, setTasks] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingArchive, setLoadingArchive] = useState(false);

  // Active Modals / Views
  const [activeModal, setActiveModal] = useState(null); // 'tasks' | 'users' | 'departments' | 'calendar' | 'insights' | 'archive' | 'nominate'

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [timeframeFilter, setTimeframeFilter] = useState('All'); 
  const [deptFilter, setDeptFilter] = useState('All'); 
  const [selectedUserFilter, setSelectedUserFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Task Assignment States
  const [taskCategory, setTaskCategory] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskTargetDate, setTaskTargetDate] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskFormError, setTaskFormError] = useState('');
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // Task Review States
  const [reviewingTask, setReviewingTask] = useState(null);
  const [reviewProgress, setReviewProgress] = useState(0);
  const [reviewStatus, setReviewStatus] = useState('Ongoing');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewUpdating, setReviewUpdating] = useState(false);

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

  useEffect(() => {
    fetchTasks();
    fetchArchivedTasks();
    fetchUsers();
    fetchDepartments();
  }, [statusFilter, priorityFilter, timeframeFilter, deptFilter, selectedUserFilter]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const url = new URL('/api/tasks', window.location.origin);
      url.searchParams.append('archived', 'false');
      if (statusFilter !== 'All') url.searchParams.append('status', statusFilter);
      if (priorityFilter !== 'All') url.searchParams.append('priority', priorityFilter);
      if (timeframeFilter !== 'All') url.searchParams.append('timeframe', timeframeFilter);
      if (deptFilter !== 'All') url.searchParams.append('departmentId', deptFilter);
      if (selectedUserFilter !== 'All') url.searchParams.append('userId', selectedUserFilter);
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
        if (data.users.length > 0 && !taskAssigneeId) {
          setTaskAssigneeId(data.users[0].id.toString());
        }
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

  const handleExport = (timeframe) => {
    const now = new Date();
    let filtered = [...tasks, ...archivedTasks];
    let title = 'Institution Tasks Report';
    if (timeframe === 'weekly') {
      const ago = new Date(); ago.setDate(now.getDate() - 7);
      filtered = filtered.filter(t => new Date(t.entryDate || t.createdAt) >= ago);
      title = 'Weekly Tasks Report';
    } else if (timeframe === 'monthly') {
      const ago = new Date(); ago.setMonth(now.getMonth() - 1);
      filtered = filtered.filter(t => new Date(t.entryDate || t.createdAt) >= ago);
      title = 'Monthly Tasks Report';
    } else if (timeframe === 'yearly') {
      const ago = new Date(); ago.setFullYear(now.getFullYear() - 1);
      filtered = filtered.filter(t => new Date(t.entryDate || t.createdAt) >= ago);
      title = 'Yearly Tasks Report';
    }
    exportTasksToExcel(filtered, title);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTasks();
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserUsername.trim() || !newUserPassword || !newUserDeptId) {
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
          departmentId: parseInt(newUserDeptId, 10)
        })
      });

      if (res.ok) {
        setNewUserName('');
        setNewUserUsername('');
        setNewUserPassword('');
        setNewUserPosition('');
        // Close modal
        setActiveModal('users');
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
    setEditUserRole(targetUser.role);
    setEditUserDeptId(targetUser.departmentId ? targetUser.departmentId.toString() : '');
    setEditUserError('');
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
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

      const res = await fetch(`/api/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingUser.id, ...payload })
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
    if (!taskCategory.trim() || !taskDescription.trim() || !taskAssigneeId) {
      setTaskFormError('Category, Description and Assignee are required.');
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
          userId: parseInt(taskAssigneeId, 10)
        })
      });

      if (res.ok) {
        setTaskCategory('');
        setTaskDescription('');
        setTaskTargetDate('');
        setActiveModal(null);
        fetchTasks();
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
    setReviewProgress(task.progress);
    setReviewStatus(task.status);
    setReviewRemarks(task.remarks || '');
  };

  const handleUpdateTaskReview = async (e) => {
    e.preventDefault();
    setReviewUpdating(true);

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

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to permanently delete this task?')) return;
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

  return (
    <div className="space-y-8 animate-fadeIn text-zinc-950">
      
      {/* Greetings Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-zinc-900">Administrator Console</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">
            Manage institutional users, departments, set task deadlines, and monitor compliance.
          </p>
        </div>
        <button
          onClick={() => setActiveModal('nominate')}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 shadow transition duration-200 active:scale-95 text-sm"
        >
          <Plus className="h-4 w-4" />
          Assign Task to User
        </button>
      </div>

      {/* Cards Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Task Nominations */}
        <button
          onClick={() => setActiveModal('tasks')}
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
          <div className="p-3 bg-zinc-50 rounded-xl group-hover:bg-zinc-150 transition inline-block">
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

        {/* Card 4: Calendar */}
        <button
          onClick={() => document.getElementById('deadline-calendar')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 text-left shadow-sm transition group"
        >
          <div className="p-3 bg-yellow-50 rounded-xl group-hover:bg-yellow-100 transition inline-block">
            <Calendar className="h-6 w-6 text-yellow-600" />
          </div>
          <h3 className="mt-4 font-black text-lg text-zinc-900 group-hover:text-yellow-600 transition">
            Deadlines Calendar
          </h3>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Track due dates and deadlines institutional-wide to check compliance.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-yellow-600">
            Scroll to Calendar ↓
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
            {archivedTasks.length} archived and completed tasks.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-purple-600">
            Open Archive →
          </span>
        </button>

        {/* Card 6: Audit Logs & Insights (SCHOOL_ADMIN ONLY) */}
        {user.role === 'SCHOOL_ADMIN' && (
          <button
            onClick={() => setActiveModal('insights')}
            className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 text-left shadow-sm transition group border-2 border-dashed border-purple-300"
          >
            <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition inline-block">
              <ShieldAlert className="h-6 w-6 text-purple-750 animate-pulse" />
            </div>
            <h3 className="mt-4 font-black text-lg text-zinc-900 group-hover:text-purple-800 transition">
              Activity Insights & Logs
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

      {/* Persistent Deadline Calendar */}
      <div id="deadline-calendar" className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
        <CalendarView tasks={tasks.concat(archivedTasks)} />
      </div>

      {/* ──────────────────────────────── MODALS ──────────────────────────────── */}

      {/* Audit Logs Insight Modal */}
      {activeModal === 'insights' && user.role === 'SCHOOL_ADMIN' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <InsightsView onClose={() => setActiveModal(null)} />
        </div>
      )}

      {/* Task nominations modal */}
      {activeModal === 'tasks' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 max-w-6xl w-full my-8 animate-scaleIn text-zinc-900">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <List className="h-5 w-5 text-blue-600" />
                Institutional Deliverables
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
                  onClick={() => setActiveModal(null)}
                  className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                >
                  Close List
                </button>
              </div>
            </div>

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
                    type="submit"
                    className="p-2 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-lg transition active:scale-95"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-zinc-650" />
                  </button>
                </div>
              </form>
            </div>

            {loading ? (
              <div className="text-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 mx-auto"></div>
              </div>
            ) : tasks.length === 0 ? (
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
                      <th className="py-3 px-4">Deadline</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Progress / Status</th>
                      <th className="py-3 px-4 text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {tasks.map((task, idx) => {
                      const isDelayed = task.status === 'Delayed';
                      const isCompleted = task.status === 'Completed';

                      let statusColor = 'text-yellow-800 bg-yellow-100 border-yellow-200';
                      if (isCompleted) statusColor = 'text-green-800 bg-green-100 border-green-200';
                      if (isDelayed) statusColor = 'text-red-800 bg-red-100 border-red-200';
                      if (task.status === 'Not Started') statusColor = 'text-zinc-600 bg-zinc-100 border-zinc-200';
                      if (task.status === 'Awaiting Approval') statusColor = 'text-purple-800 bg-purple-100 border-purple-200';
                      if (task.status === 'Awaiting Deletion') statusColor = 'text-orange-800 bg-orange-100 border-orange-200';

                      let prioColor = 'text-zinc-700 bg-zinc-100';
                      if (task.priority === 'High') prioColor = 'text-red-700 bg-red-100';
                      if (task.priority === 'Medium') prioColor = 'text-yellow-700 bg-yellow-100';

                      return (
                        <tr key={task.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-100'} hover:bg-zinc-200/50 transition border-b border-zinc-200`}>
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-bold text-zinc-800">{task.user?.name}</p>
                              <p className="text-[10px] text-zinc-400 font-bold">{task.user?.department?.name || 'No Dept'}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4 max-w-sm">
                            <div>
                              <span className="bg-blue-50 border border-blue-200 rounded px-2 py-0.5 text-[9px] font-bold text-blue-700 uppercase">
                                {task.category}
                              </span>
                              <p className="font-bold text-zinc-950 mt-1">{task.taskDescription}</p>
                              {task.remarks && <p className="text-zinc-500 italic mt-0.5 text-xxs">Remarks: {task.remarks}</p>}
                            </div>
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
                                <div className={`h-full ${isCompleted ? 'bg-green-500' : isDelayed ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${task.progress}%` }}></div>
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
            )}
          </div>
        </div>
      )}

      {/* Users account modal */}
      {activeModal === 'users' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 max-w-4xl w-full my-8 animate-scaleIn text-zinc-900">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Manage User Accounts
              </h3>
              <button 
                onClick={() => setActiveModal(null)}
                className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
              >
                Close Users
              </button>
            </div>

            {/* Create New User Inline Form */}
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
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
                  className="rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs focus:outline-none"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
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
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs focus:outline-none"
                >
                  <option value="FACULTY_STAFF">Faculty / Staff</option>
                  <option value="PROGRAM_HEAD">Program Head</option>
                  <option value="PRINCIPAL">Principal</option>
                  <option value="SCHOOL_ADMIN">School Admin</option>
                </select>

                <div className="md:col-span-4 flex items-center gap-2">
                  <span className="text-zinc-500 font-bold text-xs uppercase">Dept:</span>
                  <select
                    value={newUserDeptId}
                    onChange={(e) => setNewUserDeptId(e.target.value)}
                    className="flex-1 rounded-lg border border-zinc-200 bg-white py-1.5 px-3 text-xs focus:outline-none"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
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

            {/* Users List Table */}
            <div className="overflow-x-auto border border-zinc-200 rounded-xl max-h-[300px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Name / Username</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">Department</th>
                    <th className="py-2.5 px-4">Position</th>
                    <th className="py-2.5 px-4 text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {users.map((u, idx) => (
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
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-2 py-1 rounded border border-zinc-200"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Departments view modal */}
      {activeModal === 'departments' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 max-w-lg w-full animate-scaleIn text-zinc-900">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Settings className="h-5 w-5 text-zinc-700" />
                Institutional Departments
              </h3>
              <button 
                onClick={() => setActiveModal(null)}
                className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
              >
                Close
              </button>
            </div>

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
            <div className="border border-zinc-200 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Department Name</th>
                    <th className="py-2.5 px-4 text-right">ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {departments.map((d, idx) => (
                    <tr key={d.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-100'} hover:bg-zinc-200/50`}>
                      <td className="py-2.5 px-4 font-bold text-zinc-800">{d.name}</td>
                      <td className="py-2.5 px-4 text-right text-zinc-400 font-semibold">{d.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Calendar: now shown persistently on-page above */}

      {/* Archive Modal */}
      {activeModal === 'archive' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 max-w-5xl w-full animate-scaleIn text-zinc-900">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2 text-purple-800">
                  <Archive className="h-6 w-6" />
                  Institution Task Archive (Completed)
                </h3>
                <p className="text-xs text-zinc-500 font-semibold mt-1">
                  Manual access to inspect completed accomplishments. Kept clean from active workspaces.
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
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 mx-auto"></div>
              </div>
            ) : archivedTasks.length === 0 ? (
              <div className="text-center py-16 text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-xl">
                No archived deliverables found.
              </div>
            ) : (
              <div className="overflow-x-auto border border-zinc-200 rounded-xl max-h-[350px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Owner</th>
                      <th className="py-2.5 px-4">Department</th>
                      <th className="py-2.5 px-4">Task Details</th>
                      <th className="py-2.5 px-4">Completion Date</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {archivedTasks.map((t, idx) => (
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
                        <td className="py-3 px-4 font-semibold text-zinc-550">
                          {new Date(t.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
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

      {/* Nominate / Assign task modal */}
      {activeModal === 'nominate' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 max-w-xl w-full animate-scaleIn text-zinc-900">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-blue-600" />
                Assign Task / Milestone to Staff
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-zinc-400 text-xs px-2 py-1">
                Cancel
              </button>
            </div>

            <form onSubmit={handleAssignTask} className="space-y-4">
              {taskFormError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-800 text-xs font-bold animate-shake">
                  {taskFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Assign User</label>
                <select
                  value={taskAssigneeId}
                  onChange={(e) => setTaskAssigneeId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:outline-none focus:bg-white"
                  required
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} (Role: {u.role} • Dept: {u.department?.name || 'No Dept'})
                    </option>
                  ))}
                </select>
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
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:outline-none"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Target Completion Date</label>
                  <input
                    type="date"
                    value={taskTargetDate}
                    onChange={(e) => setTaskTargetDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:outline-none"
                  />
                </div>
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
                  disabled={taskSubmitting}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 font-bold text-xs shadow disabled:opacity-50"
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 max-w-md w-full animate-scaleIn text-zinc-900">
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Edit Account privileges</h3>
            <p className="text-zinc-500 text-xs mb-4">Editing account: <span className="font-bold">@{editingUser.username}</span></p>

            {editUserError && (
              <div className="bg-red-50 border border-red-200 p-2 rounded text-red-800 font-bold text-xs mb-2">
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
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-3 text-xs focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Username</label>
                <input
                  type="text"
                  value={editUserUsername}
                  onChange={(e) => setEditUserUsername(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-3 text-xs focus:outline-none"
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
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-3 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Position</label>
                <input
                  type="text"
                  value={editUserPosition}
                  onChange={(e) => setEditUserPosition(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-3 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Role</label>
                  <select
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-3 text-xs focus:outline-none"
                  >
                    <option value="FACULTY_STAFF">Faculty/Staff</option>
                    <option value="PROGRAM_HEAD">Program Head</option>
                    <option value="PRINCIPAL">Principal</option>
                    <option value="SCHOOL_ADMIN">School Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Department</label>
                  <select
                    value={editUserDeptId}
                    onChange={(e) => setEditUserDeptId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-3 text-xs focus:outline-none"
                  >
                    <option value="">No Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-lg hover:bg-zinc-50 text-zinc-500 py-2 px-4 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editUserSubmitting}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 px-5 text-xs font-bold shadow disabled:opacity-50"
                >
                  {editUserSubmitting ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Task Modal Overlay */}
      {reviewingTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl animate-scaleIn text-zinc-900">
            <h3 className="text-lg font-bold mb-2 text-zinc-900">Review Deliverable</h3>
            <p className="text-zinc-500 text-xs mb-4">
              Owner: <span className="font-bold text-zinc-800">{reviewingTask.user?.name}</span> • Description: <span className="italic">{reviewingTask.taskDescription}</span>
            </p>

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
                  <option value="Awaiting Approval">Awaiting Approval</option>
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
                  className="w-full h-1.5 bg-zinc-150 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Remarks</label>
                <input
                  type="text"
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder="Remarks..."
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 px-3 text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-between border-t border-zinc-100 pt-4">
                <button
                  type="button"
                  onClick={() => handleDeleteTask(reviewingTask.id)}
                  className="rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 py-2 px-4 text-xs font-bold"
                >
                  Delete Task
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewingTask(null)}
                    className="rounded-lg hover:bg-zinc-50 text-zinc-500 py-2 px-4 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewUpdating}
                    className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 px-5 text-xs font-bold shadow disabled:opacity-50"
                  >
                    {reviewUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
