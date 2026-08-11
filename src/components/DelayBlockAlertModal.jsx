import React from 'react';
import { ShieldAlert, AlertTriangle, ExternalLink, X, Clock } from 'lucide-react';

export default function DelayBlockAlertModal({ isOpen, onClose, onOpenTracker, blockInfo }) {
  if (!isOpen || !blockInfo) return null;

  return (
    <div 
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fadeIn"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-red-200 animate-scaleIn text-zinc-900"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-white shrink-0" />
            <h3 className="text-base font-extrabold tracking-wide">
              Task Completion Blocked
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1 rounded-lg transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-left">
          
          {/* Delay Badge */}
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-3 rounded-xl">
            <Clock className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="text-xs font-black text-red-900">
                {blockInfo.delayDays || 3} Days Delay Detected
              </p>
              <p className="text-[11px] text-red-700 font-semibold">
                This activity is subject to formal Delay Monitoring (Justifications &amp; NTEs).
              </p>
            </div>
          </div>

          {/* Explanation Text */}
          <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl space-y-2">
            <p className="text-xs font-extrabold text-zinc-800 uppercase tracking-wider">
              {blockInfo.code === 'USER_REPLY_REQUIRED' ? 'Action Required From You:' : 'Awaiting Administrative Action:'}
            </p>
            <p className="text-xs text-zinc-700 leading-relaxed font-semibold">
              {blockInfo.message || 'Task completion is blocked due to an unresolved delay monitoring requirement.'}
            </p>
          </div>

          {/* Guidelines Box */}
          <div className="text-[11px] text-zinc-500 bg-amber-50/60 border border-amber-200/60 p-3 rounded-lg space-y-1 font-medium">
            <p className="font-bold text-amber-900">Required Completion Steps:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-amber-800">
              <li>School Administrator must issue a formal Justification or NTE request.</li>
              <li>Assigned employee must submit their formal reply and attach their Repository Link.</li>
              <li>Once verified, progress change to 100% will be unlocked.</li>
            </ol>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-zinc-300 text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
          >
            Close
          </button>
          
          {onOpenTracker && (
            <button
              onClick={() => {
                onClose();
                onOpenTracker();
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" />
              Open Delay Monitoring Tracker
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
