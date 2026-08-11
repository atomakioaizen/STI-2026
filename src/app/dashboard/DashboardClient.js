"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, LayoutDashboard, Trophy, Bell, AlertTriangle, Clock, Calendar, Key, CheckCircle2 } from 'lucide-react';
import AdminPortal from '@/components/AdminPortal';
import ProgramHeadPortal from '@/components/ProgramHeadPortal';
import FacultyPortal from '@/components/FacultyPortal';
import Leaderboard from '@/components/Leaderboard';
import CalendarView from '@/components/CalendarView';

export default function DashboardClient({ user }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'leaderboard'
  const [tasks, setTasks] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [taskTrigger, setTaskTrigger] = useState(null);
  const [readNotifKeys, setReadNotifKeys] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('readNotifKeys_v5');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const clearNoticeKey = (key, logId = null) => {
    setReadNotifKeys(prev => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('readNotifKeys_v5', JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });

    if (logId) {
      handleAcknowledgeNotification(logId);
    }
  };

  const markTaskAsRead = (taskId) => {
    if (taskId) clearNoticeKey(`task-read-${taskId}`);
  };

  const [notifications, setNotifications] = useState([]);

  // Change Password States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  useEffect(() => {
    function handleClickOutside(event) {
      const widget = document.getElementById('floating-calendar-widget');
      if (widget && !widget.contains(event.target)) {
        setIsCalendarOpen(false);
      }
    }
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  const viewOnlyNoticesRef = useRef([]);

  useEffect(() => {
    function handleClickOutsideBell(event) {
      const container = document.getElementById('bell-notification-dropdown-container');
      if (container && !container.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutsideBell);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideBell);
    };
  }, [showNotifications]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcknowledgeNotification = async (id) => {
    try {
      const res = await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getTasks = async () => {
    try {
      const res = await fetch('/api/tasks?archived=false');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [isBellWiggling, setIsBellWiggling] = useState(false);
  const prevBellCountRef = useRef(0);

  const refreshDashboard = async () => {
    await Promise.all([getTasks(), fetchNotifications()]);
  };

  useEffect(() => {
    refreshDashboard();
    const interval = setInterval(() => {
      refreshDashboard();
    }, 3000);

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshDashboard();
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, []);

  const parseRemarks = (remarksStr) => {
    if (!remarksStr) return [];
    try {
      const parsed = JSON.parse(remarksStr);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
    return [];
  };

  const checkIsNominationRejection = (t) => {
    if (t.status !== 'Rejected') return false;
    return t.progress === 0;
  };

  const now = new Date();

  // Construct View-Only Notifications (combines ActivityLog AND task system logs + Delayed tasks)
  const viewOnlyNotices = [];

  // A. ActivityLog DB notifications (Task-related actions only)
  const validTaskActions = ['TASK_ACCEPTED', 'TASK_APPROVED', 'PROGRESS_REJECTED', 'TASK_RESTORED', 'REJECTED_DELETED', 'TASK_REJECTED', 'TASK_DELAYED'];
  notifications.forEach(n => {
    if (!validTaskActions.includes(n.action)) return;
    const key = `log-${n.id}`;
    if (!readNotifKeys.includes(key)) {
      let details = {};
      try { details = JSON.parse(n.details); } catch(e){}
      viewOnlyNotices.push({
        key,
        logId: n.id,
        type: n.action,
        details,
        createdAt: n.createdAt
      });
    }
  });

  // B. Task system logs (Handles existing past tasks updated recently)
  const threeDaysAgoMs = 3 * 24 * 60 * 60 * 1000;
  tasks.forEach(t => {
    const updatedAt = t.updatedAt ? new Date(t.updatedAt) : null;
    const isOwner = Number(t.userId) === Number(user.id);
    const isNominator = Number(t.nominatedById) === Number(user.id);

    // B1. Subordinate accepted nomination -> notify supervisor (View-Only)
    if (isNominator && (t.status === 'Ongoing' || t.status === 'Completed')) {
      const remarks = parseRemarks(t.remarks);
      const isAcceptedByLog = remarks.some(r => {
        const isSys = r.role === 'SYSTEM' || r.role === 'System' || r.role === 'SYSTEM_LOG';
        const text = (r.message || r.content || '').toLowerCase();
        return isSys && text.includes('nomination accepted');
      });

      if (isAcceptedByLog) {
        const key = `task-accepted-${t.id}`;
        const hasLog = viewOnlyNotices.some(v => v.details?.taskId === t.id && v.type === 'TASK_ACCEPTED');
        if (!hasLog && !readNotifKeys.includes(key)) {
          viewOnlyNotices.push({
            key,
            taskId: t.id,
            type: 'TASK_ACCEPTED',
            details: {
              taskId: t.id,
              taskDescription: t.taskDescription,
              assigneeName: t.user?.name || 'Assigned Staff'
            },
            createdAt: t.updatedAt
          });
        }
      }
    }

    // B2. Supervisor approved progress -> notify subordinate (View-Only)
    if (isOwner && (t.status === 'Ongoing' || t.status === 'Completed')) {
      const remarks = parseRemarks(t.remarks);
      const isApprovedByLog = remarks.some(r => {
        const isSys = r.role === 'SYSTEM' || r.role === 'System' || r.role === 'SYSTEM_LOG';
        const text = (r.message || r.content || '').toLowerCase();
        return isSys && (text.includes('approved progress') || text.includes('marked task as completed'));
      });

      if (isApprovedByLog) {
        const key = `task-approved-${t.id}`;
        const hasLog = viewOnlyNotices.some(v => v.details?.taskId === t.id && v.type === 'TASK_APPROVED');
        if (!hasLog && !readNotifKeys.includes(key)) {
          viewOnlyNotices.push({
            key,
            taskId: t.id,
            type: 'TASK_APPROVED',
            details: {
              taskId: t.id,
              taskDescription: t.taskDescription,
              supervisorName: 'Supervisor'
            },
            createdAt: t.updatedAt
          });
        }
      }
    }

    // B3. Delayed Task -> View-Only 1-Time Notification for Assignee or Nominator
    if (t.status === 'Delayed' && (isOwner || isNominator)) {
      const key = `task-delayed-${t.id}`;
      const hasLog = viewOnlyNotices.some(v => v.details?.taskId === t.id && v.type === 'TASK_DELAYED');
      if (!hasLog && !readNotifKeys.includes(key)) {
        viewOnlyNotices.push({
          key,
          taskId: t.id,
          type: 'TASK_DELAYED',
          details: {
            taskId: t.id,
            taskDescription: t.taskDescription,
            targetDate: t.targetDate
          },
          createdAt: t.updatedAt || t.targetDate
        });
      }
    }
  });

  viewOnlyNoticesRef.current = viewOnlyNotices;

  // 2. Action-Required Urgent Tasks (MUST STAY UNTIL ACTION IS EXECUTED BY USER)
  const urgentTasks = tasks.filter(t => {
    // 1. Pending Acceptance assigned to user (Requires Accept/Reject action)
    if (t.status === 'Pending Acceptance' && Number(t.userId) === Number(user.id)) return true;

    // 2. Awaiting Approval — notify supervisor only (Requires Approve/Reject action)
    if (t.status === 'Awaiting Approval' && Number(t.userId) !== Number(user.id)) {
      if (user.role === 'PROGRAM_HEAD' && t.user?.departmentId === user.departmentId) return true;
      if (user.role === 'SCHOOL_ADMIN' || user.role === 'PRINCIPAL') return true;
    }

    // 3. Awaiting Deletion — notify supervisor only (Requires Approve Deletion / Keep Task action)
    if (t.status === 'Awaiting Deletion' && Number(t.userId) !== Number(user.id)) {
      if (user.role === 'PROGRAM_HEAD' && t.user?.departmentId === user.departmentId) return true;
      if (user.role === 'SCHOOL_ADMIN' || user.role === 'PRINCIPAL') return true;
    }

    return false;
  });

  const totalBellCount = viewOnlyNotices.length + urgentTasks.length;

  useEffect(() => {
    if (totalBellCount > prevBellCountRef.current && prevBellCountRef.current !== 0) {
      setIsBellWiggling(true);
      const timer = setTimeout(() => setIsBellWiggling(false), 3000);
      return () => clearTimeout(timer);
    }
    prevBellCountRef.current = totalBellCount;
  }, [totalBellCount]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) { router.push('/'); }
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      setLoggingOut(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setPasswordError('Password cannot be empty.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordSubmitting(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword.trim() })
      });
      if (res.ok) {
        setPasswordSuccess('Password successfully updated!');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setShowPasswordModal(false), 1500);
      } else {
        const data = await res.json();
        setPasswordError(data.error || 'Failed to update password.');
      }
    } catch (err) {
      setPasswordError('Connection error. Try again.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'SCHOOL_ADMIN': return <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800 border border-purple-200">School Admin</span>;
      case 'PRINCIPAL':
      case 'ADMIN':        return <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 border border-red-200">Principal</span>;
      case 'PROGRAM_HEAD': return <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800 border border-blue-200">Program Head</span>;
      default:             return <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800 border border-green-200">Faculty / Staff</span>;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans antialiased text-zinc-900 pb-12">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-black tracking-tight text-zinc-950 flex items-center gap-2">
                Puerto Princesa
                <span className="text-xs text-zinc-400 font-bold border-l border-zinc-200 pl-2 uppercase tracking-wider">Task Monitor</span>
                <span className="text-xs font-black text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">v1.3</span>
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 border-r border-zinc-200 pr-4 text-right">
                <div>
                  <p className="text-sm font-bold text-zinc-900 leading-tight">{user.name}</p>
                  <p className="text-xs text-zinc-500 leading-tight font-medium">
                    {user.position} • {(user.role === 'PRINCIPAL' || user.role === 'PROGRAM_HEAD') ? 'AMT' : (user.departmentName || 'Admin')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 relative">
                {/* Notification Dropdown Trigger */}
                <div className="relative" id="bell-notification-dropdown-container">
                   <button
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      setIsBellWiggling(false);
                    }}
                    className={`rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-all active:scale-95 border relative ${
                      isBellWiggling
                        ? 'bg-red-50 text-red-600 border-red-400 ring-2 ring-red-400 animate-bounce shadow-md'
                        : 'bg-white border-zinc-200'
                    }`}
                    title="Notifications"
                  >
                     <Bell className={`h-4 w-4 ${isBellWiggling ? 'text-red-600 animate-pulse' : ''}`} />
                    {totalBellCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                        {totalBellCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl z-50 text-zinc-900">
                      <div className="border-b border-zinc-100 pb-2 mb-3 flex items-center justify-between gap-2">
                        <span className="font-extrabold text-sm text-zinc-800">Deadlines &amp; Alerts</span>
                        <div className="flex items-center gap-1.5">
                          {viewOnlyNotices.length > 0 && (
                            <button
                              onClick={() => {
                                viewOnlyNotices.forEach(v => clearNoticeKey(v.key, v.logId));
                              }}
                              className="text-[9px] font-black bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-700 px-2 py-0.5 rounded-md transition"
                              title="Clear all view-only notification cards"
                            >
                              Clear Notices
                            </button>
                          )}
                          <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                            {totalBellCount}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {/* 1. View-Only Notifications */}
                        {viewOnlyNotices.map(v => {
                          const isAccepted = v.type === 'TASK_ACCEPTED';
                          const isApproved = v.type === 'TASK_APPROVED';
                          const isProgressRejected = v.type === 'PROGRESS_REJECTED';
                          const isRejectedDeleted = v.type === 'REJECTED_DELETED';
                          const isTaskRejected = v.type === 'TASK_REJECTED';
                          const isRestored = v.type === 'TASK_RESTORED';
                          const isDelayedNotif = v.type === 'TASK_DELAYED';

                          const titleText = isAccepted ? 'Deliverable Accepted ✓'
                            : isApproved ? 'Progress Approved ✓'
                            : isProgressRejected ? 'Progress Rejected ✕'
                            : isRestored ? 'Task Restored ✓'
                            : isDelayedNotif ? 'Task Delayed ⚠️'
                            : isRejectedDeleted ? 'Nomination Rejected ✕'
                            : 'Deliverable Rejected ✕';

                          const badgeStyle = isAccepted || isApproved ? 'text-green-700' : isRestored ? 'text-blue-700' : 'text-red-700';
                          const cardBorder = isAccepted || isApproved ? 'bg-green-50/50 border-green-200' : isRestored ? 'bg-blue-50/50 border-blue-200' : 'bg-red-50/50 border-red-200';
                          const iconComp = isAccepted || isApproved ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : isRestored ? <CheckCircle2 className="h-3 w-3 text-blue-600" /> : <AlertTriangle className="h-3 w-3 text-red-600" />;

                          return (
                            <div key={`viewnotif-${v.key}`} className={`p-2.5 rounded-lg border text-left relative ${cardBorder}`}>
                              <div className="flex items-center justify-between font-bold text-[11px] uppercase tracking-wider mb-1">
                                <span className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider">
                                  {iconComp}
                                  <span className={badgeStyle}>{titleText}</span>
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    clearNoticeKey(v.key, v.logId);
                                  }}
                                  className="text-[9px] bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-700 px-1.5 py-0.5 rounded font-black transition"
                                  title="Clear this notice"
                                >
                                  ✕ Clear
                                </button>
                              </div>
                              <p className="text-[10px] text-zinc-700 font-extrabold leading-tight">
                                {isAccepted && (
                                  <>{v.details?.assigneeName || 'Staff'} accepted nominated deliverable <span className="text-zinc-950 font-black">"{v.details?.taskDescription}"</span>.</>
                                )}
                                {isApproved && (
                                  <>Supervisor {v.details?.supervisorName || 'Supervisor'} approved progress update for <span className="text-zinc-950 font-black">"{v.details?.taskDescription}"</span>.</>
                                )}
                                {isProgressRejected && (
                                  <>Supervisor {v.details?.supervisorName || 'Supervisor'} rejected progress update for <span className="text-zinc-950 font-black">"{v.details?.taskDescription}"</span>. {v.details?.rejectionReason ? `Reason: "${v.details.rejectionReason}"` : ''}</>
                                )}
                                {isRejectedDeleted && (
                                  <>Self-nominated task <span className="text-zinc-950 font-black">"{v.details?.taskDescription}"</span> was rejected and deleted by {v.details?.supervisorName || 'Supervisor'}. {v.details?.remarks ? `Reason: "${v.details.remarks}"` : ''}</>
                                )}
                                {isTaskRejected && (
                                  <>{v.details?.assigneeName || 'User'} rejected deliverable nomination <span className="text-zinc-950 font-black">"{v.details?.taskDescription}"</span>. {v.details?.rejectionReason ? `Reason: "${v.details.rejectionReason}"` : ''}</>
                                )}
                                {isRestored && (
                                  <>Your archived task <span className="text-zinc-950 font-black">"{v.details?.taskDescription}"</span> was restored. It is now active (Ongoing).</>
                                )}
                                {isDelayedNotif && (
                                  <>Task <span className="text-zinc-950 font-black">"{v.details?.taskDescription}"</span> has passed its target deadline and is now marked as Delayed.</>
                                )}
                              </p>
                            </div>
                          );
                        })}

                        {/* 2. Action-Required Urgent Tasks */}
                        {viewOnlyNotices.length === 0 && urgentTasks.length === 0 ? (
                          <p className="text-xs text-zinc-500 text-center py-4">No urgent deadlines or delayed tasks.</p>
                        ) : (
                          urgentTasks.map(t => {
                            const isDelayed = t.status === 'Delayed';
                            const isRejected = t.status === 'Rejected' || (t.status === 'Ongoing' && t.rejectionReason !== null);
                            const isPendingAcceptance = t.status === 'Pending Acceptance';
                            const isAwaitingApproval = t.status === 'Awaiting Approval';
                            const isAwaitingDeletion = t.status === 'Awaiting Deletion';
                            const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
                            const recentlyUpdated = t.updatedAt && new Date(t.updatedAt) >= threeHoursAgo;
                            
                            const remarks = parseRemarks(t.remarks);
                            
                            const checkLogText = (r, keyword) => {
                              if (!r) return false;
                              const isSys = r.role === 'SYSTEM' || r.role === 'System' || r.role === 'SYSTEM_LOG';
                              if (!isSys) return false;
                              const text = r.message || r.content || '';
                              return text.toLowerCase().includes(keyword.toLowerCase());
                            };

                            const isApproved = (t.status === 'Ongoing' || t.status === 'Completed') && 
                              Number(t.userId) === Number(user.id) && 
                              recentlyUpdated && 
                              remarks.some(r => checkLogText(r, 'approved progress') || checkLogText(r, 'marked task as completed'));
                              
                            const isCompleted = t.status === 'Completed' && isApproved;
                            
                            const isAccepted = (t.status === 'Ongoing' || t.status === 'Completed') && 
                              Number(t.nominatedById) === Number(user.id) && 
                              recentlyUpdated && 
                              remarks.some(r => checkLogText(r, 'nomination accepted'));
                              
                            const isForcePushed = t.status === 'Ongoing' && 
                              t.assignedNote && 
                              Number(t.userId) === Number(user.id) && 
                              recentlyUpdated && 
                              !remarks.some(r => checkLogText(r, 'nomination accepted'));
                            
                            let badgeColor = 'bg-amber-50/50 border-amber-200';
                            let icon = <Clock className="h-3 w-3 text-amber-600" />;
                            let label = 'Due Soon';
                            
                            if (isCompleted) {
                              badgeColor = 'bg-green-50/50 border-green-300';
                              icon = <CheckCircle2 className="h-3 w-3 text-green-600" />;
                              label = 'Approved & Completed ✓';
                            } else if (isApproved) {
                              badgeColor = 'bg-green-50/50 border-green-200';
                              icon = <CheckCircle2 className="h-3 w-3 text-green-600" />;
                              label = 'Update Approved ✓';
                            } else if (isAccepted) {
                              badgeColor = 'bg-green-50/50 border-green-200';
                              icon = <CheckCircle2 className="h-3 w-3 text-green-600" />;
                              label = 'Nomination Accepted ✓';
                            } else if (isForcePushed) {
                              badgeColor = 'bg-blue-50/50 border-blue-200';
                              icon = <Clock className="h-3 w-3 text-blue-600" />;
                              label = 'Task Assigned / Forced Ongoing ⚡';
                            } else if (isDelayed) {
                              badgeColor = 'bg-red-50/50 border-red-200';
                              icon = <AlertTriangle className="h-3 w-3 text-red-600" />;
                              label = 'Delayed';
                            } else if (isRejected) {
                              badgeColor = 'bg-red-50/50 border-red-300';
                              icon = <AlertTriangle className="h-3 w-3 text-red-750" />;
                              label = 'Rejected Update/Nomination';
                            } else if (isPendingAcceptance) {
                              badgeColor = 'bg-blue-50/50 border-blue-200';
                              icon = <Clock className="h-3 w-3 text-blue-600" />;
                              label = 'Awaiting Acceptance';
                            } else if (isAwaitingApproval) {
                              const isSelfNom = t.progress === 0 || t.previousProgress === null;
                              badgeColor = isSelfNom ? 'bg-blue-50/50 border-blue-200' : 'bg-purple-50/50 border-purple-200';
                              icon = <Clock className="h-3 w-3 text-purple-600" />;
                              label = isSelfNom ? 'Awaiting Nomination Approval' : 'Awaiting Progress Approval';
                            } else if (isAwaitingDeletion) {
                              badgeColor = 'bg-orange-50/50 border-orange-200';
                              icon = <AlertTriangle className="h-3 w-3 text-orange-655" />;
                              label = 'Deletion Requested';
                            }

                            return (
                              <div
                                key={t.id}
                                onClick={() => {
                                  setShowNotifications(false);
                                  setTaskTrigger(t);
                                  markTaskAsRead(t.id, t.updatedAt);
                                }}
                                className={`p-2.5 rounded-lg border text-left cursor-pointer hover:bg-zinc-50 hover:border-zinc-300 transition active:scale-[0.99] ${badgeColor}`}
                              >
                                <div className="flex items-center justify-between font-bold text-[11px] uppercase tracking-wider mb-1">
                                  <span className="flex items-center gap-1.5">
                                    {icon}
                                    <span className={isApproved || isAccepted ? 'text-green-700' : isForcePushed ? 'text-blue-700' : isDelayed || isRejected ? 'text-red-700' : isPendingAcceptance ? 'text-blue-700' : isAwaitingApproval ? (t.progress === 0 || t.previousProgress === null ? 'text-blue-700' : 'text-purple-700') : isAwaitingDeletion ? 'text-orange-700' : 'text-amber-700'}>
                                      {label}
                                    </span>
                                  </span>
                                  {(isAccepted || isApproved || isCompleted || isForcePushed) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markTaskAsRead(t.id, t.updatedAt);
                                      }}
                                      className="text-[9px] bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-700 px-1.5 py-0.5 rounded font-black transition"
                                      title="Clear this notice"
                                    >
                                      ✕ Clear
                                    </button>
                                  )}
                                </div>
                                <p className="text-xs font-bold text-zinc-800 line-clamp-1">{t.category}</p>
                                <p className="text-[11px] text-zinc-600 line-clamp-2 mt-0.5">{t.taskDescription}</p>
                                {isApproved && (
                                  <p className="text-[10px] text-green-700 font-bold bg-green-50/60 p-1.5 rounded border border-green-200 mt-1.5">
                                    ✓ Your progress update was approved by your supervisor.
                                  </p>
                                )}
                                {isAccepted && (
                                  <p className="text-[10px] text-green-700 font-bold bg-green-50/60 p-1.5 rounded border border-green-200 mt-1.5">
                                    ✓ Subordinate accepted your task nomination.
                                  </p>
                                )}
                                {isForcePushed && (
                                  <p className="text-[10px] text-blue-700 font-bold bg-blue-50/60 p-1.5 rounded border border-blue-200 mt-1.5 font-medium">
                                    ⚡ Supervisor forced this nominated task to Ongoing status. Please begin work.
                                  </p>
                                )}
                                {isRejected && (t.rejectionReason || t.remarks) && (
                                  <p className="text-[10px] text-red-750 font-bold bg-red-50 p-1.5 rounded border border-red-200 mt-1.5 italic">
                                    Reason: "{t.rejectionReason || t.remarks}"
                                  </p>
                                )}
                                {t.targetDate && (
                                  <p className="text-[9px] text-zinc-500 font-bold mt-1.5 flex items-center gap-1">
                                    <Calendar className="h-2.5 w-2.5" />
                                    Deadline: {new Date(t.targetDate).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                                  </p>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {getRoleBadge(user.role)}
                <button
                  onClick={() => {
                    setPasswordError('');
                    setPasswordSuccess('');
                    setShowPasswordModal(true);
                  }}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-all active:scale-95 border border-zinc-200 bg-white"
                  title="Change Password"
                >
                  <Key className="h-4 w-4" />
                </button>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-all active:scale-95 border border-zinc-200 bg-white"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Global Tab Switcher */}
      <div className="border-b border-zinc-200 bg-white shadow-xs sticky top-16 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 py-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all border ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border-transparent'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              My Dashboard
            </button>
            {user.role !== 'FACULTY_STAFF' && (
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all border ${
                  activeTab === 'leaderboard'
                    ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border-transparent'
                }`}
              >
                <Trophy className="h-4 w-4 text-amber-500" />
                Leaderboard
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 relative">
        {activeTab === 'leaderboard' && (user.role !== 'FACULTY_STAFF' && user.role !== 'FACULTY' && user.role !== 'STAFF') ? (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6">
            <Leaderboard user={user} />
          </div>
        ) : (
          <>
            {(user.role === 'ADMIN' || user.role === 'PRINCIPAL' || user.role === 'SCHOOL_ADMIN') && <AdminPortal user={user} taskTrigger={taskTrigger} setTaskTrigger={setTaskTrigger} notifications={notifications} onDeleteNotification={handleAcknowledgeNotification} refreshDashboard={refreshDashboard} />}
            {user.role === 'PROGRAM_HEAD' && <ProgramHeadPortal user={user} taskTrigger={taskTrigger} setTaskTrigger={setTaskTrigger} notifications={notifications} onDeleteNotification={handleAcknowledgeNotification} refreshDashboard={refreshDashboard} />}
            {(user.role === 'FACULTY_STAFF' || user.role === 'FACULTY' || user.role === 'STAFF') && <FacultyPortal user={user} taskTrigger={taskTrigger} setTaskTrigger={setTaskTrigger} notifications={notifications} onDeleteNotification={handleAcknowledgeNotification} refreshDashboard={refreshDashboard} />}
          </>
        )}
      </main>

      {/* Sticky Interactive Calendar Widget (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <div id="floating-calendar-widget" className={`transition-all duration-300 ease-in-out bg-white/80 backdrop-blur-md border border-zinc-250/60 shadow-2xl rounded-2xl overflow-hidden flex flex-col ${
          isCalendarOpen 
            ? 'w-[400px] h-[550px] p-4 opacity-100' 
            : 'w-72 h-14 p-3 hover:bg-white/95 cursor-pointer opacity-90 hover:opacity-100'
        }`}
        onClick={() => { if (!isCalendarOpen) setIsCalendarOpen(true); }}
        >
          {isCalendarOpen ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-zinc-200/50 flex-shrink-0">
                <h4 className="text-xs font-black text-zinc-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <Calendar className="h-4 w-4 text-blue-600 animate-pulse" />
                  Deadlines Calendar
                </h4>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCalendarOpen(false);
                  }}
                  className="text-[10px] text-zinc-500 hover:text-zinc-800 bg-zinc-100/80 hover:bg-zinc-200/85 border border-zinc-300/40 px-2 py-0.5 rounded font-bold transition"
                >
                  Minimize
                </button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                <CalendarView tasks={tasks} isFloating={true} onTaskClick={(t) => { setIsCalendarOpen(false); setTaskTrigger(t); }} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full h-full">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 rounded-lg relative">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  {urgentTasks.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                  )}
                  </div>
                <div className="text-left">
                  <p className="text-[11px] font-black text-zinc-800 uppercase tracking-wide leading-none">Deadlines Calendar</p>
                  <p className="text-[10px] text-zinc-500 font-bold mt-0.5 leading-none">Interactive Sticky Note</p>
                </div>
              </div>
              <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-md hover:bg-blue-700 transition">
                Open
              </span>
            </div>
          )}
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 max-w-sm w-full animate-scaleIn text-zinc-900">
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Change Password</h3>
            <p className="text-xs text-zinc-500 mb-4">Set a new password for your account.</p>

            {passwordError && (
              <div className="bg-red-50 border border-red-200 p-2.5 rounded-lg text-red-800 font-bold text-xs mb-3">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 p-2.5 rounded-lg text-green-800 font-bold text-xs mb-3">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-3 text-xs focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-3 text-xs focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="rounded-lg hover:bg-zinc-50 text-zinc-500 py-2 px-4 text-xs font-bold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 px-5 text-xs font-bold shadow disabled:opacity-50"
                >
                  {passwordSubmitting ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="py-6 text-center text-xs text-zinc-500 border-t border-zinc-200 bg-white">
        <p>DEV:ATM v1.3 © 2026 STI College Puerto Princesa Task Monitoring System. All rights reserved.</p>
      </footer>
    </div>
  );
}
