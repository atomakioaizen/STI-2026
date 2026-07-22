"use client";

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  AlertTriangle, Clock, Calendar, Inbox, Check, X, 
  ArrowUpRight, Ban, Trash2, Send, MessageSquare 
} from 'lucide-react';
import { getTaskActorInfo } from '@/lib/taskHelpers';

export default function SuperAlertModal({ 
  tasks, 
  user, 
  onClose, 
  onAcceptTask, 
  onRejectTask, 
  onForceTask, 
  onCancelTask, 
  onAcceptDelete, 
  onRejectDelete,
  onTaskClick,
  onRefresh,
  refreshDashboard,
  notifications = [],
  onDeleteNotification
}) {
  const [activeTab, setActiveTab] = useState('notices'); // 'notices' | 'inbox'
  const [selectedInboxTaskId, setSelectedInboxTaskId] = useState(null);
  const [inboxMessageText, setInboxMessageText] = useState('');
  const [sendingInboxMessage, setSendingInboxMessage] = useState(false);
  const [inboxSearch, setInboxSearch] = useState('');
  const chatEndRef = useRef(null);

  const [actionedTaskIds, setActionedTaskIds] = useState([]);
  const [actionedNotifIds, setActionedNotifIds] = useState([]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedInboxTaskId, activeTab]);

  const [rejectingTaskId, setRejectingTaskId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  const [forcingTaskId, setForcingTaskId] = useState(null);
  const [forceNote, setForceNote] = useState('');
  const [submittingForce, setSubmittingForce] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const now = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);

  if (!mounted || !user) return null;

  const isSupervisor = user.role === 'SCHOOL_ADMIN' || user.role === 'PRINCIPAL' || user.role === 'PROGRAM_HEAD';

  const getRequestLabel = (task) => {
    if (task.rejectionReason && task.status === 'Ongoing') return 'Rejected Update';
    if (task.status === 'Awaiting Approval') {
      if (task.progress === 0 || task.previousProgress === null) {
        return 'Self-Nomination';
      }
      return 'Progress';
    }
    if (task.status === 'Awaiting Deletion') return 'Deletion';
    if (task.status === 'Pending Acceptance') {
      return Number(task.userId) === Number(task.nominatedById) ? 'Self-Nomination' : 'Nomination';
    }
    if (task.status === 'Rejected') return 'Rejected';
    if (task.status === 'Delayed') return 'Delayed';
    return task.status;
  };

  const getBadgeStyle = (task) => {
    if (task.rejectionReason && task.status === 'Ongoing') return 'bg-red-100 text-red-800 border-red-200';
    if (task.status === 'Awaiting Approval') {
      if (task.progress === 0 || task.previousProgress === null) {
        return 'bg-blue-100 text-blue-800 border-blue-200';
      }
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    if (task.status === 'Awaiting Deletion') return 'bg-orange-100 text-orange-850 border-orange-200';
    if (task.status === 'Pending Acceptance') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (task.status === 'Rejected') return 'bg-red-100 text-red-800 border-red-200';
    if (task.status === 'Delayed') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-zinc-200 text-zinc-850 border-zinc-300';
  };

  const checkIsNominationRejection = (t) => {
    if (t.status !== 'Rejected') return false;
    return t.progress === 0;
  };

  // ─── SUPERVISOR'S ACTION-REQUIRED ITEMS (Subordinates' requests) ───────────
  const subordinateRequests = isSupervisor ? tasks.filter(t => {
    if (actionedTaskIds.includes(t.id)) return false;
    if (Number(t.userId) === Number(user.id)) return false;
    if (t.status === 'Completed' || t.status === 'Archived') return false;

    // Scope: PH only sees their dept; Admin/Principal see all
    const inScope = user.role === 'PROGRAM_HEAD'
      ? (t.user?.departmentId === user.departmentId)
      : true;

    if (!inScope) return false;

    // Requests requiring action or warnings in scope
    if (t.status === 'Awaiting Approval') return true;
    if (t.status === 'Awaiting Deletion') return true;
    if (t.status === 'Delayed') return true;
    if (t.status === 'Rejected') {
      if (checkIsNominationRejection(t) && Number(t.nominatedById) === Number(user.id)) return true;
    }

    return false;
  }) : [];

  // ─── USER'S OWN URGENT ITEMS ───────────────────────────────────────────────
  const ownUrgentTasks = tasks.filter(t => {
    if (actionedTaskIds.includes(t.id)) return false;
    if (Number(t.userId) !== Number(user.id)) return false;
    if (t.status === 'Completed' || t.status === 'Archived') return false;
    
    // Include pending requests and notifications for the user
    if (t.status === 'Pending Acceptance') return true;
    if (t.status === 'Awaiting Approval') return true;
    if (t.status === 'Awaiting Deletion') return true;
    if (t.status === 'Rejected') {
      if (!checkIsNominationRejection(t)) return true;
    }
    if (t.status === 'Delayed') return true;
    if (t.rejectionReason && t.status === 'Ongoing') return true;
    
    const blockedStatuses = ['Awaiting Approval', 'Awaiting Deletion', 'Rejected', 'Pending Acceptance'];
    if (t.targetDate && !blockedStatuses.includes(t.status)) {
      const target = new Date(t.targetDate);
      if (target <= threeDaysFromNow) return true;
    }
    return false;
  });

  const activeNotifications = notifications.filter(n => !actionedNotifIds.includes(n.id));

  const urgentTasks = [...subordinateRequests, ...ownUrgentTasks];

  const parseRemarks = (remarksStr) => {
    if (!remarksStr) return [];
    try {
      const parsed = JSON.parse(remarksStr);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      return [{
        sender: 'Supervisor/System',
        role: 'System',
        timestamp: new Date().toISOString(),
        content: remarksStr
      }];
    }
    return [];
  };

  const hasUserRemarks = (remarksStr) => {
    if (!remarksStr) return false;
    try {
      const parsed = JSON.parse(remarksStr);
      if (Array.isArray(parsed)) {
        return parsed.some(msg => msg.role !== 'SYSTEM' && msg.role !== 'System' && msg.role !== 'SYSTEM_LOG');
      }
    } catch (e) {}
    return false;
  };

  // Inbox Tasks (All active tasks we can message about)
  const inboxTasks = tasks.filter(t => {
    let inScope = false;
    if (user.role === 'PROGRAM_HEAD') {
      inScope = t.userId === user.id || t.user?.departmentId === user.departmentId;
    } else if (user.role === 'SCHOOL_ADMIN' || user.role === 'PRINCIPAL') {
      inScope = true;
    } else {
      inScope = t.userId === user.id;
    }

    if (!inScope) return false;

    // Only show if it has user-entered remarks
    return hasUserRemarks(t.remarks);
  });

  const sortedInboxTasks = [...inboxTasks]
    .filter(t => {
      const query = inboxSearch.toLowerCase().trim();
      if (!query) return true;
      return (
        t.taskDescription?.toLowerCase().includes(query) ||
        t.user?.name?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => b.id - a.id);

  const selectedInboxTask = sortedInboxTasks.find(t => t.id === selectedInboxTaskId) || sortedInboxTasks[0];

  const handleSendInboxMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inboxMessageText.trim() || !selectedInboxTask) return;
    setSendingInboxMessage(true);
    try {
      const res = await fetch(`/api/tasks/${selectedInboxTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: inboxMessageText.trim() })
      });
      if (res.ok) {
        setInboxMessageText('');
        if (onRefresh) {
          await onRefresh();
        }
      }
    } catch (err) {
      console.error('Error sending message', err);
    } finally {
      setSendingInboxMessage(false);
      if (refreshDashboard) refreshDashboard();
    }
  };

  const handleRejectClick = (e, taskId) => {
    e.stopPropagation();
    setRejectingTaskId(taskId);
    setRejectionReason('');
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim() || !rejectingTaskId) return;
    const taskId = rejectingTaskId;
    setActionedTaskIds(prev => [...prev, taskId]);
    setSubmittingReject(true);
    try {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status === 'Awaiting Deletion') {
        if (onRejectDelete) {
          await onRejectDelete(taskId, rejectionReason.trim());
        }
      } else {
        if (onRejectTask) {
          await onRejectTask(taskId, rejectionReason.trim());
        }
      }
      setRejectingTaskId(null);
      setRejectionReason('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReject(false);
      if (onRefresh) onRefresh();
      if (refreshDashboard) refreshDashboard();
    }
  };

  const handleForceSubmit = async (e) => {
    e.preventDefault();
    if (!forceNote.trim() || !forcingTaskId) return;
    const taskId = forcingTaskId;
    setActionedTaskIds(prev => [...prev, taskId]);
    setSubmittingForce(true);
    try {
      if (onForceTask) {
        await onForceTask(taskId, forceNote.trim());
      }
      setForcingTaskId(null);
      setForceNote('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingForce(false);
      if (onRefresh) onRefresh();
      if (refreshDashboard) refreshDashboard();
    }
  };

  const chatMessages = selectedInboxTask ? parseRemarks(selectedInboxTask.remarks) : [];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn">
      <div 
        className={`bg-white rounded-2xl border-4 shadow-2xl p-5 text-zinc-900 animate-scaleIn relative flex flex-col transition-all duration-300 ${
          activeTab === 'inbox' ? 'border-purple-650 w-full max-w-6xl' : 'border-red-500 w-full max-w-xl'
        }`}
        style={activeTab === 'inbox' ? { height: '85vh' } : { maxHeight: '90vh' }}
      >
        {/* Close Button top-right */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-lg text-xs font-bold transition z-10"
        >
          ✕ Close
        </button>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-200 mb-4 shrink-0 font-bold text-xs select-none">
          <button
            onClick={() => setActiveTab('notices')}
            className={`flex-1 py-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'notices' 
                ? 'border-red-500 text-red-650 font-black' 
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Alerts &amp; Action Center ({urgentTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex-1 py-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'inbox' 
                ? 'border-purple-650 text-purple-750 font-black' 
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Collaboration Chat ({inboxTasks.length})
          </button>
        </div>

        {/* TAB 1: NOTICES & ACTIONS */}
        {activeTab === 'notices' && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Warning Icon */}
            <div className="flex justify-center mb-3 shrink-0">
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center animate-pulse border-2 border-red-300">
                <AlertTriangle className="h-7 w-7 text-red-600" />
              </div>
            </div>

            <h3 className="text-xl font-black text-red-600 tracking-tight mb-0.5 text-center uppercase shrink-0">
              Important Notices &amp; Action Center
            </h3>

            {/* Priority Label */}
            <div className="text-center mb-3 shrink-0">
              {subordinateRequests.length > 0 ? (
                <p className="text-zinc-500 text-[11px] font-bold">
                  You have <span className="text-red-650 font-black">{subordinateRequests.length}</span> subordinate request{subordinateRequests.length > 1 ? 's' : ''} requiring action. Click any card to navigate directly.
                </p>
              ) : (
                <p className="text-zinc-500 text-[11px] font-bold">
                  You have pending deadlines or tasks. Click any card to view and manage.
                </p>
              )}
            </div>

            {/* Task List (Optimized scroll area for 20+ items) */}
            <div className="flex-1 min-h-0 overflow-y-auto border border-zinc-200 rounded-xl p-3 bg-zinc-50 space-y-2 mb-4 scrollbar-thin">
              {urgentTasks.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 text-xs font-bold">
                  No pending action requests or urgent deadlines.
                </div>
              ) : (
                <>
                  {/* Section: Subordinate Requests */}
                  {subordinateRequests.length > 0 && (
                    <>
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 pb-1 border-b border-zinc-200 select-none">
                        🔴 Action Required — Subordinate Requests ({subordinateRequests.length})
                      </p>
                      {subordinateRequests.map(t => {
                        const isNomination = t.status === 'Pending Acceptance';
                        const isRejected = t.status === 'Rejected';
                        const isAwaitingApproval = t.status === 'Awaiting Approval';
                        const isAwaitingDeletion = t.status === 'Awaiting Deletion';
                        const isDelayed = t.status === 'Delayed';

                        const borderColor = isNomination ? 'border-blue-200 bg-blue-50/40 hover:bg-blue-50'
                          : isRejected ? 'border-red-200 bg-red-50/40 hover:bg-red-50'
                          : isAwaitingApproval ? 'border-purple-200 bg-purple-50/40 hover:bg-purple-50'
                          : isAwaitingDeletion ? 'border-orange-200 bg-orange-50/40 hover:bg-orange-50'
                          : isDelayed ? 'border-red-200 bg-red-50/40 hover:bg-red-50'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50';

                        const categoryColor = isNomination ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : isRejected ? 'bg-red-100 text-red-800 border-red-200'
                          : isAwaitingApproval ? 'bg-purple-100 text-purple-800 border-purple-200'
                          : isAwaitingDeletion ? 'bg-orange-100 text-orange-850 border-orange-200'
                          : isDelayed ? 'bg-red-100 text-red-800 border-red-200'
                          : 'bg-zinc-200 text-zinc-800 border-zinc-300';

                        const statusLabel = isNomination ? 'Pending Acceptance'
                          : isRejected ? 'Rejected by Staff'
                          : isAwaitingApproval ? 'Awaiting Approval'
                          : isAwaitingDeletion ? 'Deletion Request'
                          : t.status;

                        return (
                          <div 
                            key={t.id} 
                            onClick={() => onTaskClick && onTaskClick(t)}
                            className={`p-2.5 rounded-xl border border-dashed transition-all hover:scale-[1.01] hover:shadow-xs active:scale-[0.99] cursor-pointer text-left ${borderColor}`}
                            title="Click to view/open this task directly"
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="mt-0.5 shrink-0">
                                {isNomination ? <Inbox className="h-4.5 w-4.5 text-blue-600" />
                                  : isRejected ? <Ban className="h-4.5 w-4.5 text-red-600" />
                                  : isAwaitingApproval ? <ArrowUpRight className="h-4.5 w-4.5 text-purple-600" />
                                  : isAwaitingDeletion ? <Trash2 className="h-4.5 w-4.5 text-orange-600" />
                                  : isDelayed ? <AlertTriangle className="h-4.5 w-4.5 text-red-600" />
                                  : <AlertTriangle className="h-4.5 w-4.5 text-zinc-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <span className={`px-1.5 py-0.2 border rounded text-[9px] font-bold uppercase tracking-wider ${categoryColor}`}>
                                    {t.category || 'Deliverable'}
                                  </span>
                                  <span className={`px-1.5 py-0.2 border rounded text-[9px] font-bold uppercase tracking-wider ${getBadgeStyle(t)}`}>
                                    {getRequestLabel(t)}
                                  </span>
                                </div>
                                <p className="font-bold text-zinc-950 text-xs mt-0.5 line-clamp-2">{t.taskDescription}</p>
                                <div className="flex items-center justify-between mt-1 text-[9px] text-zinc-500 font-bold border-t border-zinc-200/50 pt-1">
                                  <span>Assignee: {t.user?.name} {t.nominatedBy?.name ? `(Nominated by: ${t.nominatedBy.name})` : ''}</span>
                                  {t.targetDate && (
                                    <span className="flex items-center gap-0.5">
                                      <Calendar className="h-2.5 w-2.5" />
                                      Due: {new Date(t.targetDate).toLocaleDateString('en-US', { dateStyle: 'short' })}
                                    </span>
                                  )}
                                </div>

                                {/* Nomination Buttons */}
                                {isNomination && (
                                  <div className="flex gap-2 mt-2 pt-2 border-t border-blue-200/40">
                                    <button 
                                      onClick={async (e) => { 
                                        e.stopPropagation(); 
                                        setActionedTaskIds(prev => [...prev, t.id]);
                                        try {
                                          if (onAcceptTask) await onAcceptTask(t.id);
                                        } catch (err) { console.error(err); }
                                        finally {
                                          if (onRefresh) onRefresh();
                                          if (refreshDashboard) refreshDashboard();
                                        }
                                      }}
                                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 active:scale-[0.98] transition"
                                    >
                                      <Check className="h-3 w-3" /> Accept
                                    </button>
                                    <button 
                                      onClick={(e) => handleRejectClick(e, t.id)}
                                      className="flex-1 bg-red-50 hover:bg-red-105 text-red-600 border border-red-200 font-bold text-[10px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 active:scale-[0.98] transition"
                                    >
                                      <X className="h-3 w-3" /> Reject
                                    </button>
                                  </div>
                                )}

                                {/* Awaiting Approval Buttons */}
                                {isAwaitingApproval && (
                                  <div className="flex gap-2 mt-2 pt-2 border-t border-purple-200/40">
                                    <button 
                                      onClick={(e) => handleRejectClick(e, t.id)}
                                      className="flex-1 bg-red-50 hover:bg-red-105 border border-red-200 text-red-655 font-bold text-[10px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 active:scale-[0.98] transition"
                                    >
                                      <X className="h-3 w-3" /> Reject Update
                                    </button>
                                    <button 
                                      onClick={async (e) => { 
                                        e.stopPropagation(); 
                                        setActionedTaskIds(prev => [...prev, t.id]);
                                        try {
                                          if (onAcceptDelete) {
                                            await onAcceptDelete(t.id, false);
                                          } else if (onAcceptTask) {
                                            await onAcceptTask(t.id);
                                          }
                                        } catch (err) { console.error(err); }
                                        finally {
                                          if (onRefresh) onRefresh();
                                          if (refreshDashboard) refreshDashboard();
                                        }
                                      }}
                                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 active:scale-[0.98] transition"
                                    >
                                      <Check className="h-3 w-3" /> Approve {t.progress === 100 ? 'Completion' : 'Update'}
                                    </button>
                                  </div>
                                )}

                                {/* Awaiting Deletion Buttons */}
                                {isAwaitingDeletion && (
                                  <div className="flex gap-2 mt-2 pt-2 border-t border-orange-200/40">
                                    <button 
                                      onClick={(e) => handleRejectClick(e, t.id)}
                                      className="flex-1 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 font-bold text-[10px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 active:scale-[0.98] transition"
                                    >
                                      <X className="h-3 w-3" /> Keep Task
                                    </button>
                                    <button 
                                      onClick={async (e) => { 
                                        e.stopPropagation(); 
                                        setActionedTaskIds(prev => [...prev, t.id]);
                                        try {
                                          if (onAcceptDelete) {
                                            await onAcceptDelete(t.id, true);
                                          } else if (onCancelTask) {
                                            await onCancelTask(t.id);
                                          }
                                        } catch (err) { console.error(err); }
                                        finally {
                                          if (onRefresh) onRefresh();
                                          if (refreshDashboard) refreshDashboard();
                                        }
                                      }}
                                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 active:scale-[0.98] transition"
                                    >
                                      <Trash2 className="h-3 w-3" /> Delete Task
                                    </button>
                                  </div>
                                )}

                                {/* Rejected Task Action Buttons (Supervisor side) */}
                                {isRejected && Number(t.nominatedById) === Number(user.id) && (
                                  <div className="flex gap-2 mt-2 pt-2 border-t border-red-200/40">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setForcingTaskId(t.id); }}
                                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 active:scale-[0.98] transition shadow-sm animate-pulse"
                                    >
                                      <ArrowUpRight className="h-3 w-3" /> Force Push
                                    </button>
                                    <button 
                                      onClick={async (e) => { 
                                        e.stopPropagation(); 
                                        setActionedTaskIds(prev => [...prev, t.id]);
                                        try {
                                          if (onCancelTask) await onCancelTask(t.id);
                                        } catch (err) { console.error(err); }
                                        finally {
                                          if (onRefresh) onRefresh();
                                          if (refreshDashboard) refreshDashboard();
                                        }
                                      }}
                                      className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-[10px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 active:scale-[0.98] transition border border-zinc-200"
                                    >
                                      <Ban className="h-3 w-3" /> Cancel Nomination
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Section: Own Tasks */}
                  {(ownUrgentTasks.length > 0 || activeNotifications.length > 0) && (
                    <>
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 pb-1 border-b border-zinc-200 mt-3 select-none">
                        🟡 My Tasks &amp; Alerts ({ownUrgentTasks.length + activeNotifications.length})
                      </p>

                      {/* Direct-deleted Rejection Notifications (Scenario B) */}
                      {activeNotifications.map(n => {
                        let details = {};
                        try { details = JSON.parse(n.details); } catch(e){}

                        const isAccepted = n.action === 'TASK_ACCEPTED';
                        const isRejectedNotif = n.action === 'TASK_REJECTED';
                        const isRestored = n.action === 'TASK_RESTORED';

                        const titleText = isAccepted ? 'Deliverable Accepted'
                          : isRejectedNotif ? 'Deliverable Rejected'
                          : isRestored ? 'Task Restored'
                          : 'Nomination Rejected';

                        const borderStyle = isAccepted ? 'border-green-200 bg-green-50/20'
                          : isRestored ? 'border-blue-200 bg-blue-50/20'
                          : 'border-red-200 bg-red-50/20';

                        const badgeStyle = isAccepted ? 'bg-green-100 text-green-800'
                          : isRestored ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800';

                        const iconComp = isAccepted ? <Check className="h-4.5 w-4.5 text-green-600" />
                          : isRestored ? <Inbox className="h-4.5 w-4.5 text-blue-600" />
                          : <AlertTriangle className="h-4.5 w-4.5 text-red-600" />;

                        return (
                          <div 
                            key={`notif-modal-${n.id}`} 
                            className={`p-2.5 rounded-xl border border-dashed text-left ${borderStyle}`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="mt-0.5 shrink-0">
                                {iconComp}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider font-sans ${badgeStyle}`}>
                                    {titleText}
                                  </span>
                                </div>
                                <p className="font-extrabold text-zinc-950 text-xs mt-1.5 leading-snug">
                                  {isAccepted ? (
                                    <>{details.assigneeName} accepted deliverable nomination <span className="font-black text-zinc-900">"{details.taskDescription}"</span>.</>
                                  ) : isRejectedNotif ? (
                                    <>{details.assigneeName} rejected deliverable nomination <span className="font-black text-zinc-900">"{details.taskDescription}"</span>.</>
                                  ) : isRestored ? (
                                    <>Your archived task <span className="font-black text-zinc-900">"{details.taskDescription}"</span> was restored by {details.supervisorName}.</>
                                  ) : (
                                    <>Self-nominated task <span className="font-black text-zinc-900">"{details.taskDescription}"</span> was rejected and deleted by {details.supervisorName}.</>
                                  )}
                                </p>
                                {(details.rejectionReason || details.remarks) && (
                                  <p className="text-[10px] text-red-750 font-bold bg-red-50/50 p-1.5 rounded border border-red-205 mt-1.5 italic font-sans">
                                    Reason: "{details.rejectionReason || details.remarks}"
                                  </p>
                                )}
                                <div className="flex gap-2 mt-2.5 pt-2 border-t border-zinc-200/40">
                                  <button 
                                    onClick={async (e) => { 
                                      e.stopPropagation(); 
                                      setActionedNotifIds(prev => [...prev, n.id]);
                                      try {
                                        if (onDeleteNotification) {
                                          await onDeleteNotification(n.id);
                                        }
                                      } catch (err) { console.error(err); }
                                      finally {
                                        if (onRefresh) onRefresh();
                                        if (refreshDashboard) refreshDashboard();
                                      }
                                    }}
                                    className="flex-1 bg-zinc-800 hover:bg-zinc-900 text-white font-bold text-[10px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 active:scale-[0.98] transition font-sans"
                                  >
                                    Acknowledge &amp; Clear Notice
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {ownUrgentTasks.map(t => {
                        const isNomination = t.status === 'Pending Acceptance';
                        const isDelayed = t.status === 'Delayed';
                        const isProgressRej = t.rejectionReason && t.status === 'Ongoing';

                        return (
                          <div 
                            key={t.id} 
                            onClick={() => onTaskClick && onTaskClick(t)}
                            className="p-2.5 rounded-xl border border-dashed border-yellow-250 bg-yellow-50/30 hover:bg-yellow-50/60 transition-all hover:scale-[1.01] hover:shadow-xs active:scale-[0.99] cursor-pointer text-left"
                            title="Click to view/open this task directly"
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="mt-0.5 shrink-0">
                                {isDelayed ? <AlertTriangle className="h-4.5 w-4.5 text-red-600" />
                                  : isNomination ? <Inbox className="h-4.5 w-4.5 text-blue-600" />
                                  : <Clock className="h-4.5 w-4.5 text-yellow-600" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <span className="bg-zinc-200 text-zinc-800 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider">
                                    {t.category || 'Deliverable'}
                                  </span>
                                  <span className={`px-1.5 py-0.2 border rounded text-[9px] font-bold uppercase tracking-wider ${getBadgeStyle(t)}`}>
                                    {getRequestLabel(t)}
                                  </span>
                                </div>
                                <p className="font-bold text-zinc-950 text-xs mt-0.5 line-clamp-2">{t.taskDescription}</p>
                                <div className="flex flex-wrap items-center gap-1 mt-1 text-[9px] leading-tight">
                                  {t.nominatedBy?.name && (
                                    <span className="bg-blue-50 text-blue-700 border border-blue-200/60 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-0.5">
                                      👤 Nominated: {t.nominatedBy.name}
                                    </span>
                                  )}
                                  {(() => {
                                    const info = getTaskActorInfo(t);
                                    return info.coAssignees ? (
                                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-0.5">
                                        👥 Co-assigned: {info.coAssignees}
                                      </span>
                                    ) : null;
                                  })()}
                                </div>
                                {t.targetDate && (
                                  <p className="text-[9px] text-zinc-500 font-bold mt-1 flex items-center gap-1">
                                    <Calendar className="h-2.5 w-2.5" />
                                    Deadline: {new Date(t.targetDate).toLocaleDateString('en-US', { dateStyle: 'short' })}
                                  </p>
                                )}
                                {isProgressRej && t.rejectionReason && (
                                  <p className="text-[10px] text-red-750 font-bold bg-red-55/60 p-1.5 rounded border border-red-200 mt-1.5 italic">
                                    Rejection Reason: "{t.rejectionReason}"
                                  </p>
                                )}
                                {/* Own Pending Acceptance Buttons */}
                                {isNomination && (
                                  <div className="flex gap-2 mt-2 pt-2 border-t border-blue-200/40">
                                    <button 
                                      onClick={async (e) => { 
                                        e.stopPropagation(); 
                                        setActionedTaskIds(prev => [...prev, t.id]);
                                        try {
                                          if (onAcceptTask) await onAcceptTask(t.id);
                                        } catch (err) { console.error(err); }
                                        finally {
                                          if (onRefresh) onRefresh();
                                          if (refreshDashboard) refreshDashboard();
                                        }
                                      }}
                                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 active:scale-[0.98] transition"
                                    >
                                      <Check className="h-3 w-3" /> Accept Task
                                    </button>
                                    <button 
                                      onClick={(e) => handleRejectClick(e, t.id)}
                                      className="flex-1 bg-red-50 hover:bg-red-105 text-red-600 border border-red-200 font-bold text-[10px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 active:scale-[0.98] transition"
                                    >
                                      <X className="h-3 w-3" /> Reject Task
                                    </button>
                                  </div>
                                )}
                                {t.status === 'Rejected' && (
                                  <div className="flex gap-2 mt-2 pt-2 border-t border-red-200/40">
                                    <button 
                                      onClick={async (e) => { 
                                        e.stopPropagation(); 
                                        setActionedTaskIds(prev => [...prev, t.id]);
                                        try {
                                          if (onCancelTask) await onCancelTask(t.id);
                                        } catch (err) { console.error(err); }
                                        finally {
                                          if (onRefresh) onRefresh();
                                          if (refreshDashboard) refreshDashboard();
                                        }
                                      }}
                                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 active:scale-[0.98] transition"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" /> Acknowledge Rejection &amp; Delete Task
                                    </button>
                                  </div>
                                )}
                                {isProgressRej && (
                                  <div className="flex gap-2 mt-2 pt-2 border-t border-red-200/40">
                                    <button 
                                      onClick={async (e) => { 
                                        e.stopPropagation(); 
                                        setActionedTaskIds(prev => [...prev, t.id]);
                                        try {
                                          const res = await fetch(`/api/tasks/${t.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ rejectionReason: null })
                                          });
                                        } catch (err) {
                                          console.error(err);
                                        } finally {
                                          if (onRefresh) onRefresh();
                                          if (refreshDashboard) refreshDashboard();
                                        }
                                      }}
                                      className="flex-1 bg-zinc-800 hover:bg-zinc-900 text-white font-bold text-[10px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 active:scale-[0.98] transition font-sans"
                                    >
                                      Acknowledge Rejection
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Acknowledge Button */}
            <button
              onClick={onClose}
              className="w-full bg-zinc-800 hover:bg-zinc-900 active:scale-[0.98] text-white font-black py-3 px-6 rounded-xl shadow-md text-xs tracking-wider uppercase transition-all shrink-0"
            >
              Acknowledge &amp; Close Notices
            </button>
          </div>
        )}

        {/* TAB 2: COLLABORATION CHAT INBOX */}
        {activeTab === 'inbox' && (
          <div className="flex-1 flex min-h-0 border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50">
            {/* Left Pane: Topics List */}
            <div className="w-80 border-r border-zinc-200 flex flex-col bg-zinc-100/50 shrink-0">
              <div className="p-3 border-b border-zinc-200 bg-zinc-100 select-none">
                <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Active Conversations</span>
              </div>
              {/* Search Bar */}
              <div className="p-2 border-b border-zinc-200 bg-white">
                <input
                  type="text"
                  placeholder="Search by owner, task..."
                  value={inboxSearch}
                  onChange={(e) => setInboxSearch(e.target.value)}
                  className="w-full rounded-lg border border-zinc-250 bg-zinc-50/50 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-850 placeholder-zinc-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-purple-500 transition"
                />
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-200 p-2 space-y-1.5">
                {sortedInboxTasks.length === 0 ? (
                  <div className="text-center py-10 text-xs font-semibold text-zinc-400">No active tasks found.</div>
                ) : (
                  sortedInboxTasks.map(t => {
                    const isSelected = selectedInboxTask && selectedInboxTask.id === t.id;
                    const messages = parseRemarks(t.remarks);
                    const latestMsg = messages[messages.length - 1]?.message || messages[messages.length - 1]?.content || 'No conversation yet.';
                    
                    let badgeColor = 'bg-zinc-200 text-zinc-700';
                    let displayStatus = t.status;
                    if (t.status === 'Awaiting Approval') {
                      badgeColor = 'bg-purple-100 text-purple-850 font-bold';
                      displayStatus = 'Progress';
                    } else if (t.status === 'Awaiting Deletion') {
                      badgeColor = 'bg-orange-100 text-orange-850 font-bold';
                      displayStatus = 'Deletion';
                    } else if (t.status === 'Pending Acceptance') {
                      badgeColor = 'bg-amber-100 text-amber-850 font-bold';
                      displayStatus = t.userId === t.nominatedById ? 'Self-Nomination' : 'Nomination';
                    } else if (t.status === 'Rejected') {
                      badgeColor = 'bg-red-100 text-red-800 font-bold';
                      displayStatus = 'Rejected';
                    } else if (t.status === 'Delayed') {
                      badgeColor = 'bg-red-100 text-red-800 font-bold';
                      displayStatus = 'Delayed';
                    } else if (t.status === 'Ongoing') {
                      badgeColor = 'bg-blue-100 text-blue-800 font-bold';
                      displayStatus = 'Ongoing';
                    }

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedInboxTaskId(t.id)}
                        className={`p-3 rounded-xl cursor-pointer transition-all flex flex-col gap-1 border ${
                          isSelected 
                            ? 'bg-purple-50 border-purple-300 shadow-sm' 
                            : 'hover:bg-zinc-200/50 border-transparent bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-bold text-zinc-900 text-[11px] truncate max-w-[170px]">{t.taskDescription}</span>
                          <span className={`text-[8px] uppercase px-1.5 py-0.5 rounded shrink-0 ${badgeColor}`}>
                            {displayStatus}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[8px] font-bold text-zinc-400">
                          <span>{t.category}</span>
                          <span>{t.user?.name}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 italic truncate font-medium mt-0.5">
                          {latestMsg}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Pane: Remarks / Activity Log Window */}
            <div className="flex-1 flex flex-col bg-white">
              {selectedInboxTask ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex justify-between items-center shrink-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-purple-100 text-purple-855 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">{selectedInboxTask.category}</span>
                        <span className="text-[10px] text-zinc-400 font-bold">Progress: {selectedInboxTask.progress}%</span>
                      </div>
                      <h4 className="font-extrabold text-zinc-900 text-sm mt-1">{selectedInboxTask.taskDescription}</h4>
                    </div>
                  </div>

                  {/* Activity & Remarks Log Timeline */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-zinc-50/20">
                    {chatMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-1.5">
                        <MessageSquare className="h-8 w-8 text-zinc-300" />
                        <p className="text-xs font-bold">No activity or remarks logged for this task.</p>
                      </div>
                    ) : (
                      <div className="relative border-l border-zinc-200 ml-3 pl-5 space-y-4 text-left">
                        {chatMessages.map((msg, idx) => {
                          const isSystem = msg.role === 'System' || msg.role === 'SYSTEM';
                          return (
                            <div key={idx} className="relative">
                              {/* Dot on the timeline */}
                              <div className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${
                                isSystem ? 'bg-zinc-400' : 'bg-purple-650'
                              }`} />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-extrabold text-zinc-800">
                                    {msg.sender}
                                  </span>
                                  <span className="text-[8px] bg-zinc-150 text-zinc-600 px-1 py-0.2 rounded font-extrabold uppercase">
                                    {msg.role}
                                  </span>
                                  <span className="text-[8px] text-zinc-400 font-medium">
                                    {new Date(msg.timestamp).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-700 font-semibold mt-1 bg-white border border-zinc-150 rounded-lg p-2.5 shadow-2xs max-w-2xl leading-relaxed italic">
                                  "{msg.message || msg.content}"
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Actions Bar inside chat */}
                  {selectedInboxTask.status === 'Pending Acceptance' && selectedInboxTask.userId === user.id && (
                    <div className="p-3 bg-amber-50 border-t border-amber-200 flex items-center justify-between gap-4 shrink-0 animate-fadeIn">
                      <div>
                        <p className="text-xs font-bold text-amber-850">This task was nominated to you by your supervisor.</p>
                        <p className="text-[10px] text-zinc-650 font-semibold">Please Accept or Reject to update your work plan.</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            await onAcceptTask(selectedInboxTask.id);
                            if (onRefresh) onRefresh();
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition active:scale-95 shadow"
                        >
                          Accept Task
                        </button>
                        <button
                          onClick={(e) => handleRejectClick(e, selectedInboxTask.id)}
                          className="bg-red-50 hover:bg-red-105 border border-red-200 text-red-600 font-bold px-3 py-1.5 rounded-lg text-xs transition active:scale-95"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Text Input Panel */}
                  <form onSubmit={handleSendInboxMessage} className="p-3 border-t border-zinc-200 bg-white flex gap-2 shrink-0">
                    <input
                      type="text"
                      value={inboxMessageText}
                      onChange={(e) => setInboxMessageText(e.target.value)}
                      placeholder="Add a remark or log entry..."
                      className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50/50 py-2 px-3 text-xs focus:bg-white focus:outline-none placeholder-zinc-400 font-semibold"
                    />
                    <button
                      type="submit"
                      disabled={sendingInboxMessage || !inboxMessageText.trim()}
                      className="bg-purple-650 hover:bg-purple-700 text-white font-bold p-2 rounded-xl transition active:scale-95 shadow disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-3">
                  <Inbox className="h-10 w-10 text-zinc-300" />
                  <p className="text-xs font-bold">Select a conversation thread on the left to open chat panel.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reject Reason Overlay */}
        {rejectingTaskId && (
          <div className="absolute inset-0 z-[550] bg-white rounded-2xl p-5 flex flex-col justify-center animate-fadeIn text-left animate-scaleIn">
            <h4 className="font-black text-base text-zinc-900 uppercase tracking-wider mb-1">Reject Task Nomination</h4>
            <p className="text-[10px] text-zinc-500 font-bold mb-3 leading-relaxed">
              Providing a reason is mandatory to reject this nominated deliverable.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-3 flex-1 flex flex-col justify-between">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection (e.g., overlapping schedules)..."
                rows={3}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 px-3.5 text-xs font-semibold placeholder-zinc-400 focus:bg-white focus:outline-none resize-none flex-1 min-h-[90px]"
                required
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 shrink-0">
                <button type="button" onClick={() => setRejectingTaskId(null)}
                  className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 font-bold rounded-lg text-xs transition">
                  Cancel
                </button>
                <button type="submit" disabled={submittingReject || !rejectionReason.trim()}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition shadow-md">
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Force Task Overlay */}
        {forcingTaskId && (
          <div className="absolute inset-0 z-[550] bg-white rounded-2xl p-5 flex flex-col justify-center animate-fadeIn text-left animate-scaleIn">
            <h4 className="font-black text-base text-zinc-900 uppercase tracking-wider mb-1">Force / Push Deliverable</h4>
            <p className="text-[10px] text-zinc-500 font-bold mb-3 leading-relaxed">
              Add a note or explanation to override the rejection and activate this task.
            </p>
            <form onSubmit={handleForceSubmit} className="space-y-3 flex-1 flex flex-col justify-between">
              <textarea
                value={forceNote}
                onChange={(e) => setForceNote(e.target.value)}
                placeholder="Add explanation note..."
                rows={3}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 px-3.5 text-xs font-semibold placeholder-zinc-400 focus:bg-white focus:outline-none resize-none flex-1 min-h-[90px]"
                required
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 shrink-0">
                <button type="button" onClick={() => setForcingTaskId(null)}
                  className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 font-bold rounded-lg text-xs transition">
                  Cancel
                </button>
                <button type="submit" disabled={submittingForce || !forceNote.trim()}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition shadow-md">
                  Confirm Force Push
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
