"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, LayoutDashboard, Trophy, Bell, AlertTriangle, Clock, Calendar, Key } from 'lucide-react';
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
    async function getTasks() {
      try {
        const res = await fetch('/api/tasks?archived=false');
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks || []);
        }
      } catch (e) {
        console.error(e);
      }
    }
    getTasks();
    const interval = setInterval(getTasks, 15000);
    return () => clearInterval(interval);
  }, []);

  const now = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);

  const urgentTasks = tasks.filter(t => {
    if (readTaskIds.includes(t.id)) return false;
    if (t.status === 'Completed' || t.status === 'Archived') return false;
    if (t.status === 'Delayed') return true;
    if (t.targetDate) {
      const target = new Date(t.targetDate);
      return target <= threeDaysFromNow;
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
                    {user.position}{user.departmentName ? ` • ${user.departmentName}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 relative">
                {/* Notification Dropdown Trigger */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-all active:scale-95 border border-zinc-200 bg-white relative"
                    title="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {urgentTasks.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
                        {urgentTasks.length}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl z-50 text-zinc-900">
                      <div className="border-b border-zinc-100 pb-2 mb-3 flex items-center justify-between">
                        <span className="font-extrabold text-sm text-zinc-800">Deadlines & Alerts</span>
                        <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                          {urgentTasks.length} urgent
                        </span>
                      </div>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {urgentTasks.length === 0 ? (
                          <p className="text-xs text-zinc-500 text-center py-4">Walang urgent na deadlines o delayed tasks.</p>
                        ) : (
                          urgentTasks.map(t => {
                            const isDelayed = t.status === 'Delayed';
                            return (
                              <div
                                key={t.id}
                                onClick={() => {
                                  setShowNotifications(false);
                                  setTaskTrigger(t);
                                  setReadTaskIds(prev => [...prev, t.id]);
                                }}
                                className={`p-2.5 rounded-lg border text-left cursor-pointer hover:bg-zinc-50 hover:border-zinc-300 transition active:scale-[0.99] ${
                                isDelayed ? 'bg-red-50/50 border-red-200' : 'bg-amber-50/50 border-amber-200'
                              }`}>
                                <div className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider mb-1">
                                  {isDelayed ? (
                                    <>
                                      <AlertTriangle className="h-3 w-3 text-red-600" />
                                      <span className="text-red-700">Delayed</span>
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="h-3 w-3 text-amber-600" />
                                      <span className="text-amber-700">Due Soon</span>
                                    </>
                                  )}
                                </div>
                                <p className="text-xs font-bold text-zinc-800 line-clamp-1">{t.category}</p>
                                <p className="text-[11px] text-zinc-600 line-clamp-2 mt-0.5">{t.taskDescription}</p>
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
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all border ${
                  activeTab === 'leaderboard'
                    ? 'bg-yellow-50 text-yellow-850 border-yellow-200'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border-transparent'
                }`}
              >
                <Trophy className="h-4 w-4" />
                🏆 Leaderboard
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
            {(user.role === 'ADMIN' || user.role === 'PRINCIPAL' || user.role === 'SCHOOL_ADMIN') && <AdminPortal user={user} taskTrigger={taskTrigger} setTaskTrigger={setTaskTrigger} />}
            {user.role === 'PROGRAM_HEAD' && <ProgramHeadPortal user={user} taskTrigger={taskTrigger} setTaskTrigger={setTaskTrigger} />}
            {user.role === 'FACULTY_STAFF' && <FacultyPortal user={user} taskTrigger={taskTrigger} setTaskTrigger={setTaskTrigger} />}
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
        <p>© 2026 Puerto Princesa Task Monitoring System. All rights reserved.</p>
      </footer>
    </div>
  );
}
