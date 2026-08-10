"use client";

import { useState, useEffect } from 'react';
import { 
  RefreshCw, Search, ShieldAlert, CheckCircle2, UserPlus, 
  LogIn, LogOut, FileEdit, Trash2, Archive, Clock, Download, Users, Layers
} from 'lucide-react';

function formatHumanReadableLogDetails(detailsStr) {
  if (!detailsStr) return '';
  
  // Extract JSON payload if embedded in detailsStr
  const jsonMatch = detailsStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return detailsStr;
  }

  const prefixText = detailsStr.slice(0, jsonMatch.index).trim();
  const rawJson = jsonMatch[0];

  try {
    const data = JSON.parse(rawJson);
    const parts = [];

    if (data.taskDescription) {
      parts.push(`Task: "${data.taskDescription}"`);
    } else if (data.taskTitle) {
      parts.push(`Task: "${data.taskTitle}"`);
    }

    if (data.assigneeName) {
      parts.push(`Assignee: ${data.assigneeName}`);
    }
    if (data.nominatedBy) {
      parts.push(`Nominated by: ${data.nominatedBy}`);
    }
    if (data.progress !== undefined) {
      parts.push(`Progress set to ${data.progress}%`);
    }
    if (data.status) {
      parts.push(`Status: ${data.status}`);
    }
    if (data.rejectionReason) {
      parts.push(`Reason: "${data.rejectionReason}"`);
    }
    
    // Parse nested remarks if stringified array
    if (data.remarks) {
      let remarksArr = [];
      try {
        remarksArr = typeof data.remarks === 'string' ? JSON.parse(data.remarks) : data.remarks;
      } catch(e) {}
      
      if (Array.isArray(remarksArr) && remarksArr.length > 0) {
        const lastMsg = remarksArr[remarksArr.length - 1];
        if (lastMsg && (lastMsg.message || lastMsg.content)) {
          parts.push(`Note: "${lastMsg.message || lastMsg.content}"`);
        }
      } else if (typeof data.remarks === 'string' && data.remarks) {
        parts.push(`Remarks: "${data.remarks}"`);
      }
    }

    if (parts.length > 0) {
      return `${prefixText ? prefixText + ' — ' : ''}${parts.join(' | ')}`;
    }
  } catch (e) {
    const cleaned = detailsStr.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    return cleaned;
  }

  return detailsStr;
}

export default function InsightsView({ onClose }) {
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' | 'usage'
  const [logs, setLogs] = useState([]);
  const [userUsageStats, setUserUsageStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [usageSearch, setUsageSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/insights');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setUserUsageStats(data.userUsageStats || []);
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
      default: return <ShieldAlert className="h-4 w-4 text-purple-600" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    const search = searchTerm.toLowerCase();
    const readableDetails = formatHumanReadableLogDetails(log.details).toLowerCase();
    return (
      log.action.toLowerCase().includes(search) ||
      log.details.toLowerCase().includes(search) ||
      readableDetails.includes(search) ||
      log.user?.name.toLowerCase().includes(search) ||
      log.user?.username.toLowerCase().includes(search)
    );
  });

  const filteredUsage = userUsageStats.filter(u => {
    const q = usageSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.departmentName.toLowerCase().includes(q) ||
      u.position.toLowerCase().includes(q) ||
      u.status.toLowerCase().includes(q)
    );
  });

  const handleExportUsageToExcel = () => {
    const nowStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1f2937; }
          .header-title { font-size: 16px; font-weight: 900; color: #1e3a8a; text-align: center; text-transform: uppercase; }
          .header-sub { font-size: 13px; font-weight: 800; color: #0284c7; text-align: center; text-transform: uppercase; margin-bottom: 15px; }
          .data-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; }
          .data-table th { background-color: #1e293b; color: #ffffff; font-weight: 800; text-transform: uppercase; padding: 8px 10px; border: 1px solid #0f172a; font-size: 10px; text-align: left; }
          .data-table td { padding: 8px 10px; border: 1px solid #cbd5e1; font-size: 11px; vertical-align: middle; }
          .bg-even { background-color: #f8fafc; }
          .status-active { background-color: #dcfce7; color: #15803d; font-weight: 800; padding: 2px 6px; border-radius: 4px; }
          .status-recent { background-color: #dbeafe; color: #1d4ed8; font-weight: 800; padding: 2px 6px; border-radius: 4px; }
          .status-inactive { background-color: #f3f4f6; color: #6b7280; font-weight: 800; padding: 2px 6px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div className="header-title">STI COLLEGE PUERTO PRINCESA</div>
        <div className="header-sub">FACULTY &amp; ADMIN USER SYSTEM USAGE &amp; SESSION TIME MONITORING REPORT</div>
        <div style="font-weight: 700; color: #475569; margin-bottom: 10px;">Report Generated On: ${nowStr}</div>

        <table className="data-table">
          <thead>
            <tr>
              <th style="width: 50px;">ID</th>
              <th style="width: 160px;">User Name</th>
              <th style="width: 100px;">Username</th>
              <th style="width: 130px;">Role</th>
              <th style="width: 130px;">Department</th>
              <th style="width: 120px;">Position</th>
              <th style="width: 80px;">Total Logins</th>
              <th style="width: 140px;">Computed System Time Spent</th>
              <th style="width: 160px;">Last Active Date &amp; Time</th>
              <th style="width: 120px;">Usage Status</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredUsage.forEach((u, index) => {
      const isEven = index % 2 === 0;
      const lastActiveStr = u.lastActiveDate ? new Date(u.lastActiveDate).toLocaleString('en-US') : 'Never Active';
      const statusClass = u.status === 'Active Today' ? 'status-active' : u.status === 'Recently Active' ? 'status-recent' : 'status-inactive';

      html += `
        <tr className="${isEven ? 'bg-even' : ''}">
          <td>#${u.id}</td>
          <td><strong>${u.name}</strong></td>
          <td>@${u.username}</td>
          <td>${u.role}</td>
          <td>${u.departmentName}</td>
          <td>${u.position}</td>
          <td><strong>${u.totalLoginCount}</strong></td>
          <td><strong style="color: #2563eb;">${u.formattedDuration}</strong></td>
          <td>${lastActiveStr}</td>
          <td><span className="${statusClass}">${u.status}</span></td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `STI_User_System_Usage_Report_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full w-full text-zinc-900 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-4 shrink-0">
        <div>
          <h3 className="text-xl font-black flex items-center gap-2 text-zinc-800 tracking-tight">
            <ShieldAlert className="h-6 w-6 text-purple-600" />
            Administrator Audit Logs &amp; User Time Insights
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5 font-medium">Monitor user activity logs and track computed system usage time for all Faculty &amp; Admin staff.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-600 rounded-lg active:scale-95 transition"
            title="Refresh logs & time tracking"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 px-3 py-1.5 rounded-lg text-xs font-bold transition border border-zinc-200"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-200 mb-4 shrink-0 font-bold text-xs select-none">
        <button
          onClick={() => setActiveTab('logs')}
          className={`py-2.5 px-4 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'logs' 
              ? 'border-purple-600 text-purple-700 font-black' 
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          🛡️ Readable Activity Audit Logs ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('usage')}
          className={`py-2.5 px-4 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'usage' 
              ? 'border-blue-600 text-blue-700 font-black' 
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Clock className="h-4 w-4" />
          ⏱️ System Usage &amp; Time Log Monitored ({userUsageStats.length} Users)
        </button>
      </div>

      {/* TAB 1: READABLE ACTIVITY LOGS */}
      {activeTab === 'logs' && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden pb-1">
          <div className="mb-3 relative shrink-0">
            <input
              type="text"
              placeholder="Search activity by user name, action, or plain sentence details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-xs focus:border-purple-400 focus:bg-white focus:outline-none transition font-medium"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto border border-zinc-200 rounded-xl shadow-xs scrollbar-thin">
            {loading ? (
              <div className="p-12 text-center text-zinc-500 font-bold text-xs">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-purple-600 mx-auto mb-2"></div>
                Loading activity logs...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 bg-zinc-50 font-bold text-xs">
                No activity logs match the filter.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-zinc-100 border-b border-zinc-200 text-zinc-600 font-extrabold uppercase tracking-wider z-10 select-none">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">User</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Readable Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-zinc-50 transition">
                      <td className="py-2.5 px-4 text-zinc-500 font-medium whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('en-US')}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div>
                          <span className="font-bold text-zinc-900 block">{log.user?.name || `ID: ${log.userId}`}</span>
                          <span className="text-[10px] text-zinc-400 block font-semibold">{log.user?.role} • {log.user?.department?.name || 'Admin'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded border border-zinc-300 font-bold text-[10px]">
                          {getActionIcon(log.action)}
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-zinc-700 font-semibold leading-relaxed">
                        {formatHumanReadableLogDetails(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SYSTEM USAGE & TIME LOG MONITORED */}
      {activeTab === 'usage' && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden pb-1">
          <div className="flex justify-between items-center gap-3 mb-3 shrink-0">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search user usage by name, username, department, or status..."
                value={usageSearch}
                onChange={(e) => setUsageSearch(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-xs focus:border-blue-400 focus:bg-white focus:outline-none transition font-medium"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            </div>

            <button
              onClick={handleExportUsageToExcel}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-xs active:scale-95 transition shrink-0"
              title="Export User Usage & Login History to Excel"
            >
              <Download className="h-3.5 w-3.5" />
              Export Usage to Excel
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto border border-zinc-200 rounded-xl shadow-xs scrollbar-thin">
            {loading ? (
              <div className="p-12 text-center text-zinc-500 font-bold text-xs">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600 mx-auto mb-2"></div>
                Computing system usage duration for all users...
              </div>
            ) : filteredUsage.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 bg-zinc-50 font-bold text-xs">
                No user usage records match the search criteria.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-zinc-100 border-b border-zinc-200 text-zinc-600 font-extrabold uppercase tracking-wider z-10 select-none">
                  <tr>
                    <th className="py-2.5 px-4">User Details</th>
                    <th className="py-2.5 px-4">Department &amp; Position</th>
                    <th className="py-2.5 px-4">Logins</th>
                    <th className="py-2.5 px-4">⏱️ Computed Time Spent</th>
                    <th className="py-2.5 px-4">Last Active Time</th>
                    <th className="py-2.5 px-4">Usage Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredUsage.map(u => {
                    const isToday = u.status === 'Active Today';
                    const isRecent = u.status === 'Recently Active';
                    
                    const badgeColor = isToday ? 'bg-green-100 text-green-800 border-green-300'
                      : isRecent ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-zinc-100 text-zinc-600 border-zinc-300';

                    return (
                      <tr key={u.id} className="hover:bg-zinc-50 transition">
                        <td className="py-3 px-4">
                          <div>
                            <span className="font-extrabold text-zinc-900 block text-xs">{u.name}</span>
                            <span className="text-[10px] text-zinc-500 font-medium">@{u.username} • {u.role}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-zinc-700 font-semibold">
                          <div>
                            <span className="font-bold block">{u.departmentName}</span>
                            <span className="text-[10px] text-zinc-500">{u.position}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-zinc-800">
                          {u.totalLoginCount} login{u.totalLoginCount === 1 ? '' : 's'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs">
                            <Clock className="h-3 w-3 text-blue-600" />
                            {u.formattedDuration}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-600 font-semibold whitespace-nowrap">
                          {u.lastActiveDate ? new Date(u.lastActiveDate).toLocaleString('en-US') : 'Never Active'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider ${badgeColor}`}>
                            {u.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
