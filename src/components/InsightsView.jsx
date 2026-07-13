"use client";

import { useState, useEffect } from 'react';
import { RefreshCw, Search, ShieldAlert, CheckCircle2, UserPlus, LogIn, LogOut, FileEdit, Trash2, Archive } from 'lucide-react';

export default function InsightsView({ onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/insights');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'LOGIN': return <LogIn className="h-4 w-4 text-blue-600" />;
      case 'LOGOUT': return <LogOut className="h-4 w-4 text-zinc-500" />;
      case 'CREATE_TASK': return <UserPlus className="h-4 w-4 text-green-600" />;
      case 'UPDATE_TASK': return <FileEdit className="h-4 w-4 text-yellow-600" />;
      case 'COMPLETE_TASK': return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'DELETE_TASK': return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'ARCHIVE_TASK': return <Archive className="h-4 w-4 text-purple-600" />;
      default: return <ShieldAlert className="h-4 w-4 text-zinc-600" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    const search = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(search) ||
      log.details.toLowerCase().includes(search) ||
      log.user?.name.toLowerCase().includes(search) ||
      log.user?.username.toLowerCase().includes(search)
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 max-w-5xl w-full mx-auto animate-scaleIn text-zinc-900">
      <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-6">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2 text-zinc-800">
            <ShieldAlert className="h-6 w-6 text-purple-600" />
            School Administrator Audit Logs & Insights
          </h3>
          <p className="text-xs text-zinc-500 mt-1">Track user movements, updates, and accomplishments in real-time.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-600 rounded-lg active:scale-95 transition"
            title="Refresh logs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition border border-zinc-200"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 relative">
        <input
          type="text"
          placeholder="Filter logs by user, action, details..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-xs focus:border-zinc-300 focus:bg-white focus:outline-none transition"
        />
        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
      </div>

      {/* Logs Table */}
      <div className="border border-zinc-100 rounded-xl overflow-hidden shadow-inner max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-purple-600 mx-auto mb-2"></div>
            Loading audit trails...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-zinc-400 bg-zinc-50">
            No activity logs match the filter.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-zinc-50/80 transition">
                  <td className="py-2.5 px-4 text-zinc-500 font-medium whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('en-US')}
                  </td>
                  <td className="py-2.5 px-4">
                    <div>
                      <span className="font-bold text-zinc-800">{log.user?.name || `ID: ${log.userId}`}</span>
                      <span className="text-[10px] text-zinc-400 block">{log.user?.role} • {log.user?.department?.name || 'No Dept'}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded border border-zinc-200 font-bold text-[10px]">
                      {getActionIcon(log.action)}
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-zinc-600 font-medium leading-relaxed">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
