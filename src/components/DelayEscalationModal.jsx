import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Clock, Link as LinkIcon, ExternalLink, Check, Send, FileText, ChevronDown, ChevronUp, User, ShieldAlert, CheckCircle2, X, PlusCircle } from 'lucide-react';
import { getTaskDelayDays } from '@/lib/taskHelpers';

export default function DelayEscalationModal({ isOpen, onClose, tasks = [], user, onRefresh }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  
  // School Admin Form State
  const [actionType, setActionType] = useState('JUSTIFICATION'); // 'JUSTIFICATION' | 'NTE'
  const [driveLinkInput, setDriveLinkInput] = useState('');
  const [chatMessageInput, setChatMessageInput] = useState('');
  
  // User Reply Form State
  const [replyLinkInput, setReplyLinkInput] = useState('');
  const [replyCommentInput, setReplyCommentInput] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTask]);

  if (!isOpen || !user) return null;

  const isAdmin = user.role === 'SCHOOL_ADMIN';
  const isPrincipal = user.role === 'PRINCIPAL';
  const isProgramHead = user.role === 'PROGRAM_HEAD';

  // 1. Filter active delayed tasks (not completed/archived and delayDays > 0)
  const activeDelayedTasks = tasks.filter(t => {
    if (t.status === 'Completed' || t.archived) return false;
    const days = getTaskDelayDays(t);
    return days >= 3;
  });

  // 2. Filter tasks based on logged-in user role hierarchy
  const scopedTasks = activeDelayedTasks.filter(t => {
    if (isAdmin) return true; // School Admin sees all
    if (isPrincipal) return true; // Principal sees all PH and Faculty delays
    if (isProgramHead) {
      // PH sees their own delays + faculty delays in their department
      if (t.userId === user.id) return true;
      
      const phDeptId = user.departmentId || user.department?.id;
      const phDeptName = user.department?.name;

      const taskUserDeptId = t.user?.departmentId || t.user?.department?.id;
      const taskUserDeptName = t.user?.department?.name;

      if (phDeptId && taskUserDeptId && String(phDeptId) === String(taskUserDeptId)) return true;
      if (phDeptName && taskUserDeptName && phDeptName.trim().toLowerCase() === taskUserDeptName.trim().toLowerCase()) return true;

      return false;
    }
    // Faculty sees only their own
    return t.userId === user.id;
  });

  // 3. Group scoped delayed tasks by User
  const userGroupsMap = new Map();
  scopedTasks.forEach(t => {
    const uId = t.userId;
    const uName = t.user?.name || 'Staff Member';
    const uRole = t.user?.role || 'FACULTY_STAFF';
    const uDept = t.user?.department?.name || 'Academic Dept';

    if (!userGroupsMap.has(uId)) {
      userGroupsMap.set(uId, {
        userId: uId,
        userName: uName,
        userRole: uRole,
        departmentName: uDept,
        tasks: []
      });
    }
    userGroupsMap.get(uId).tasks.push(t);
  });

  const userGroups = Array.from(userGroupsMap.values());

  // Automatically select first delayed task
  const currentTask = selectedTask || (scopedTasks.length > 0 ? scopedTasks[0] : null);

  const parseRemarksList = (remarksStr) => {
    if (!remarksStr) return [];
    try {
      const parsed = typeof remarksStr === 'string' ? JSON.parse(remarksStr) : remarksStr;
      if (Array.isArray(parsed)) return parsed;
    } catch(e){}
    return [{ sender: 'System', role: 'SYSTEM', message: remarksStr, timestamp: new Date().toISOString() }];
  };

  const currentTaskRemarks = parseRemarksList(currentTask?.remarks);
  const adminEscalationEntry = currentTaskRemarks.find(m => 
    (m.message || '').includes('[ADMIN_ESCALATION]') ||
    (m.message || '').includes('[ADMIN_NOTICE]') ||
    (m.message || '').includes('[SUPERVISOR_ACTION]')
  );
  const userReplyEntry = currentTaskRemarks.find(m => 
    (m.message || '').includes('[USER_REPLY]') ||
    (m.message || '').includes('[STAFF_REPLY]')
  );

  // School Admin Issue Action Submission
  const handleAdminIssueAction = async (e) => {
    if (e) e.preventDefault();
    if (!currentTask) return;
    if (!driveLinkInput.trim() || !chatMessageInput.trim()) {
      alert('Both Repository Link and Short Comment are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const typeLabel = actionType === 'NTE' ? 'Notice to Explain (NTE)' : 'Justification Request';
      const formattedMessage = `[ADMIN_ESCALATION]: Issued ${typeLabel} | Repository Link: ${driveLinkInput.trim()} — Comment: "${chatMessageInput.trim()}"`;

      const res = await fetch(`/api/tasks/${currentTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remarks: formattedMessage
        })
      });

      if (res.ok) {
        setDriveLinkInput('');
        setChatMessageInput('');
        setShowActionModal(false); // Close mini modal automatically
        if (onRefresh) await onRefresh();
        const updatedRes = await fetch(`/api/tasks`);
        if (updatedRes.ok) {
          const data = await updatedRes.json();
          const refreshedTask = data.tasks.find(t => t.id === currentTask.id);
          if (refreshedTask) setSelectedTask(refreshedTask);
        }
      } else {
        alert('Failed to send escalation document.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // User Reply Submission
  const handleUserReplySubmission = async (e) => {
    if (e) e.preventDefault();
    if (!currentTask) return;
    if (!replyLinkInput.trim() || !replyCommentInput.trim()) {
      alert('Both Repository Link and Short Comment are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedMessage = `[USER_REPLY]: Repository Link: ${replyLinkInput.trim()} — Comment: "${replyCommentInput.trim()}"`;

      const res = await fetch(`/api/tasks/${currentTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remarks: formattedMessage
        })
      });

      if (res.ok) {
        setReplyLinkInput('');
        setReplyCommentInput('');
        setShowActionModal(false); // Close mini modal automatically
        if (onRefresh) await onRefresh();
        const updatedRes = await fetch(`/api/tasks`);
        if (updatedRes.ok) {
          const data = await updatedRes.json();
          const refreshedTask = data.tasks.find(t => t.id === currentTask.id);
          if (refreshedTask) setSelectedTask(refreshedTask);
        }
      } else {
        alert('Failed to submit reply.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserExpand = (uId) => {
    setExpandedUserId(prev => prev === uId ? null : uId);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-zinc-100 px-6 py-4 flex-shrink-0 bg-red-50/50">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              Delay Monitoring (Justifications &amp; NTEs)
            </h3>
            <p className="text-xs text-zinc-500 font-semibold mt-1">
              {isAdmin 
                ? 'School Administrator Control Panel: Issue Justifications (3 days) and Notice to Explain (NTE) letters to delayed accounts.' 
                : 'Hierarchical Monitoring &amp; Reply Panel for task delays.'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            Close ✕
          </button>
        </div>

        {/* 2-Column Main Layout */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Collapsible Users List with Delayed Activities */}
          <div className="w-full md:w-80 border-r border-zinc-200 bg-zinc-50 flex flex-col shrink-0">
            <div className="p-3 border-b border-zinc-200 bg-white">
              <h4 className="text-xs font-black uppercase text-zinc-700 tracking-wider flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-red-600" />
                Delayed Accounts ({userGroups.length})
              </h4>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {userGroups.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 text-xs">
                  No accounts with active delays in your scope.
                </div>
              ) : (
                userGroups.map(group => {
                  const isUserExpanded = expandedUserId === group.userId || (userGroups.length === 1);

                  return (
                    <div 
                      key={`user-group-${group.userId}`}
                      className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs"
                    >
                      {/* User Header */}
                      <div 
                        onClick={() => toggleUserExpand(group.userId)}
                        className="p-3 bg-zinc-50 hover:bg-zinc-100/80 cursor-pointer flex items-center justify-between transition select-none"
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-zinc-500 shrink-0" />
                          <div>
                            <p className="font-extrabold text-xs text-zinc-900 leading-tight">{group.userName}</p>
                            <p className="text-[10px] text-zinc-400 font-semibold">{group.departmentName}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-black">
                            {group.tasks.length}
                          </span>
                          {isUserExpanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                        </div>
                      </div>

                      {/* Collapsible Delayed Tasks under User */}
                      {isUserExpanded && (
                        <div className="p-2 border-t border-zinc-100 bg-white space-y-1.5">
                          {group.tasks.map(t => {
                            const delayDays = getTaskDelayDays(t);
                            const isSelected = currentTask?.id === t.id;
                            const isNte = delayDays >= 4;

                            return (
                              <div
                                key={`delay-task-item-${t.id}`}
                                onClick={() => setSelectedTask(t)}
                                className={`p-2.5 rounded-lg border cursor-pointer transition text-left ${
                                  isSelected 
                                    ? 'bg-red-600 text-white border-red-600 shadow-xs' 
                                    : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-800'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                    isSelected 
                                      ? 'bg-white/20 text-white' 
                                      : isNte 
                                      ? 'bg-red-100 text-red-800' 
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {isNte ? '4-7+ Days (NTE)' : '3 Days (Justification)'}
                                  </span>
                                  <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-red-600'}`}>
                                    {delayDays}d Delay
                                  </span>
                                </div>
                                <p className={`text-xs font-bold line-clamp-2 ${isSelected ? 'text-white' : 'text-zinc-900'}`}>
                                  {t.taskDescription}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Full-Height Timeline & Action Launch Footer */}
          {currentTask ? (
            <div className="flex-1 flex flex-col min-h-0 bg-white">
              
              {/* Task Title & Details Header */}
              <div className="p-4 border-b border-zinc-200 bg-zinc-50 shrink-0 space-y-1.5 text-left">
                <h3 className="text-base font-extrabold text-zinc-900 leading-snug">{currentTask.taskDescription}</h3>
                
                <p className="text-xs text-zinc-600 font-medium">
                  Assignee: <span className="font-extrabold text-zinc-900">{currentTask.user?.name || 'Staff Member'}</span> ({currentTask.user?.department?.name || 'Academic Dept'})
                </p>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-md">
                    {getTaskDelayDays(currentTask)} Days Delay
                  </span>
                  <span className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-md">
                    Category: {currentTask.category}
                  </span>
                </div>
              </div>

              {/* Full-Height Remarks & Escalation Timeline */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/30">
                {currentTaskRemarks.map((m, idx) => {
                  const isSys = m.role === 'SYSTEM' || m.sender === 'System';
                  const text = m.message || m.content || '';
                  const hasDriveLink = text.includes('http');
                  let driveUrl = '';
                  if (hasDriveLink) {
                    const match = text.match(/https?:\/\/[^\s"]+/);
                    if (match) driveUrl = match[0];
                  }

                  return (
                    <div 
                      key={`chat-msg-${idx}`}
                      className={`p-3.5 rounded-xl border text-xs text-left ${
                        isSys 
                          ? 'bg-zinc-100 border-zinc-200 text-zinc-600' 
                          : text.includes('[ADMIN_ESCALATION]')
                          ? 'bg-red-50 border-red-200 text-red-950'
                          : text.includes('[USER_REPLY]')
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                          : 'bg-purple-50 border-purple-200 text-purple-950'
                      }`}
                    >
                      <div className="flex justify-between items-center font-bold text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                        <span>{m.sender || 'System'} ({m.role || 'LOG'})</span>
                        <span>{m.timestamp ? new Date(m.timestamp).toLocaleString() : ''}</span>
                      </div>
                      <p className="font-semibold leading-relaxed text-xs">{text}</p>
                      {driveUrl && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-200/60">
                          <a 
                            href={driveUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-[11px] font-bold transition shadow-xs"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Open Attached Repository Link Document
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Footer Launcher Bar (Opens Pop-up Mini Modal) */}
              <div className="p-4 border-t border-zinc-200 bg-zinc-50 shrink-0">
                {isAdmin && (
                  <button
                    onClick={() => {
                      if (getTaskDelayDays(currentTask) >= 4) setActionType('NTE');
                      else setActionType('JUSTIFICATION');
                      setShowActionModal(true);
                    }}
                    className="w-full bg-red-700 hover:bg-red-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <PlusCircle className="h-4 w-4" /> Issue Justification / Notice to Explain Document
                  </button>
                )}

                {!isAdmin && currentTask.userId === user.id && (
                  <div>
                    {adminEscalationEntry && !userReplyEntry && (
                      <button
                        onClick={() => setShowActionModal(true)}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <Send className="h-4 w-4" /> Reply to Notice Document
                      </button>
                    )}

                    {!adminEscalationEntry && (
                      <div className="bg-white p-3.5 rounded-xl border border-zinc-200 text-xs text-zinc-600 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                          <span className="font-bold text-zinc-800">
                            Awaiting School Administrator review &amp; notice issue for this task delay.
                          </span>
                        </div>
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded text-[10px] font-bold shrink-0">Pending Admin Notice</span>
                      </div>
                    )}

                    {adminEscalationEntry && userReplyEntry && (
                      <div className="bg-white p-3.5 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="font-extrabold">
                            You have submitted your formal reply document for this delay.
                          </span>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded text-[10px] font-bold shrink-0">Reply Submitted</span>
                      </div>
                    )}
                  </div>
                )}

                {!isAdmin && currentTask.userId !== user.id && (
                  <div className="bg-white p-3.5 rounded-xl border border-zinc-200 text-xs text-zinc-600 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-purple-600 shrink-0" />
                      <span className="font-bold text-zinc-800">
                        {adminEscalationEntry ? 'School Administrator has issued a notice.' : 'Awaiting School Administrator review.'}
                      </span>
                    </div>
                    {userReplyEntry && (
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded text-[10px] font-bold">Staff Replied</span>
                    )}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-400 text-xs py-20">
              Select an account and delayed task to inspect delay details.
            </div>
          )}

        </div>

      </div>

      {/* ──────────────────────────────── POP-UP MINI MODAL IN FRONT ──────────────────────────────── */}
      {showActionModal && currentTask && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowActionModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-200 animate-scaleIn text-zinc-900" onClick={e => e.stopPropagation()}>
            
            {/* Mini Modal Header */}
            <div className="flex justify-between items-center border-b border-zinc-200 px-5 py-3.5 bg-zinc-50">
              <h4 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                {isAdmin ? 'School Administrator Issue Option' : 'Reply to Notice'}
              </h4>
              <button 
                onClick={() => setShowActionModal(false)}
                className="text-zinc-400 hover:text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 p-1 rounded-lg text-xs font-bold transition cursor-pointer"
                title="Cancel & Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mini Modal Body / Form */}
            <div className="p-5">
              {isAdmin ? (
                /* ADMIN ISSUE FORM */
                <form onSubmit={handleAdminIssueAction} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-red-800 uppercase tracking-wider mb-2">
                      Select Notice Type:
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActionType('JUSTIFICATION')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition border flex items-center justify-center gap-1.5 cursor-pointer ${
                          actionType === 'JUSTIFICATION' 
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                            : 'bg-zinc-50 text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                        }`}
                      >
                        Request Justification (3-Day Delay)
                      </button>

                      {getTaskDelayDays(currentTask) >= 4 && (
                        <button
                          type="button"
                          onClick={() => setActionType('NTE')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition border flex items-center justify-center gap-1.5 cursor-pointer ${
                            actionType === 'NTE' 
                              ? 'bg-red-600 text-white border-red-600 shadow-xs' 
                              : 'bg-zinc-50 text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                          }`}
                        >
                          Issue Notice to Explain (NTE)
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Repository Link <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      value={driveLinkInput}
                      onChange={e => setDriveLinkInput(e.target.value)}
                      placeholder="Paste Google Drive / Repository link to actual letter or NTE..."
                      className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-red-600 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Short Comment / Administrative Note <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={chatMessageInput}
                      onChange={e => setChatMessageInput(e.target.value)}
                      placeholder="Add short administrative comment or notes..."
                      className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-red-600 focus:bg-white transition resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setShowActionModal(false)}
                      className="px-4 py-2 rounded-lg text-xs font-bold border border-zinc-300 text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-red-700 hover:bg-red-800 text-white px-6 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                    >
                      {isSubmitting ? 'Sending...' : <><Send className="h-3.5 w-3.5" /> Send</>}
                    </button>
                  </div>
                </form>
              ) : (
                /* USER REPLY FORM */
                <form onSubmit={handleUserReplySubmission} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Repository Link <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      value={replyLinkInput}
                      onChange={e => setReplyLinkInput(e.target.value)}
                      placeholder="Paste Google Drive / Repository link for your reply letter document..."
                      className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Short Comment / Explanation <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={replyCommentInput}
                      onChange={e => setReplyCommentInput(e.target.value)}
                      placeholder="Add short reply comment or explanation..."
                      className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-emerald-600 focus:bg-white transition resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setShowActionModal(false)}
                      className="px-4 py-2 rounded-lg text-xs font-bold border border-zinc-300 text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                    >
                      {isSubmitting ? 'Sending...' : <><Send className="h-3.5 w-3.5" /> Send</>}
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
