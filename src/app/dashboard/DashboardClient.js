"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, LayoutDashboard, Trophy, Bell, AlertTriangle, Clock, Calendar } from 'lucide-react';
import AdminPortal from '@/components/AdminPortal';
import ProgramHeadPortal from '@/components/ProgramHeadPortal';
import FacultyPortal from '@/components/FacultyPortal';
import Leaderboard from '@/components/Leaderboard';

export default function DashboardClient({ user }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'leaderboard'
  const [tasks, setTasks] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

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
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow ring-1 ring-blue-500">
                <span className="text-sm font-black text-white">STI</span>
              </div>
              <h1 className="text-base font-extrabold tracking-tight text-zinc-950 flex items-center gap-2">
                STI Puerto Princesa
                <span className="text-xs text-zinc-500 font-normal border-l border-zinc-300 pl-2">Task Monitor</span>
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
                              <div key={t.id} className={`p-2.5 rounded-lg border text-left ${
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
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 relative z-10">
        {activeTab === 'leaderboard' ? (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6">
            <Leaderboard user={user} />
          </div>
        ) : (
          <>
            {(user.role === 'ADMIN' || user.role === 'PRINCIPAL' || user.role === 'SCHOOL_ADMIN') && <AdminPortal user={user} />}
            {user.role === 'PROGRAM_HEAD' && <ProgramHeadPortal user={user} />}
            {user.role === 'FACULTY_STAFF' && <FacultyPortal user={user} />}
          </>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-zinc-500 border-t border-zinc-200 bg-white">
        <p>© 2026 STI College Puerto Princesa Task Monitoring System. All rights reserved.</p>
      </footer>
    </div>
  );
}
