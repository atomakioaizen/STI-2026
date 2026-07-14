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
  if (role === 'SCHOOL_ADMIN') return { label: 'School Admin', color: 'bg-purple-100 text-purple-800 border-purple-200' };
  if (role === 'PRINCIPAL')    return { label: 'Principal',    color: 'bg-red-100 text-red-800 border-red-200' };
  if (role === 'PROGRAM_HEAD') return { label: 'Program Head', color: 'bg-blue-100 text-blue-800 border-blue-200' };
  if (deptName === 'Admin')    return { label: 'Admin Staff',  color: 'bg-amber-100 text-amber-800 border-amber-200' };
  return                              { label: 'Faculty',      color: 'bg-green-100 text-green-800 border-green-200' };
}

function getPriorityColor(p) {
  if (p === 'High')   return 'text-red-600 font-bold';
  if (p === 'Medium') return 'text-amber-600 font-bold';
  return 'text-zinc-500 font-medium';
}

function getTimelinessBadge(t) {
  if (t === 'on_time')    return { label: '✓ On Time', color: 'text-green-700 bg-green-50 border-green-200' };
  if (t === 'delayed')    return { label: '⚠ Late',   color: 'text-red-700 bg-red-50 border-red-200' };
  return                         { label: '○ Open',   color: 'text-zinc-600 bg-zinc-50 border-zinc-200' };
}

// ── Podium card for rank 1 / 2 / 3 ──────────────────────────────────────────
function PodiumCard({ entry, position }) {
  const configs = {
    1: {
      height: 'h-44',
      bg: 'from-yellow-100/50 via-yellow-50 to-white',
      border: 'border-yellow-300',
      glow: 'shadow-[0_4px_20px_rgba(234,179,8,0.15)]',
      icon: <Crown className="h-7 w-7 text-yellow-600 animate-bounce" />,
      rankBg: 'bg-yellow-500',
      textColor: 'text-yellow-800',
      label: '🥇 1st Place',
      size: 'scale-105',
    },
    2: {
      height: 'h-36',
      bg: 'from-zinc-100/50 via-zinc-50 to-white',
      border: 'border-zinc-300',
      glow: 'shadow-[0_4px_12px_rgba(113,113,122,0.1)]',
      icon: <Medal className="h-6 w-6 text-zinc-500" />,
      rankBg: 'bg-zinc-500',
      textColor: 'text-zinc-800',
      label: '🥈 2nd Place',
      size: '',
    },
    3: {
      height: 'h-32',
      bg: 'from-orange-100/50 via-orange-50 to-white',
      border: 'border-orange-300',
      glow: 'shadow-[0_4px_12px_rgba(249,115,22,0.1)]',
      icon: <Medal className="h-6 w-6 text-orange-600" />,
      rankBg: 'bg-orange-500',
      textColor: 'text-orange-850',
      label: '🥉 3rd Place',
      size: '',
    },
  };

  const c = configs[position];
  const badge = getRoleBadge(entry.user.role, entry.user.department?.name);

  return (
    <div className={`relative flex flex-col items-center gap-3 rounded-2xl border bg-gradient-to-b ${c.bg} ${c.border} ${c.glow} p-5 transition-all duration-300 hover:-translate-y-1 ${c.size} w-full md:w-36`}>
      {/* Rank icon */}
      <div className="flex flex-col items-center gap-1">
        {c.icon}
        <span className={`text-xs font-bold ${c.textColor}`}>{c.label}</span>
      </div>

      {/* Avatar */}
      <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 ${c.border} bg-white text-xl font-black ${c.textColor}`}>
        {entry.user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
      </div>

      {/* Details */}
      <div className="text-center w-full">
        <p className="font-extrabold text-sm text-zinc-900 truncate" title={entry.user.name}>{entry.user.name}</p>
        <p className="text-[10px] text-zinc-500 font-bold truncate mt-0.5">{entry.user.position}</p>
      </div>

      {/* Badge */}
      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${badge.color}`}>
        {badge.label}
      </span>

      {/* Score */}
      <div className="text-center mt-1">
        <p className={`text-xl font-black ${c.textColor}`}>
          {entry.totalScore}
          <span className="text-xs text-zinc-500 ml-0.5">pts</span>
        </p>
      </div>
    </div>
  );
}

// ── Award Card for Best Faculty/Staff of Month ────────────────────────────
function AwardCard({ title, subtitle, entry, icon, accentColor }) {
  if (!entry) return null;

  return (
    <div className={`rounded-xl border ${accentColor.border} bg-white p-5 shadow-xs transition hover:shadow-md flex flex-col gap-4 relative overflow-hidden`}>
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${accentColor.iconBg}`}>
            {icon}
          </div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${accentColor.text}`}>{title}</p>
            <p className="text-sm font-extrabold text-zinc-900 truncate">{entry.user.name}</p>
            <p className="text-xs text-zinc-500 truncate">{subtitle}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-2xl font-black ${accentColor.text}`}>{entry.totalScore}</p>
          <p className="text-xxs text-zinc-400">pts</p>
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
  const [sortBy, setSortBy] = useState('score'); // 'score' | 'tasks' | 'ontime'

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

  // Client side sorting logic
  const sortRankings = (list) => {
    if (sortBy === 'tasks') {
      return [...list].sort((a, b) => b.taskCount - a.taskCount);
    } else if (sortBy === 'ontime') {
      return [...list].sort((a, b) => b.onTimeCount - a.onTimeCount);
    } else {
      return [...list].sort((a, b) => b.totalScore - a.totalScore);
    }
  };

  const rawFaculty = data?.categories?.academicFaculty || [];
  const rawStaff = data?.categories?.adminStaff || [];
  const rawAll = data?.rankings || [];

  const facultyRankingsSorted = sortRankings(rawFaculty).map((e, idx) => ({ ...e, categoryRank: idx + 1 }));
  const staffRankingsSorted = sortRankings(rawStaff).map((e, idx) => ({ ...e, categoryRank: idx + 1 }));
  const allRankingsSorted = sortRankings(rawAll).map((e, idx) => ({ ...e, rank: idx + 1 }));

  // Order [2nd, 1st, 3rd] for visual podiums
  const getPodiumDisplay = (list) => {
    const top3 = list.slice(0, 3);
    if (top3.length === 3) {
      return [top3[1], top3[0], top3[2]];
    }
    return top3;
  };

  const facultyPodium = getPodiumDisplay(facultyRankingsSorted);
  const staffPodium = getPodiumDisplay(staffRankingsSorted);

  return (
    <div className="space-y-8 animate-fadeIn text-zinc-900">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 flex items-center gap-3">
            <Trophy className="h-7 w-7 text-yellow-500" />
            Monthly Performance Leaderboard
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            Rankings based on completed tasks. Filtered by score, completed tasks, or timeliness.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Formula toggle */}
          <button
            onClick={() => setShowFormula(!showFormula)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition"
          >
            <Info className="h-3.5 w-3.5" />
            Formula
          </button>

          {/* Sort selector */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-zinc-700 focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="score">Sort by: Score</option>
              <option value="tasks">Sort by: Tasks Completed</option>
              <option value="ontime">Sort by: On-Time Tasks</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-3 h-3 w-3 text-zinc-400 pointer-events-none" />
          </div>

          {/* Month picker */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none rounded-lg border border-zinc-200 bg-white py-2 pl-8 pr-8 text-xs font-semibold text-zinc-700 focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              {months.map(m => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400 pointer-events-none" />
            <ChevronDown className="absolute right-2 top-3 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          </div>

          <button onClick={fetchLeaderboard} className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-950 transition" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Scoring Formula ── */}
      {showFormula && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 space-y-3 animate-slideDown">
          <h3 className="font-bold text-blue-750 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" /> Scoring Formula
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Priority Points</p>
              <div className="space-y-1 text-zinc-700">
                <div className="flex justify-between"><span className="text-red-600 font-bold">High</span><span className="font-bold text-zinc-900">30 pts</span></div>
                <div className="flex justify-between"><span className="text-amber-600 font-bold">Medium</span><span className="font-bold text-zinc-900">20 pts</span></div>
                <div className="flex justify-between"><span className="text-zinc-500 font-bold">Low</span><span className="font-bold text-zinc-900">10 pts</span></div>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Timeliness Multiplier</p>
              <div className="space-y-1 text-zinc-700">
                <div className="flex justify-between"><span className="text-green-700 font-bold">On Time</span><span className="font-bold text-zinc-900">×1.5 (+50%)</span></div>
                <div className="flex justify-between"><span className="text-zinc-600 font-bold">No Deadline</span><span className="font-bold text-zinc-900">×1.2 (+20%)</span></div>
                <div className="flex justify-between"><span className="text-red-600 font-bold">Delayed</span><span className="font-bold text-zinc-900">×1.0 (none)</span></div>
              </div>
            </div>
            <div className="flex flex-col justify-center rounded-lg border border-zinc-200 bg-white p-4 text-center">
              <p className="text-xs text-zinc-500 mb-1">Task Score</p>
              <p className="text-sm font-extrabold text-zinc-900">Priority × Timeliness</p>
              <p className="text-xs text-zinc-500 mt-2">e.g. High + On Time = 30 × 1.5 = <span className="text-amber-600 font-bold">45 pts</span></p>
              <p className="text-xs text-zinc-500">e.g. Medium + On Time = 20 × 1.5 = <span className="text-amber-600 font-bold">30 pts</span></p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-zinc-500 text-sm animate-pulse">Computing rankings...</p>
        </div>
      ) : !data || allRankingsSorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-center">
          <Trophy className="h-16 w-16 text-zinc-300" />
          <p className="text-zinc-500 font-bold">No completed tasks found for {monthLabel(selectedMonth)}</p>
          <p className="text-zinc-400 text-sm">Rankings appear when tasks are marked as Completed within the month.</p>
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
                icon={<Star className="h-6 w-6 text-yellow-600" />}
                accentColor={{ text: 'text-yellow-600', border: 'border-yellow-200', grad: 'from-yellow-50 to-transparent', iconBg: 'bg-yellow-50' }}
              />
              <AwardCard
                title="🗂 Staff of the Month"
                subtitle={data.awards.staffOfMonth?.user.department?.name || ''}
                entry={data.awards.staffOfMonth}
                icon={<Award className="h-6 w-6 text-amber-600" />}
                accentColor={{ text: 'text-amber-600', border: 'border-amber-200', grad: 'from-amber-50 to-transparent', iconBg: 'bg-amber-50' }}
              />
            </div>
          )}

          {/* ── Two Podiums (Faculty and Staff) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 justify-items-center">
            {/* Faculty Podium */}
            {facultyPodium.length > 0 && (
              <div className="space-y-4 w-full flex flex-col items-center">
                <h3 className="text-sm font-bold text-green-700 uppercase tracking-wider flex items-center gap-2">
                  <Star className="h-5 w-5 text-green-600" /> Faculty Podium
                </h3>
                <div className="flex flex-wrap items-end justify-center gap-3 w-full">
                  {facultyPodium.map((entry) => {
                    const position = entry.categoryRank;
                    return <PodiumCard key={entry.user.id} entry={{ ...entry, rank: position }} position={position} />;
                  })}
                </div>
              </div>
            )}

            {/* Staff Podium */}
            {staffPodium.length > 0 && (
              <div className="space-y-4 w-full flex flex-col items-center">
                <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-600" /> Staff Podium
                </h3>
                <div className="flex flex-wrap items-end justify-center gap-3 w-full">
                  {staffPodium.map((entry) => {
                    const position = entry.categoryRank;
                    return <PodiumCard key={entry.user.id} entry={{ ...entry, rank: position }} position={position} />;
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Full Rankings Table ── */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
            <div className="border-b border-zinc-200 px-6 py-4 flex items-center justify-between bg-zinc-50">
              <h3 className="font-bold text-zinc-800 flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-blue-600" />
                Full Rankings — {monthLabel(selectedMonth)}
              </h3>
              <span className="text-xs text-zinc-500 font-bold">{allRankingsSorted.length} participants</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-zinc-100/80 text-xxs font-bold uppercase tracking-wider text-zinc-650 border-b border-zinc-200">
                  <tr>
                    <th className="py-3 px-5 w-16">Rank</th>
                    <th className="py-3 px-5">Name</th>
                    <th className="py-3 px-5">Department</th>
                    <th className="py-3 px-5">Role</th>
                    <th className="py-3 px-5 text-center">Tasks</th>
                    <th className="py-3 px-5 text-center">On Time</th>
                    <th className="py-3 px-5 text-center">High P.</th>
                    <th className="py-3 px-5 text-right">Score</th>
                    <th className="py-3 px-5 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {allRankingsSorted.map((entry, index) => {
                    const badge = getRoleBadge(entry.user.role, entry.user.department?.name);
                    const isExpanded = expandedRank === entry.user.id;
                    const isMe = entry.user.id === user.id;
                    
                    const zebraClass = index % 2 === 0 ? 'bg-white' : 'bg-zinc-50/75';
                    
                    const rankColors = {
                      1: 'text-yellow-600',
                      2: 'text-zinc-500',
                      3: 'text-orange-600',
                    };
                    const rankColor = rankColors[entry.rank] || 'text-zinc-500';

                    return (
                      <React.Fragment key={entry.user.id}>
                        <tr
                          onClick={() => setExpandedRank(isExpanded ? null : entry.user.id)}
                          className={`hover:bg-zinc-100/50 transition-colors cursor-pointer ${zebraClass} ${isMe ? 'bg-blue-50/60 hover:bg-blue-100/40' : ''}`}
                        >
                          <td className="py-4 px-5">
                            <span className={`text-base font-extrabold ${rankColor}`}>
                              {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className={`h-9 w-9 flex items-center justify-center rounded-full text-xs font-black border ${
                                entry.rank === 1 ? 'border-yellow-300 bg-yellow-50 text-yellow-800' :
                                entry.rank === 2 ? 'border-zinc-300 bg-zinc-100 text-zinc-800' :
                                entry.rank === 3 ? 'border-orange-300 bg-orange-50 text-orange-850' :
                                'border-zinc-200 bg-white text-zinc-700'
                              }`}>
                                {entry.user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-zinc-900 text-sm">
                                  {entry.user.name}
                                  {isMe && <span className="ml-2 text-[10px] text-blue-600 font-bold">(You)</span>}
                                </p>
                                <p className="text-xs text-zinc-500">{entry.user.position}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-5 text-xs text-zinc-600 font-semibold">{entry.user.department?.name || '—'}</td>
                          <td className="py-4 px-5">
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${badge.color}`}>{badge.label}</span>
                          </td>
                          <td className="py-4 px-5 text-center font-bold text-zinc-800">{entry.taskCount}</td>
                          <td className="py-4 px-5 text-center">
                            <span className="text-green-700 font-bold">{entry.onTimeCount}</span>
                            <span className="text-zinc-400 text-xs font-normal">/{entry.taskCount}</span>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className="text-red-600 font-bold">{entry.highCount}</span>
                          </td>
                          <td className="py-4 px-5 text-right">
                            <span className={`text-lg font-black ${
                              entry.rank === 1 ? 'text-yellow-600' :
                              entry.rank === 2 ? 'text-zinc-650' :
                              entry.rank === 3 ? 'text-orange-650' :
                              'text-zinc-800'
                            }`}>{entry.totalScore}</span>
                            <span className="text-xs text-zinc-400 font-semibold ml-1">pts</span>
                          </td>
                          <td className="py-4 px-5">
                            <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </td>
                        </tr>

                        {/* Expanded task breakdown */}
                        {isExpanded && (
                          <tr key={`${entry.user.id}-expanded`}>
                            <td colSpan={9} className="bg-zinc-50/70 px-6 py-4 border-t border-b border-zinc-200 shadow-inner">
                              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                                Completed Tasks Breakdown — {entry.user.name}
                              </p>
                              <div className="space-y-2">
                                {entry.tasks.map((t, ti) => {
                                  const tb = getTimelinessBadge(t.timeliness);
                                  return (
                                    <div key={ti} className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-xs text-zinc-700 shadow-2xs">
                                      <span className={`font-bold w-16 flex-shrink-0 ${getPriorityColor(t.priority)}`}>{t.priority}</span>
                                      <span className="flex-1 text-zinc-800 font-medium truncate">{t.taskDescription}</span>
                                      <span className={`flex-shrink-0 rounded border px-2 py-0.5 text-[10px] font-black ${tb.color}`}>{tb.label}</span>
                                      <span className="flex-shrink-0 font-black text-amber-600 w-12 text-right">+{t.score} pts</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="mt-3 flex justify-end">
                                <div className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm shadow-2xs">
                                  <span className="text-zinc-500 font-semibold">Total Score: </span>
                                  <span className="font-black text-blue-600 text-lg">{entry.totalScore} pts</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Category Breakdown Lists ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Academic Faculty List */}
            {facultyRankingsSorted.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
                <h4 className="font-extrabold text-green-700 flex items-center gap-2 mb-3 text-sm">
                  <Star className="h-4 w-4 text-green-600" /> Faculty Rankings List
                </h4>
                <div className="space-y-2.5 divide-y divide-zinc-100">
                  {facultyRankingsSorted.map((e, index) => (
                    <div key={e.user.id} className={`flex items-center gap-3 text-sm pt-2.5 first:pt-0`}>
                      <span className="w-6 text-xs font-black text-zinc-400">#{e.categoryRank}</span>
                      <span className="flex-1 font-bold text-zinc-800">{e.user.name}</span>
                      <span className="text-xs text-zinc-500 font-semibold">{e.user.department?.name}</span>
                      <span className="font-black text-green-600">{e.totalScore} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Staff List */}
            {staffRankingsSorted.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
                <h4 className="font-extrabold text-amber-700 flex items-center gap-2 mb-3 text-sm">
                  <Award className="h-4 w-4 text-amber-600" /> Admin Staff Rankings List
                </h4>
                <div className="space-y-2.5 divide-y divide-zinc-100">
                  {staffRankingsSorted.map((e) => (
                    <div key={e.user.id} className="flex items-center gap-3 text-sm pt-2.5 first:pt-0">
                      <span className="w-6 text-xs font-black text-zinc-400">#{e.categoryRank}</span>
                      <span className="flex-1 font-bold text-zinc-800">{e.user.name}</span>
                      <span className="text-xs text-zinc-500 font-semibold">Admin Staff</span>
                      <span className="font-black text-amber-600">{e.totalScore} pts</span>
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
