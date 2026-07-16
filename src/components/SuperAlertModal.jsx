"use client";

import { useState } from 'react';
import { AlertTriangle, Clock, Calendar, Inbox, Check, X } from 'lucide-react';

export default function SuperAlertModal({ tasks, user, onClose, onAcceptTask, onRejectTask }) {
  const [rejectingTaskId, setRejectingTaskId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  const now = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);

  if (!user) return null;

  // Filter urgent tasks:
  // 1. Pending Acceptance assigned to the user
  // 2. Delayed or Due soon tasks
  const urgentTasks = tasks.filter(t => {
    if (t.status === 'Completed' || t.status === 'Archived') return false;
    // Nominations pending for this user
    if (t.status === 'Pending Acceptance' && t.userId === user.id) return true;
    // Delayed tasks assigned to this user
    if (t.status === 'Delayed' && t.userId === user.id) return true;
    // Tasks due soon assigned to this user
    if (t.targetDate && t.userId === user.id) {
      const target = new Date(t.targetDate);
      return target <= threeDaysFromNow;
    }
    return false;
  });

  if (urgentTasks.length === 0) return null;

  const handleRejectClick = (taskId) => {
    setRejectingTaskId(taskId);
    setRejectionReason('');
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return;
    setSubmittingReject(true);
    try {
      await onRejectTask(rejectingTaskId, rejectionReason.trim());
      setRejectingTaskId(null);
      setRejectionReason('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReject(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border-4 border-red-500 shadow-2xl max-w-lg w-full p-6 text-zinc-900 animate-scaleIn text-center relative">
        
        {/* Warning Icon Banner */}
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center animate-bounce border-2 border-red-300">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
        </div>

        {/* Urgent Header */}
        <h3 className="text-2xl font-black text-red-600 tracking-tight mb-2 uppercase">
          URGENT WARNING / IMPORTANT NOTICE
        </h3>
        <p className="text-zinc-650 text-sm font-semibold mb-6">
          You have pending actions or deadlines that require your immediate attention. Please review the items below.
        </p>

        {/* Task Breakdown list */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 mb-6 max-h-[260px] overflow-y-auto text-left space-y-3">
          {urgentTasks.map(t => {
            const isNomination = t.status === 'Pending Acceptance';
            const isOverdue = t.status === 'Delayed' || (t.targetDate && new Date(t.targetDate) < now);

            return (
              <div 
                key={t.id} 
                className={`p-3.5 rounded-xl border-2 transition-all ${
                  isNomination 
                    ? 'border-blue-300 bg-blue-50/50' 
                    : isOverdue 
                      ? 'border-red-300 bg-red-50/50' 
                      : 'border-yellow-350 bg-yellow-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {isNomination ? (
                      <Inbox className="h-5 w-5 text-blue-600 shrink-0" />
                    ) : isOverdue ? (
                      <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-650 shrink-0" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        isNomination ? 'bg-blue-100 text-blue-800' : 'bg-zinc-200 text-zinc-800'
                      }`}>
                        {t.category || 'Deliverable'}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-zinc-400">
                        {isNomination ? 'Nomination' : isOverdue ? 'Delayed' : 'Due Soon'}
                      </span>
                    </div>
                    
                    <p className="font-extrabold text-zinc-900 text-sm mt-1">{t.taskDescription}</p>
                    
                    {t.assignedNote && (
                      <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-2 mt-2 font-medium">
                        <span className="font-bold">Supervisor Note:</span> {t.assignedNote}
                      </p>
                    )}

                    {t.targetDate && (
                      <p className="text-[10px] text-zinc-500 font-bold mt-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Deadline: {new Date(t.targetDate).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                      </p>
                    )}

                    {/* Nomination Action buttons inside row */}
                    {isNomination && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-blue-200/50">
                        <button
                          onClick={() => onAcceptTask(t.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 shadow-xs active:scale-[0.98] transition"
                        >
                          <Check className="h-3.5 w-3.5" /> Accept Task
                        </button>
                        <button
                          onClick={() => handleRejectClick(t.id)}
                          className="flex-1 bg-red-50 hover:bg-red-100 text-red-655 border border-red-200 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 active:scale-[0.98] transition"
                        >
                          <X className="h-3.5 w-3.5" /> Reject Task
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action button to Acknowledge modal */}
        <button
          onClick={onClose}
          className="w-full bg-zinc-800 hover:bg-zinc-900 active:scale-[0.98] text-white font-black py-3.5 px-6 rounded-xl shadow-lg text-sm tracking-widest uppercase transition-all"
        >
          I Understand and Will Take Action Now
        </button>

        {/* Nested Reject Reason Overlay Modal */}
        {rejectingTaskId && (
          <div className="absolute inset-0 z-50 bg-white rounded-2xl p-6 flex flex-col justify-center animate-fadeIn text-left animate-scaleIn">
            <h4 className="font-black text-lg text-zinc-900 uppercase tracking-wider mb-2">Reject Task Nomination</h4>
            <p className="text-xs text-zinc-500 font-medium mb-4 leading-relaxed">
              Providing a reason is mandatory to reject this nominated deliverable.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection (e.g., overlapping schedules, resource limits)..."
                rows={4}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 px-4 text-xs font-semibold placeholder-zinc-400 focus:bg-white focus:outline-none resize-none flex-1 min-h-[120px]"
                required
              />
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setRejectingTaskId(null)}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 font-bold rounded-lg text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReject || !rejectionReason.trim()}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-55 text-white font-bold rounded-lg text-xs transition shadow-md"
                >
                  {submittingReject ? 'Submitting...' : 'Confirm Reject'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
