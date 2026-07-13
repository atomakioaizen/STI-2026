"use client";

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, AlertTriangle, TrendingUp, 
  List, Search, RefreshCw, Eye, Edit2, Users, FileText,
  PlusCircle, Calendar, Plus, Trash2, ExternalLink, Archive, Bell
} from 'lucide-react';
import CalendarView from './CalendarView';
import SuperAlertModal from './SuperAlertModal';

export default function ProgramHeadPortal({ user }) {
  const [tasks, setTasks] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingArchive, setLoadingArchive] = useState(false);

  // Active Modals
  const [activeModal, setActiveModal] = useState(null); // 'faculty_tasks' | 'my_tasks' | 'calendar' | 'notifications' | 'archive' | 'nominate'
  const [showSuperAlert, setShowSuperAlert] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [timeframeFilter, setTimeframeFilter] = useState('All');
  const [selectedFacultyId, setSelectedFacultyId] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing/Reviewing Modal State (for Faculty Tasks)
  const [reviewingTask, setReviewingTask] = useState(null);
  const [reviewProgress, setReviewProgress] = useState(0);
  const [reviewStatus, setReviewStatus] = useState('Ongoing');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [updating, setUpdating] = useState(false);

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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTasks();
  };

  const handleOpenReview = (task) => {
    setReviewingTask(task);
    setReviewProgress(task.progress);
    setReviewStatus(task.status);
    setReviewRemarks(task.remarks || '');
  };

  const handleUpdateTaskReview = async (e) => {
    e.preventDefault();
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

  const handleCreateSelfTask = async (e) => {
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
          evidenceLink: evidenceLink.trim(),
          userId: user.id
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

  const handleOpenEditSelf = (task) => {
    setEditingTask(task);
    setEditProgress(task.progress);
    setEditStatus(task.status);
    setEditRemarks(task.remarks || '');
    setEditEvidenceLink(task.evidenceLink || '');
  };

  const handleUpdateSelfTask = async (e) => {
    e.preventDefault();
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

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to permanently delete this task?')) return;
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

  // Split tasks
  const facultyTasks = tasks.filter(t => t.userId !== user.id);
  const myTasks = tasks.filter(t => t.userId === user.id);

  // Metrics
  const totalTasks = tasks.length;
  const delayedTasks = tasks.filter(t => t.status === 'Delayed').length;
  const pendingApprovals = tasks.filter(t => t.status === 'Awaiting Approval').length;
  const pendingDeletions = tasks.filter(t => t.status === 'Awaiting Deletion').length;

  return (
    <div className="space-y-8 animate-fadeIn text-zinc-950">
      
      {/* Super Alert Modal for Overdue deadlines */}
      {showSuperAlert && (
        <SuperAlertModal 
          tasks={tasks.filter(t => t.userId === user.id)} 
          onClose={() => setShowSuperAlert(false)} 
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Faculty Tasks */}
        <button
          onClick={() => setActiveModal('faculty_tasks')}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 text-left shadow-sm transition group"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            {(pendingApprovals > 0 || pendingDeletions > 0) && (
              <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-purple-200">
                {pendingApprovals + pendingDeletions} Action Req.
              </span>
            )}
          </div>
          <h3 className="mt-4 font-black text-lg text-zinc-900 group-hover:text-blue-600 transition">
            Faculty Accomplishments
          </h3>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Review and approve nominated tasks from your faculty members.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-600">
            Open Faculty List →
          </span>
        </button>

        {/* Card 2: My Personal Tasks */}
        <button
          onClick={() => setActiveModal('my_tasks')}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 text-left shadow-sm transition group"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-zinc-50 rounded-xl group-hover:bg-zinc-100 transition">
              <List className="h-6 w-6 text-zinc-700" />
            </div>
            {myTasks.filter(t => t.status === 'Delayed').length > 0 && (
              <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-bold border border-red-200">
                {myTasks.filter(t => t.status === 'Delayed').length} Delayed
              </span>
            )}
          </div>
          <h3 className="mt-4 font-black text-lg text-zinc-900 group-hover:text-zinc-700 transition">
            My Self-Nominations
          </h3>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Manage your own personal deliverables and updates.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-zinc-700">
            Open My List →
          </span>
        </button>

        {/* Card 3: Calendar */}
        <button
          onClick={() => setActiveModal('calendar')}
          className="bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 text-left shadow-sm transition group"
        >
          <div className="p-3 bg-yellow-50 rounded-xl group-hover:bg-yellow-100 transition inline-block">
            <Calendar className="h-6 w-6 text-yellow-600" />
          </div>
          <h3 className="mt-4 font-black text-lg text-zinc-900 group-hover:text-yellow-600 transition">
            Department Calendar
          </h3>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Visual calendar of all deadlines for you and your faculty.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-yellow-600">
            View Calendar →
          </span>
        </button>

        {/* Card 4: Alerts */}
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
            Important Notices
          </h3>
          <p className="text-xs text-zinc-500 font-semibold mt-1">
            Check overdue alerts or warning flags inside the department.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-red-600">
            Open Alerts →
          </span>
        </button>

        {/* Card 5: Completed Archive */}
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
            {archivedTasks.length} archived and completed tasks in department.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-purple-600">
            View Archive →
          </span>
        </button>

      </div>


      {/* ──────────────────────────────── MODALS ──────────────────────────────── */}

      {/* Faculty Tasks List Modal */}
      {activeModal === 'faculty_tasks' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 max-w-6xl w-full my-8 animate-scaleIn text-zinc-900">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Faculty Deliverables & Statuses
              </h3>
              <button 
                onClick={() => setActiveModal(null)}
                className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
              >
                Close List
              </button>
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
                  <tbody className="divide-y divide-zinc-100">
                    {facultyTasks.map(task => {
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
                        <tr key={task.id} className="hover:bg-zinc-50 transition group">
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
                              {task.remarks && <p className="text-zinc-500 italic mt-0.5 text-xxs">Remarks: {task.remarks}</p>}
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
                                  {task.status}
                                </span>
                                <span className="text-zinc-500">{task.progress}%</span>
                              </div>
                              <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${isCompleted ? 'bg-green-500' : isDelayed ? 'bg-red-500' : 'bg-blue-500'}`}
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
      )}

      {/* My Personal Tasks Modal */}
      {activeModal === 'my_tasks' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 max-w-6xl w-full my-8 animate-scaleIn text-zinc-900">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <List className="h-5 w-5 text-zinc-700" />
                My Nominations & Deliverables
              </h3>
              <button 
                onClick={() => setActiveModal(null)}
                className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition"
              >
                Close List
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
                    {myTasks.map(task => {
                      const isDelayed = task.status === 'Delayed';
                      const isCompleted = task.status === 'Completed';

                      let statusColor = 'text-yellow-800 bg-yellow-100 border-yellow-200';
                      if (isCompleted) statusColor = 'text-green-800 bg-green-100 border-green-200';
                      if (isDelayed) statusColor = 'text-red-800 bg-red-100 border-red-200';
                      if (task.status === 'Not Started') statusColor = 'text-zinc-600 bg-zinc-100 border-zinc-200';

                      let prioColor = 'text-zinc-700 bg-zinc-100';
                      if (task.priority === 'High') prioColor = 'text-red-700 bg-red-100';
                      if (task.priority === 'Medium') prioColor = 'text-yellow-700 bg-yellow-100';

                      return (
                        <tr key={task.id} className="hover:bg-zinc-50 transition group">
                          <td className="py-4 px-4">
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
                          <td className="py-4 px-4 font-bold">
                            <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${prioColor}`}>
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
                                  className={`h-full rounded-full ${isCompleted ? 'bg-green-500' : isDelayed ? 'bg-red-500' : 'bg-blue-500'}`}
                                  style={{ width: `${task.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleOpenEditSelf(task)}
                                className="text-xs border border-zinc-200 bg-white hover:bg-zinc-50 px-2 py-1 rounded font-bold text-zinc-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleRequestDeletion(task.id)}
                                className="p-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
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
      )}

      {/* Calendar Modal */}
      {activeModal === 'calendar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <CalendarView 
            tasks={tasks.concat(archivedTasks)} 
            onClose={() => setActiveModal(null)} 
          />
        </div>
      )}

      {/* Alerts Notices Modal */}
      {activeModal === 'notifications' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 max-w-lg w-full animate-scaleIn text-zinc-900 text-center">
            <h3 className="text-xl font-bold flex items-center gap-2 justify-center text-red-650 mb-2">
              <Bell className="h-6 w-6" />
              Department Warning Hub
            </h3>
            <p className="text-xs text-zinc-500 font-semibold mb-6">
              Critical items requiring attention from the department head.
            </p>
            <div className="text-left space-y-3 max-h-[300px] overflow-y-auto mb-6">
              {pendingApprovals > 0 && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex gap-3 items-start">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-xs text-purple-800 uppercase tracking-wide">Approvals Pending</h4>
                    <p className="text-xs text-zinc-700 font-medium">You have {pendingApprovals} task completion requests awaiting review.</p>
                  </div>
                </div>
              )}
              {pendingDeletions > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex gap-3 items-start">
                  <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-xs text-orange-800 uppercase tracking-wide">Deletions Requested</h4>
                    <p className="text-xs text-zinc-700 font-medium">You have {pendingDeletions} tasks awaiting deletion signatures.</p>
                  </div>
                </div>
              )}
              {delayedTasks > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex gap-3 items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-xs text-red-800 uppercase tracking-wide">Delayed Deliverables</h4>
                    <p className="text-xs text-zinc-700 font-medium">There are {delayedTasks} delayed tasks inside your department.</p>
                  </div>
                </div>
              )}
              {pendingApprovals === 0 && pendingDeletions === 0 && delayedTasks === 0 && (
                <p className="text-center text-xs text-zinc-400 font-semibold py-8">
                  Everything is perfect. No alerts.
                </p>
              )}
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold py-3 px-6 rounded-xl border border-zinc-200"
            >
              Close Alerts
            </button>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {activeModal === 'archive' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 max-w-5xl w-full animate-scaleIn text-zinc-900">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2 text-purple-800">
                  <Archive className="h-6 w-6" />
                  Completed Archive (Department)
                </h3>
                <p className="text-xs text-zinc-500 font-semibold mt-1">
                  Manual access to see all completed tasks. Cleared from active workspace view.
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
                No archived entries found.
              </div>
            ) : (
              <div className="overflow-x-auto border border-zinc-200 rounded-xl max-h-[350px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Owner</th>
                      <th className="py-2.5 px-4">Task Details</th>
                      <th className="py-2.5 px-4">Completion Date</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {archivedTasks.map(t => (
                      <tr key={t.id} className="hover:bg-zinc-50 transition">
                        <td className="py-3 px-4 font-bold text-zinc-800">
                          {t.user?.name}
                        </td>
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

      {/* Nominate Task Modal */}
      {activeModal === 'nominate' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 max-w-xl w-full animate-scaleIn text-zinc-900">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-blue-600" />
                Nominate My Task
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-zinc-400 text-xs px-2 py-1">
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateSelfTask} className="space-y-4">
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
                  placeholder="https://..."
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
                  {submitting ? 'Nominating...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ─── MODAL OVERLAYS FOR EDITS ─── */}

      {/* Reviewing Faculty Task Modal */}
      {reviewingTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl animate-scaleIn text-zinc-900">
            <h3 className="text-lg font-bold mb-2 text-zinc-900">Review Faculty Deliverable</h3>
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
                  onClick={() => setReviewingTask(null)}
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
          </div>
        </div>
      )}

      {/* Editing Self Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl animate-scaleIn text-zinc-900">
            <h3 className="text-lg font-bold mb-2 text-zinc-900">Edit My Deliverable</h3>
            <p className="text-zinc-500 text-xs mb-4">Task: <span className="font-bold">{editingTask.taskDescription}</span></p>

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
                  onChange={(e) => setEditProgress(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-zinc-150 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Remarks</label>
                <input
                  type="text"
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-3 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Evidence Link</label>
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
                  onClick={() => setEditingTask(null)}
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
      )}

    </div>
  );
}
