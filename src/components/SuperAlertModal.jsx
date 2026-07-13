"use client";

import { AlertTriangle, Clock, Calendar, CheckCircle2 } from 'lucide-react';

export default function SuperAlertModal({ tasks, onClose }) {
  // Filter for delayed tasks, or tasks due in next 3 days
  const now = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);

  const urgentTasks = tasks.filter(t => {
    if (t.status === 'Completed' || t.status === 'Archived') return false;
    if (t.status === 'Delayed') return true;
    if (t.targetDate) {
      const target = new Date(t.targetDate);
      return target <= threeDaysFromNow;
    }
    return false;
  });

  if (urgentTasks.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border-4 border-red-500 shadow-2xl max-w-lg w-full p-6 text-zinc-900 animate-scaleIn text-center">
        {/* Warning Icon Banner */}
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center animate-bounce border-2 border-red-300">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
        </div>

        {/* Urgent Header */}
        <h3 className="text-2xl font-black text-red-600 tracking-tight mb-2">
          MAHALAGANG PAALALA! / URGENT WARNING!
        </h3>
        <p className="text-zinc-600 text-sm font-semibold mb-6">
          Hindi mo pwedeng tanggihan na hindi mo napansin ang mga sumusunod na deadline. Mayroon kang mga task na delayed o malapit nang matapos ang palugit!
        </p>

        {/* Task Breakdown list */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 mb-6 max-h-[220px] overflow-y-auto text-left space-y-3">
          {urgentTasks.map(t => {
            const isOverdue = t.status === 'Delayed' || (t.targetDate && new Date(t.targetDate) < now);
            return (
              <div key={t.id} className={`p-3 rounded-lg border-2 ${isOverdue ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'} flex items-start gap-3`}>
                <div className="mt-0.5">
                  {isOverdue ? (
                    <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-600 shrink-0" />
                  )}
                </div>
                <div>
                  <div className="font-extrabold text-xs text-zinc-800 uppercase tracking-wide">
                    {t.category} {isOverdue ? '— DELAYED!' : '— DUE SOON!'}
                  </div>
                  <p className="text-xs text-zinc-700 font-medium mt-0.5">{t.taskDescription}</p>
                  {t.targetDate && (
                    <p className="text-[10px] text-zinc-500 font-bold mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Deadline: {new Date(t.targetDate).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Acknowledge Button */}
        <button
          onClick={onClose}
          className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-black py-3.5 px-6 rounded-xl shadow-lg shadow-red-500/20 text-sm tracking-widest uppercase transition-all"
        >
          Naiintindihan ko at Aayusin ko ngayon
        </button>
      </div>
    </div>
  );
}
