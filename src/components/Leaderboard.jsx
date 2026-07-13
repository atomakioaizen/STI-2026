"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Trophy, Medal, Star, TrendingUp, Users, Crown,
  Calendar, ChevronDown, Award, Zap, Clock, BarChart3,
  RefreshCw, Info
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getLast6Months() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(ym);
  }
  return months;
}

function getRoleBadge(role, deptName) {
  if (role === 'SCHOOL_ADMIN') return { label: 'School Admin', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
  if (role === 'PRINCIPAL')    return { label: 'Principal',    color: 'bg-red-500/20 text-red-300 border-red-500/30' };
  if (role === 'PROGRAM_HEAD') return { label: 'Program Head', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
  if (deptName === 'Admin')    return { label: 'Admin Staff',  color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
  return                              { label: 'Faculty',      color: 'bg-green-500/20 text-green-300 border-green-500/30' };
}

function getPriorityColor(p) {
  if (p === 'High')   return 'text-red-400';
  if (p === 'Medium') return 'text-yellow-400';
  return 'text-zinc-400';
}

function getTimelinessBadge(t) {
  if (t === 'on_time')    return { label: '✓ On Time', color: 'text-green-400 bg-green-500/10 border-green-500/20' };
  if (t === 'delayed')    return { label: '⚠ Late',   color: 'text-red-400 bg-red-500/10 border-red-500/20' };
  return                         { label: '○ Open',   color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20' };
}

// ── Podium card for rank 1 / 2 / 3 ──────────────────────────────────────────
function PodiumCard({ entry, position }) {
  const configs = {
    1: {
      height: 'h-44',
      bg: 'from-yellow-500/20 via-amber-500/10 to-transparent',
      border: 'border-yellow-500/40',
      glow: 'shadow-[0_0_40px_rgba(234,179,8,0.2)]',
      icon: <Crown className="h-7 w-7 text-yellow-400" />,
      rankBg: 'bg-yellow-500',
      textColor: 'text-yellow-400',
      label: '🥇 1st Place',
      size: 'scale-105',
    },
    2: {
      height: 'h-36',
      bg: 'from-zinc-400/15 via-zinc-400/5 to-transparent',
      border: 'border-zinc-400/30',
      glow: 'shadow-[0_0_20px_rgba(161,161,170,0.1)]',
      icon: <Medal className="h-6 w-6 text-zinc-300" />,
      rankBg: 'bg-zinc-400',
      textColor: 'text-zinc-300',
      label: '🥈 2nd Place',
      size: '',
    },
    3: {
      height: 'h-32',
      bg: 'from-orange-700/15 via-orange-700/5 to-transparent',
      border: 'border-orange-600/30',
      glow: 'shadow-[0_0_20px_rgba(194,120,50,0.1)]',
      icon: <Medal className="h-6 w-6 text-orange-400" />,
      rankBg: 'bg-orange-600',
      textColor: 'text-orange-400',
      label: '🥉 3rd Place',
      size: '',
    },
  };

  const c = configs[position];
  const badge = getRoleBadge(entry.user.role, entry.user.department?.name);

  return (
    <div className={`relative flex flex-col items-center gap-3 rounded-2xl border bg-gradient-to-b ${c.bg} ${c.border} ${c.glow} p-5 transition-all duration-300 hover:-translate-y-1 ${c.size}`}>
      {/* Rank icon */}
      <div className="flex flex-col items-center gap-1">
        {c.icon}
        <span className={`text-xs font-bold ${c.textColor}`}>{c.label}</span>
      </div>

      {/* Avatar */}
      <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 ${c.border} ${c.bg} text-xl font-black ${c.textColor}`}>
        {entry.user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
      </div>

      {/* Name & dept */}
      <div className="text-center">
        <p className="font-bold text-white text-sm leading-tight">{entry.user.name}</p>
        <p className="text-xs text-zinc-400 mt-0.5">{entry.user.department?.name || '—'}</p>
        <span className={`mt-1 inline-block text-xxs font-semibold px-2 py-0.5 rounded border ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {/* Score */}
      <div className="text-center">
        <p className={`text-3xl font-black ${c.textColor}`}>{entry.totalScore}</p>
        <p className="text-xs text-zinc-500">pts</p>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 text-center text-xxs">
        <div>
          <p className="font-bold text-white">{entry.taskCount}</p>
          <p className="text-zinc-500">Tasks</p>
        </div>
        <div className="border-l border-white/10" />
        <div>
          <p className="font-bold text-green-400">{entry.onTimeCount}</p>
          <p className="text-zinc-500">On-Time</p>
        </div>
        <div className="border-l border-white/10" />
        <div>
          <p className="font-bold text-red-400">{entry.highCount}</p>
          <p className="text-zinc-500">High P.</p>
        </div>
      </div>
    </div>
  );
}

// ── Award Card ───────────────────────────────────────────────────────────────
function AwardCard({ title, subtitle, entry, icon, accentColor }) {
  if (!entry) return null;
  const badge = getRoleBadge(entry.user.role, entry.user.department?.name);
  return (
    <div className={`relative overflow-hidden rounded-xl border ${accentColor.border} bg-[#0a192f]/60 p-4 backdrop-blur-sm`}>
      <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${accentColor.grad}`} />
      <div className="relative flex items-center gap-4">
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${accentColor.iconBg}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold uppercase tracking-wider ${accentColor.text}`}>{title}</p>
          <p className="text-sm font-extrabold text-white truncate">{entry.user.name}</p>
          <p className="text-xs text-zinc-400 truncate">{subtitle}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-2xl font-black ${accentColor.text}`}>{entry.totalScore}</p>
          <p className="text-xxs text-zinc-500">pts</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function Leaderboard({ user }) {
  const months = getLast6Months();
  const [selectedMonth, setSelectedMonth] = useState(months[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFormula, setShowFormula] = useState(false);
  const [expandedRank, setExpandedRank] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?month=${selectedMonth}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (err) {
      console.error('Leaderboard fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  const facultyRankings = data?.categories?.academicFaculty || [];
  const staffRankings = data?.categories?.adminStaff || [];

  // Order [2nd, 1st, 3rd] for visual podiums
  const getPodiumDisplay = (list) => {
    const top3 = list.slice(0, 3);
    if (top3.length === 3) {
      return [top3[1], top3[0], top3[2]];
    }
    return top3;
  };

  const facultyPodium = getPodiumDisplay(facultyRankings);
  const staffPodium = getPodiumDisplay(staffRankings);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-400" />
            Monthly Performance Leaderboard
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Rankings based on completed tasks — scored by priority level and timeliness. Competed by Faculty and Staff.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Formula toggle */}
          <button
            onClick={() => setShowFormula(!showFormula)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 transition"
          >
            <Info className="h-3.5 w-3.5" />
            Formula
          </button>

          {/* Month picker */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none rounded-lg border border-yellow-500/30 bg-yellow-500/5 py-2 pl-9 pr-8 text-sm font-semibold text-yellow-300 focus:border-yellow-500/60 focus:outline-none cursor-pointer"
            >
              {months.map(m => (
                <option key={m} value={m} className="bg-[#0a192f] text-white">{monthLabel(m)}</option>
              ))}
            </select>
            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-yellow-400 pointer-events-none" />
            <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-yellow-400 pointer-events-none" />
          </div>

          <button onClick={fetchLeaderboard} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Scoring Formula ── */}
      {showFormula && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-5 space-y-3 animate-slideDown">
          <h3 className="font-bold text-blue-300 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Scoring Formula
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Priority Points</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-red-400 font-semibold">High</span><span className="text-white font-bold">30 pts</span></div>
                <div className="flex justify-between"><span className="text-yellow-400 font-semibold">Medium</span><span className="text-white font-bold">20 pts</span></div>
                <div className="flex justify-between"><span className="text-zinc-400 font-semibold">Low</span><span className="text-white font-bold">10 pts</span></div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Timeliness Multiplier</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-green-400 font-semibold">On Time</span><span className="text-white font-bold">×1.5 (+50%)</span></div>
                <div className="flex justify-between"><span className="text-zinc-400 font-semibold">No Deadline</span><span className="text-white font-bold">×1.2 (+20%)</span></div>
                <div className="flex justify-between"><span className="text-red-400 font-semibold">Delayed</span><span className="text-white font-bold">×1.0 (none)</span></div>
              </div>
            </div>
            <div className="flex flex-col justify-center rounded-lg border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-xs text-zinc-400 mb-1">Task Score</p>
              <p className="text-lg font-black text-white">Priority × Timeliness</p>
              <p className="text-xs text-zinc-500 mt-2">e.g. High + On Time = 30 × 1.5 = <span className="text-yellow-400 font-bold">45 pts</span></p>
              <p className="text-xs text-zinc-500">e.g. Medium + On Time = 20 × 1.5 = <span className="text-yellow-400 font-bold">30 pts</span></p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
          <p className="text-zinc-400 text-sm animate-pulse">Computing rankings...</p>
        </div>
      ) : !data || data.rankings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-center">
          <Trophy className="h-16 w-16 text-zinc-700" />
          <p className="text-zinc-400 font-semibold">No completed tasks found for {monthLabel(selectedMonth)}</p>
          <p className="text-zinc-600 text-sm">Rankings appear when tasks are marked as Completed within the month.</p>
        </div>
      ) : (
        <>
          {/* ── Awards Row ── */}
          {(data.awards.facultyOfMonth || data.awards.staffOfMonth) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AwardCard
                title="🎓 Faculty of the Month"
                subtitle={data.awards.facultyOfMonth?.user.department?.name || ''}
                entry={data.awards.facultyOfMonth}
                icon={<Star className="h-6 w-6 text-yellow-400" />}
                accentColor={{ text: 'text-yellow-400', border: 'border-yellow-500/20', grad: 'from-yellow-500 to-transparent', iconBg: 'bg-yellow-500/10' }}
              />
              <AwardCard
                title="🗂 Staff of the Month"
                subtitle={data.awards.staffOfMonth?.user.department?.name || ''}
                entry={data.awards.staffOfMonth}
                icon={<Award className="h-6 w-6 text-amber-400" />}
                accentColor={{ text: 'text-amber-400', border: 'border-amber-500/20', grad: 'from-amber-500 to-transparent', iconBg: 'bg-amber-500/10' }}
              />
            </div>
          )}

          {/* ── Two Podiums (Faculty and Staff) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Faculty Podium */}
            {facultyRankings.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-md font-bold text-green-400 uppercase tracking-wider flex items-center gap-2">
                  <Star className="h-5 w-5" /> Faculty Podium
                </h3>
                <div className="flex items-end justify-center gap-2">
                  {facultyPodium.map((entry, idx) => {
                    const position = entry.categoryRank;
                    return <PodiumCard key={entry.user.id} entry={{ ...entry, rank: position }} position={position} />;
                  })}
                </div>
              </div>
            )}

            {/* Staff Podium */}
            {staffRankings.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-md font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Award className="h-5 w-5" /> Staff Podium
                </h3>
                <div className="flex items-end justify-center gap-2">
                  {staffPodium.map((entry, idx) => {
                    const position = entry.categoryRank;
                    return <PodiumCard key={entry.user.id} entry={{ ...entry, rank: position }} position={position} />;
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Full Rankings Table ── */}
          <div className="rounded-xl border border-white/5 bg-[#0a192f]/40 backdrop-blur-sm overflow-hidden">
            <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                Full Rankings — {monthLabel(selectedMonth)}
              </h3>
              <span className="text-xs text-zinc-500">{data.rankings.length} participants</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white/5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="py-3 px-4 w-12">Rank</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-center">Tasks</th>
                    <th className="py-3 px-4 text-center">On Time</th>
                    <th className="py-3 px-4 text-center">High P.</th>
                    <th className="py-3 px-4 text-right">Score</th>
                    <th className="py-3 px-4 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.rankings.map((entry) => {
                    const badge = getRoleBadge(entry.user.role, entry.user.department?.name);
                    const isExpanded = expandedRank === entry.user.id;
                    const isMe = entry.user.id === user.id;
                    const rankColors = {
                      1: 'text-yellow-400',
                      2: 'text-zinc-300',
                      3: 'text-orange-400',
                    };
                    const rankColor = rankColors[entry.rank] || 'text-zinc-500';

                    return (
                      <>
                        <tr
                          key={entry.user.id}
                          onClick={() => setExpandedRank(isExpanded ? null : entry.user.id)}
                          className={`hover:bg-white/5 transition-colors cursor-pointer ${isMe ? 'bg-blue-500/5 hover:bg-blue-500/10' : ''}`}
                        >
                          <td className="py-4 px-4">
                            <span className={`text-lg font-black ${rankColor}`}>
                              {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`h-9 w-9 flex items-center justify-center rounded-full text-xs font-black border ${
                                entry.rank === 1 ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400' :
                                entry.rank === 2 ? 'border-zinc-400/30 bg-zinc-400/10 text-zinc-300' :
                                entry.rank === 3 ? 'border-orange-500/30 bg-orange-500/10 text-orange-400' :
                                'border-white/10 bg-white/5 text-zinc-300'
                              }`}>
                                {entry.user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-white text-sm">
                                  {entry.user.name}
                                  {isMe && <span className="ml-2 text-xxs text-blue-400 font-bold">(You)</span>}
                                </p>
                                <p className="text-xs text-zinc-500">{entry.user.position}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-xs text-zinc-400">{entry.user.department?.name || '—'}</td>
                          <td className="py-4 px-4">
                            <span className={`text-xxs font-semibold px-2 py-0.5 rounded border ${badge.color}`}>{badge.label}</span>
                          </td>
                          <td className="py-4 px-4 text-center font-bold text-white">{entry.taskCount}</td>
                          <td className="py-4 px-4 text-center">
                            <span className="text-green-400 font-bold">{entry.onTimeCount}</span>
                            <span className="text-zinc-600 text-xs">/{entry.taskCount}</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="text-red-400 font-bold">{entry.highCount}</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className={`text-xl font-black ${
                              entry.rank === 1 ? 'text-yellow-400' :
                              entry.rank === 2 ? 'text-zinc-300' :
                              entry.rank === 3 ? 'text-orange-400' :
                              'text-white'
                            }`}>{entry.totalScore}</span>
                            <span className="text-xs text-zinc-500 ml-1">pts</span>
                          </td>
                          <td className="py-4 px-4">
                            <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </td>
                        </tr>

                        {/* Expanded task breakdown */}
                        {isExpanded && (
                          <tr key={`${entry.user.id}-expanded`}>
                            <td colSpan={9} className="bg-black/20 px-6 py-4">
                              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                                Completed Tasks Breakdown — {entry.user.name}
                              </p>
                              <div className="space-y-2">
                                {entry.tasks.map((t, ti) => {
                                  const tb = getTimelinessBadge(t.timeliness);
                                  return (
                                    <div key={ti} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 px-4 py-2.5 text-xs">
                                      <span className={`font-bold w-16 flex-shrink-0 ${getPriorityColor(t.priority)}`}>{t.priority}</span>
                                      <span className="flex-1 text-zinc-300 truncate">{t.taskDescription}</span>
                                      <span className={`flex-shrink-0 rounded border px-2 py-0.5 text-xxs font-semibold ${tb.color}`}>{tb.label}</span>
                                      <span className="flex-shrink-0 font-black text-yellow-400 w-12 text-right">+{t.score} pts</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="mt-3 flex justify-end">
                                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-2 text-sm">
                                  <span className="text-zinc-400">Total Score: </span>
                                  <span className="font-black text-yellow-400 text-lg">{entry.totalScore} pts</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Category Breakdown Lists ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Academic Faculty List */}
            {facultyRankings.length > 0 && (
              <div className="rounded-xl border border-green-500/10 bg-[#0a192f]/40 p-5">
                <h4 className="font-bold text-green-400 flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4" /> Faculty Rankings List
                </h4>
                <div className="space-y-2">
                  {facultyRankings.map((e) => (
                    <div key={e.user.id} className="flex items-center gap-3 text-sm">
                      <span className="w-5 text-xs font-bold text-zinc-500">#{e.categoryRank}</span>
                      <span className="flex-1 font-medium text-white">{e.user.name}</span>
                      <span className="text-xs text-zinc-400">{e.user.department?.name}</span>
                      <span className="font-black text-green-400">{e.totalScore} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Staff List */}
            {staffRankings.length > 0 && (
              <div className="rounded-xl border border-amber-500/10 bg-[#0a192f]/40 p-5">
                <h4 className="font-bold text-amber-400 flex items-center gap-2 mb-3">
                  <Award className="h-4 w-4" /> Admin Staff Rankings List
                </h4>
                <div className="space-y-2">
                  {staffRankings.map((e) => (
                    <div key={e.user.id} className="flex items-center gap-3 text-sm">
                      <span className="w-5 text-xs font-bold text-zinc-500">#{e.categoryRank}</span>
                      <span className="flex-1 font-medium text-white">{e.user.name}</span>
                      <span className="text-xs text-zinc-400">Admin Staff</span>
                      <span className="font-black text-amber-400">{e.totalScore} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
