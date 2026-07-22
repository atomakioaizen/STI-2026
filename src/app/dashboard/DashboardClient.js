"use client";

import { useState, useEffect } from 'react';
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
  const [readTaskIds, setReadTaskIds] = useState([]);
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

  const refreshDashboard = async () => {
    await Promise.all([getTasks(), fetchNotifications()]);
  };

  useEffect(() => {
    getTasks();
    fetchNotifications();
    const interval = setInterval(() => {
      getTasks();
      fetchNotifications();
    }, 15000);
    return () => clearInterval(interval);
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
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);

  const urgentTasks = tasks.filter(t => {
    if (readTaskIds.some(item => item.id === t.id && item.updatedAt === t.updatedAt)) return false;

    // 1. Pending Acceptance assigned to the logged-in user
    if (t.status === 'Pending Acceptance' && Number(t.userId) === Number(user.id)) return true;

    // 1b. Progress update rejection notification for subordinate
    if (t.rejectionReason && t.status === 'Ongoing' && Number(t.userId) === Number(user.id)) return true;

    // 2. Rejected tasks notifications (properly routed to the correct party)
    if (t.status === 'Rejected') {
      const isNominationRej = checkIsNominationRejection(t);
      if (isNominationRej) {
        // Subordinate rejected supervisor's nomination -> notify supervisor
        if (Number(t.nominatedById) === Number(user.id)) return true;
      } else {
        // Supervisor rejected subordinate's request -> notify subordinate
        if (Number(t.userId) === Number(user.id)) return true;
      }
    }

    // 3. Delayed tasks assigned to the logged-in user or nominated by them
    if (t.status === 'Delayed' && (Number(t.userId) === Number(user.id) || Number(t.nominatedById) === Number(user.id))) return true;

    // 4. Recently updated transitions (Ongoing/Completed) within 3 hours
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const updatedAt = t.updatedAt ? new Date(t.updatedAt) : null;
    if (updatedAt && updatedAt >= threeHoursAgo) {
      if (t.status === 'Ongoing' || t.status === 'Completed') {
        const remarks = parseRemarks(t.remarks);
        
        const checkLogText = (r, keyword) => {
          if (!r) return false;
          const isSys = r.role === 'SYSTEM' || r.role === 'System' || r.role === 'SYSTEM_LOG';
          if (!isSys) return false;
          const text = r.message || r.content || '';
          return text.toLowerCase().includes(keyword.toLowerCase());
        };

        const isApprovedByLog = remarks.some(r => 
          checkLogText(r, 'approved progress') || 
          checkLogText(r, 'marked task as completed')
        );
        
        const isAcceptedByLog = remarks.some(r => 
          checkLogText(r, 'nomination accepted')
        );
        
        const isForcePushedByLog = t.status === 'Ongoing' && t.assignedNote && !isAcceptedByLog;

        if (isApprovedByLog && Number(t.userId) === Number(user.id)) {
          return true;
        }
        if (isAcceptedByLog && Number(t.nominatedById) === Number(user.id)) {
          return true;
        }
        if (isForcePushedByLog && Number(t.userId) === Number(user.id)) {
          return true;
        }
      }
    }

    // 5. Soon due tasks assigned to the logged-in user
    if (t.targetDate && Number(t.userId) === Number(user.id)) {
      const blockedStatuses = ['Rejected', 'Awaiting Approval', 'Awaiting Deletion', 'Pending Acceptance'];
      if (blockedStatuses.includes(t.status)) return false;
      const target = new Date(t.targetDate);
      return target <= threeDaysFromNow;
    }

    // 6. Awaiting Approval — notify supervisor only (not the task owner)
    if (t.status === 'Awaiting Approval' && Number(t.userId) !== Number(user.id)) {
      if (user.role === 'PROGRAM_HEAD' && t.user?.departmentId === user.departmentId) return true;
      if (user.role === 'SCHOOL_ADMIN' || user.role === 'PRINCIPAL') return true;
    }

    // 7. Awaiting Deletion — notify supervisor only
    if (t.status === 'Awaiting Deletion' && Number(t.userId) !== Number(user.id)) {
      if (user.role === 'PROGRAM_HEAD' && t.user?.departmentId === user.departmentId) return true;
      if (user.role === 'SCHOOL_ADMIN' || user.role === 'PRINCIPAL') return true;
    }

    // 8. New unread chat message from the other party
    if (t.remarks) {
      try {
        const parsed = JSON.parse(t.remarks);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const latestMsg = parsed[parsed.length - 1];
          // Message from the other party (sender != user.name, role != SYSTEM)
          if (latestMsg.role !== 'SYSTEM' && latestMsg.role !== 'System' && latestMsg.role !== 'SYSTEM_LOG') {
            if (latestMsg.sender !== user.name) {
              return true;
            }
          }
        }
      } catch (e) {}
    }

    return false;
  });

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
      } else {
        const data = await res.json();
        setPasswordError(data.error || 'Failed to update password.');
      }
    } catch (err) {
      setPasswordError('Connection error. Please try again.');
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
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans flex flex-col relative">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-black tracking-tight text-zinc-950 flex items-center gap-2">
                Puerto Princesa
                <span className="text-xs text-zinc-400 font-bold border-l border-zinc-200 pl-2 uppercase tracking-wider">Task Monitor</span>
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
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-all active:scale-95 border border-zinc-200 bg-white relative"
                    title="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {urgentTasks.length + notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                        {urgentTasks.length + notifications.length}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl z-50 text-zinc-900">
                      <div className="border-b border-zinc-100 pb-2 mb-3 flex items-center justify-between">
                        <span className="font-extrabold text-sm text-zinc-800">Deadlines &amp; Alerts</span>
                        <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                          {urgentTasks.length + notifications.length} urgent
                        </span>
                      </div>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {/* 1. Notifications (Scenario B Direct Deletions) */}
                        {notifications.map(n => {
                          let details = {};
                          try { details = JSON.parse(n.details); } catch(e){}

                          if (n.action === 'TASK_ACCEPTED') {
                            return (
                              <div
                                key={`notif-${n.id}`}
                                className="p-2.5 rounded-lg border border-green-200 bg-green-50/50 text-left relative"
                              >
                                <div className="flex items-center justify-between font-bold text-[11px] uppercase tracking-wider mb-1 text-green-800">
                                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-green-600" /> Deliverable Accepted</span>
                                  <button 
                                    onClick={async (e) => { 
                                      e.stopPropagation(); 
                                      await handleAcknowledgeNotification(n.id); 
                                    }}
                                    className="text-[9px] bg-green-100 hover:bg-green-200 border border-green-300 text-green-800 px-1.5 py-0.5 rounded font-black transition"
                                  >
                                    ✕ Clear
                                  </button>
                                </div>
                                <p className="text-[10px] text-zinc-700 font-extrabold leading-tight">
                                  {details.assigneeName} accepted nominated deliverable <span className="text-zinc-950 font-black">"{details.taskDescription}"</span>.
                                </p>
                              </div>
                            );
                          }

                          if (n.action === 'TASK_REJECTED') {
                            return (
                              <div
                                key={`notif-${n.id}`}
                                className="p-2.5 rounded-lg border border-red-200 bg-red-50/50 text-left relative"
                              >
                                <div className="flex items-center justify-between font-bold text-[11px] uppercase tracking-wider mb-1 text-red-800">
                                  <span className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-red-600" /> Deliverable Rejected</span>
                                  <button 
                                    onClick={async (e) => { 
                                      e.stopPropagation(); 
                                      await handleAcknowledgeNotification(n.id); 
                                    }}
                                    className="text-[9px] bg-red-100 hover:bg-red-200 border border-red-300 text-red-800 px-1.5 py-0.5 rounded font-black transition"
                                  >
                                    ✕ Clear
                                  </button>
                                </div>
                                <p className="text-[10px] text-zinc-700 font-extrabold leading-tight">
                                  {details.assigneeName} rejected deliverable <span className="text-zinc-950 font-black">"{details.taskDescription}"</span>. {details.rejectionReason ? `Reason: "${details.rejectionReason}"` : ''}
                                </p>
                              </div>
                            );
                          }

                          if (n.action === 'TASK_RESTORED') {
                            return (
                              <div
                                key={`notif-${n.id}`}
                                className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/50 text-left relative"
                              >
                                <div className="flex items-center justify-between font-bold text-[11px] uppercase tracking-wider mb-1 text-blue-800">
                                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-blue-600" /> Task Restored</span>
                                  <button 
                                    onClick={async (e) => { 
                                      e.stopPropagation(); 
                                      await handleAcknowledgeNotification(n.id); 
                                    }}
                                    className="text-[9px] bg-blue-100 hover:bg-blue-200 border border-blue-300 text-blue-800 px-1.5 py-0.5 rounded font-black transition"
                                  >
                                    ✕ Clear
                                  </button>
                                </div>
                                <p className="text-[10px] text-zinc-700 font-extrabold leading-tight">
                                  Your archived task <span className="text-zinc-950 font-black">"{details.taskDescription}"</span> was restored by {details.supervisorName}. It is now active (Ongoing).
                                </p>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={`notif-${n.id}`}
                              className="p-2.5 rounded-lg border border-red-200 bg-red-50/30 text-left relative"
                            >
                              <div className="flex items-center justify-between font-bold text-[11px] uppercase tracking-wider mb-1 text-red-750">
                                <span className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> Nomination Rejected</span>
                                <button 
                                  onClick={async (e) => { 
                                    e.stopPropagation(); 
                                    await handleAcknowledgeNotification(n.id); 
                                  }}
                                  className="text-[9px] bg-red-100 hover:bg-red-200 border border-red-300 text-red-700 px-1.5 py-0.5 rounded font-black transition"
                                >
                                  ✕ Clear
                                </button>
                              </div>
                              <p className="text-[10px] text-zinc-700 font-extrabold leading-tight">
                                Self-nominated task <span className="text-zinc-950 font-black">"{details.taskDescription}"</span> was rejected and deleted by {details.supervisorName}.
                              </p>
                              {details.remarks && (
                                <p className="text-[9px] text-red-750 font-bold bg-red-50 p-1.5 rounded border border-red-200 mt-1 italic">
                                  Remarks: "{details.remarks}"
                                </p>
                              )}
                            </div>
                          );
                        })}

                        {urgentTasks.length === 0 && notifications.length === 0 ? (
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
                                  setReadTaskIds(prev => {
                                    const filtered = prev.filter(item => item.id !== t.id);
                                    return [...filtered, { id: t.id, updatedAt: t.updatedAt }];
                                  });
                                }}
                                className={`p-2.5 rounded-lg border text-left cursor-pointer hover:bg-zinc-50 hover:border-zinc-300 transition active:scale-[0.99] ${badgeColor}`}
                              >
                                <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider mb-1">
                                  {icon}
                                  <span className={isApproved || isAccepted ? 'text-green-700' : isForcePushed ? 'text-blue-700' : isDelayed || isRejected ? 'text-red-700' : isPendingAcceptance ? 'text-blue-700' : isAwaitingApproval ? (t.progress === 0 || t.previousProgress === null ? 'text-blue-700' : 'text-purple-700') : isAwaitingDeletion ? 'text-orange-700' : 'text-amber-700'}>
                                    {label}
                                  </span>
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
        {activeTab === 'leaderboard' && user.role !== 'FACULTY_STAFF' ? (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6">
            <Leaderboard user={user} />
          </div>
        ) : (
          <>
            {(user.role === 'ADMIN' || user.role === 'PRINCIPAL' || user.role === 'SCHOOL_ADMIN') && <AdminPortal user={user} taskTrigger={taskTrigger} setTaskTrigger={setTaskTrigger} notifications={notifications} onDeleteNotification={handleAcknowledgeNotification} refreshDashboard={refreshDashboard} />}
            {user.role === 'PROGRAM_HEAD' && <ProgramHeadPortal user={user} taskTrigger={taskTrigger} setTaskTrigger={setTaskTrigger} notifications={notifications} onDeleteNotification={handleAcknowledgeNotification} refreshDashboard={refreshDashboard} />}
            {user.role === 'FACULTY_STAFF' && <FacultyPortal user={user} taskTrigger={taskTrigger} setTaskTrigger={setTaskTrigger} notifications={notifications} onDeleteNotification={handleAcknowledgeNotification} refreshDashboard={refreshDashboard} />}
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
        <p>DEV:ATM © 2026 STI College Puerto Princesa Task Monitoring System. All rights reserved.</p>
      </footer>
    </div>
  );
}
