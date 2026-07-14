"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy, Medal, Star, TrendingUp, Users, Crown,
  Calendar, ChevronDown, Award, Zap, Clock, BarChart3,
  RefreshCw, Info, Flame, Target
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  if (role === 'SCHOOL_ADMIN') return { label: 'School Admin', color: 'bg-purple-100 text-purple-700 border-purple-200' };
  if (role === 'PRINCIPAL')    return { label: 'Principal',    color: 'bg-red-100 text-red-700 border-red-200' };
  if (role === 'PROGRAM_HEAD') return { label: 'Program Head', color: 'bg-blue-100 text-blue-700 border-blue-200' };
  if (deptName === 'Admin')    return { label: 'Admin Staff',  color: 'bg-amber-100 text-amber-700 border-amber-200' };
  return                              { label: 'Faculty',      color: 'bg-green-100 text-green-700 border-green-200' };
}

function getPriorityColor(p) {
  if (p === 'High')   return 'text-red-600 font-bold';
  if (p === 'Medium') return 'text-amber-600 font-bold';
  return 'text-zinc-500 font-medium';
}

function getTimelinessBadge(t) {
  if (t === 'on_time')  return { label: '✓ On Time', color: 'text-green-700 bg-green-50 border-green-200' };
  if (t === 'delayed')  return { label: '⚠ Late',   color: 'text-red-700 bg-red-50 border-red-200' };
  return                       { label: '○ Open',   color: 'text-zinc-600 bg-zinc-50 border-zinc-200' };
}

// ── Podium Card ───────────────────────────────────────────────────────────────
function PodiumCard({ entry, position }) {
  const configs = {
    1: {
      bg: 'bg-gradient-to-b from-yellow-50 to-white',
      border: 'border-yellow-300',
      shadow: 'shadow-[0_4px_24px_rgba(234,179,8,0.18)]',
      icon: <Crown className="h-6 w-6 text-yellow-500 animate-bounce" />,
      avatarRing: 'border-yellow-400 bg-yellow-50 text-yellow-700',
      nameColor: 'text-yellow-700',
      scoreColor: 'text-yellow-600',
      label: '🥇 1st',
      scale: 'scale-105',
    },
    2: {
      bg: 'bg-gradient-to-b from-zinc-100 to-white',
      border: 'border-zinc-300',
      shadow: 'shadow-[0_4px_14px_rgba(113,113,122,0.12)]',
      icon: <Medal className="h-5 w-5 text-zinc-400" />,
      avatarRing: 'border-zinc-300 bg-zinc-100 text-zinc-700',
      nameColor: 'text-zinc-800',
      scoreColor: 'text-zinc-600',
      label: '🥈 2nd',
      scale: '',
    },
    3: {
      bg: 'bg-gradient-to-b from-orange-50 to-white',
      border: 'border-orange-300',
      shadow: 'shadow-[0_4px_14px_rgba(249,115,22,0.12)]',
      icon: <Medal className="h-5 w-5 text-orange-500" />,
      avatarRing: 'border-orange-300 bg-orange-50 text-orange-700',
      nameColor: 'text-orange-800',
      scoreColor: 'text-orange-600',
      label: '🥉 3rd',
      scale: '',
    },
  };
  const c = configs[position];
  const badge = getRoleBadge(entry.user.role, entry.user.department?.name);
  const initials = entry.user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();

  return (
    <div className={`relative flex flex-col items-center gap-2 rounded-2xl border ${c.bg} ${c.border} ${c.shadow} p-5 transition-all duration-300 hover:-translate-y-1 ${c.scale} w-full md:w-40`}>
      <div className="flex flex-col items-center gap-1">
        {c.icon}
        <span className={`text-[10px] font-black uppercase tracking-wider ${c.nameColor}`}>{c.label}</span>
      </div>
      <div className={`h-14 w-14 flex items-center justify-center rounded-full border-2 text-xl font-black ${c.avatarRing}`}>
        {initials}
      </div>
      <div className="text-center w-full">
        <p className={`font-extrabold text-sm truncate ${c.nameColor}`} title={entry.user.name}>{entry.user.name}</p>
        <p className="text-[10px] text-zinc-400 truncate mt-0.5">{entry.user.position || '—'}</p>
      </div>
      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${badge.color}`}>{badge.label}</span>
      <p className={`text-xl font-black ${c.scoreColor}`}>{entry.totalScore}<span className="text-xs text-zinc-400 ml-0.5">pts</span></p>
    </div>
  );
}

// ── Award Card ────────────────────────────────────────────────────────────────
function AwardCard({ title, subtitle, entry, icon, accentColor }) {
  if (!entry) return null;
  return (
    <div className={`rounded-xl border ${accentColor.border} bg-white p-5 shadow-xs hover:shadow-md transition flex items-center gap-4`}>
      <div className={`rounded-xl p-3 flex-shrink-0 ${accentColor.iconBg}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] font-black uppercase tracking-wider ${accentColor.text}`}>{title}</p>
        <p className="text-sm font-extrabold text-zinc-900 truncate">{entry.user.name}</p>
        <p className="text-xs text-zinc-400 truncate">{subtitle}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-2xl font-black ${accentColor.text}`}>{entry.totalScore}</p>
        <p className="text-[10px] text-zinc-400">pts</p>
      </div>
    </div>
  );
}

// ── Timeframe Tabs ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'weekly',  label: 'This Week',   icon: <Flame className="h-3.5 w-3.5" /> },
  { id: 'monthly', label: 'Monthly',     icon: <Calendar className="h-3.5 w-3.5" /> },
  { id: 'yearly',  label: 'This Year',   icon: <TrendingUp className="h-3.5 w-3.5" /> },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function Leaderboard({ user }) {
  const months = getLast6Months();
  const [timeframe, setTimeframe]     = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(months[0]);
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [showFormula, setShowFormula] = useState(false);
  const [expandedRank, setExpandedRank] = useState(null);
  const [sortBy, setSortBy]           = useState('score');

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ timeframe });
      if (timeframe === 'monthly') params.set('month', selectedMonth);
      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('Leaderboard fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [timeframe, selectedMonth]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  const sortRankings = (list) => {
    if (sortBy === 'tasks')  return [...list].sort((a, b) => b.taskCount - a.taskCount);
    if (sortBy === 'ontime') return [...list].sort((a, b) => b.onTimeCount - a.onTimeCount);
    return [...list].sort((a, b) => b.totalScore - a.totalScore);
  };

  const rawAll      = data?.rankings || [];
  const rawFaculty  = data?.categories?.academicFaculty || [];
  const rawStaff    = data?.categories?.adminStaff || [];

  const allRanked     = sortRankings(rawAll).map((e, i) => ({ ...e, rank: i + 1 }));
  const facultySorted = sortRankings(rawFaculty).map((e, i) => ({ ...e, categoryRank: i + 1 }));
  const staffSorted   = sortRankings(rawStaff).map((e, i) => ({ ...e, categoryRank: i + 1 }));

  const getPodiumDisplay = (list) => {
    const top3 = list.slice(0, 3);
    return top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;
  };

  const facultyPodium = getPodiumDisplay(facultySorted);
  const staffPodium   = getPodiumDisplay(staffSorted);

  const periodLabel = timeframe === 'weekly'
    ? 'This Week'
    : timeframe === 'yearly'
    ? `Year ${new Date().getFullYear()}`
    : monthLabel(selectedMonth);

  return (
    <div className="space-y-6 animate-fadeIn text-zinc-900">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 flex items-center gap-3">
            <Trophy className="h-7 w-7 text-yellow-500" />
            Performance Leaderboard
          </h2>
          <p className="text-zinc-400 text-sm mt-1">Rankings by completed tasks · {periodLabel}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Formula toggle */}
          <button
            onClick={() => setShowFormula(!showFormula)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition"
          >
            <Info className="h-3.5 w-3.5" /> Scoring
          </button>

          {/* Sort selector */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-7 text-xs font-semibold text-zinc-700 focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="score">By Score</option>
              <option value="tasks">By Tasks</option>
              <option value="ontime">By On-Time</option>
            </select>
            <ChevronDown className="absolute right-2 top-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          </div>

          <button onClick={fetchLeaderboard} className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Timeframe Tabs ── */}
      <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTimeframe(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
              timeframe === tab.id
                ? 'bg-white shadow text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Month picker — only shown for monthly tab */}
      {timeframe === 'monthly' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-semibold">Month:</span>
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none rounded-lg border border-zinc-200 bg-white py-1.5 pl-8 pr-7 text-xs font-semibold text-zinc-700 focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              {months.map(m => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
            <Calendar className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <ChevronDown className="absolute right-2 top-2.5 h-3 w-3 text-zinc-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* ── Scoring Formula ── */}
      {showFormula && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 space-y-3 animate-slideDown">
          <h3 className="font-bold text-blue-800 flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4" /> Scoring Formula
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Priority Points</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-red-600 font-bold">High</span><span className="font-bold">30 pts</span></div>
                <div className="flex justify-between"><span className="text-amber-600 font-bold">Medium</span><span className="font-bold">20 pts</span></div>
                <div className="flex justify-between"><span className="text-zinc-500 font-bold">Low</span><span className="font-bold">10 pts</span></div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Timeliness Multiplier</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-green-700 font-bold">On Time</span><span className="font-bold">×1.5</span></div>
                <div className="flex justify-between"><span className="text-zinc-500 font-bold">No Deadline</span><span className="font-bold">×1.2</span></div>
                <div className="flex justify-between"><span className="text-red-600 font-bold">Delayed</span><span className="font-bold">×1.0</span></div>
              </div>
            </div>
            <div className="flex flex-col justify-center rounded-lg border border-blue-200 bg-white p-4 text-center">
              <p className="text-xs text-zinc-500 mb-1">Example</p>
              <p className="font-extrabold text-zinc-900 text-sm">High + On Time</p>
              <p className="text-amber-600 font-black text-lg">= 45 pts</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-zinc-400 text-sm">Computing rankings…</p>
        </div>
      ) : !data || allRanked.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-center">
          <Trophy className="h-16 w-16 text-zinc-200" />
          <p className="text-zinc-500 font-bold">No completed tasks found for {periodLabel}</p>
          <p className="text-zinc-400 text-sm">Rankings appear when tasks are marked as Completed.</p>
        </div>
      ) : (
        <>
          {/* Awards Row */}
          {(data.awards.facultyOfMonth || data.awards.staffOfMonth) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AwardCard
                title="🎓 Faculty of the Period"
                subtitle={data.awards.facultyOfMonth?.user.department?.name || ''}
                entry={data.awards.facultyOfMonth}
                icon={<Star className="h-6 w-6 text-yellow-500" />}
                accentColor={{ text: 'text-yellow-600', border: 'border-yellow-200', iconBg: 'bg-yellow-50' }}
              />
              <AwardCard
                title="🗂 Staff of the Period"
                subtitle={data.awards.staffOfMonth?.user.department?.name || ''}
                entry={data.awards.staffOfMonth}
                icon={<Award className="h-6 w-6 text-amber-500" />}
                accentColor={{ text: 'text-amber-600', border: 'border-amber-200', iconBg: 'bg-amber-50' }}
              />
            </div>
          )}

          {/* Podiums */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {facultyPodium.length > 0 && (
              <div className="flex flex-col items-center gap-3">
                <h3 className="text-xs font-black text-green-700 uppercase tracking-widest flex items-center gap-2">
                  <Star className="h-4 w-4" /> Faculty Podium
                </h3>
                <div className="flex flex-wrap items-end justify-center gap-3 w-full">
                  {facultyPodium.map((e) => (
                    <PodiumCard key={e.user.id} entry={e} position={e.categoryRank} />
                  ))}
                </div>
              </div>
            )}
            {staffPodium.length > 0 && (
              <div className="flex flex-col items-center gap-3">
                <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                  <Award className="h-4 w-4" /> Staff Podium
                </h3>
                <div className="flex flex-wrap items-end justify-center gap-3 w-full">
                  {staffPodium.map((e) => (
                    <PodiumCard key={e.user.id} entry={e} position={e.categoryRank} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Full Rankings Table */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
            <div className="border-b border-zinc-100 px-6 py-4 flex items-center justify-between bg-zinc-50">
              <h3 className="font-bold text-zinc-800 flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-blue-500" />
                Full Rankings — {periodLabel}
              </h3>
              <span className="text-xs text-zinc-400 font-bold">{allRanked.length} participants</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-200">
                  <tr>
                    <th className="py-3 px-5 w-16">Rank</th>
                    <th className="py-3 px-5">Name</th>
                    <th className="py-3 px-5">Department</th>
                    <th className="py-3 px-5">Role</th>
                    <th className="py-3 px-5 text-center">Tasks</th>
                    <th className="py-3 px-5 text-center">On-Time</th>
                    <th className="py-3 px-5 text-center">High P.</th>
                    <th className="py-3 px-5 text-right">Score</th>
                    <th className="py-3 px-5 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {allRanked.map((entry, index) => {
                    const badge = getRoleBadge(entry.user.role, entry.user.department?.name);
                    const isExpanded = expandedRank === entry.user.id;
                    const isMe = entry.user.id === user.id;
                    const zebra = index % 2 === 0 ? 'bg-white' : 'bg-zinc-50/60';
                    const rankEmoji = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;
                    const rankColor = entry.rank === 1 ? 'text-yellow-600' : entry.rank === 2 ? 'text-zinc-400' : entry.rank === 3 ? 'text-orange-500' : 'text-zinc-400';
                    const initials = entry.user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();

                    return (
                      <React.Fragment key={entry.user.id}>
                        <tr
                          onClick={() => setExpandedRank(isExpanded ? null : entry.user.id)}
                          className={`hover:bg-zinc-100/60 transition cursor-pointer ${zebra} ${isMe ? 'bg-blue-50/50 hover:bg-blue-100/40' : ''}`}
                        >
                          <td className="py-4 px-5">
                            <span className={`text-base font-extrabold ${rankColor}`}>{rankEmoji}</span>
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className={`h-9 w-9 flex items-center justify-center rounded-full text-xs font-black border flex-shrink-0 ${
                                entry.rank === 1 ? 'border-yellow-300 bg-yellow-50 text-yellow-700' :
                                entry.rank === 2 ? 'border-zinc-300 bg-zinc-100 text-zinc-700' :
                                entry.rank === 3 ? 'border-orange-300 bg-orange-50 text-orange-700' :
                                'border-zinc-200 bg-white text-zinc-600'
                              }`}>{initials}</div>
                              <div>
                                <p className="font-bold text-zinc-900 text-sm">
                                  {entry.user.name}
                                  {isMe && <span className="ml-2 text-[10px] text-blue-500 font-bold">(You)</span>}
                                </p>
                                <p className="text-xs text-zinc-400">{entry.user.position}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-5 text-xs text-zinc-500 font-semibold">{entry.user.department?.name || '—'}</td>
                          <td className="py-4 px-5">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${badge.color}`}>{badge.label}</span>
                          </td>
                          <td className="py-4 px-5 text-center font-bold text-zinc-800">{entry.taskCount}</td>
                          <td className="py-4 px-5 text-center">
                            <span className="text-green-600 font-bold">{entry.onTimeCount}</span>
                            <span className="text-zinc-300 text-xs">/{entry.taskCount}</span>
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span className="text-red-500 font-bold">{entry.highCount}</span>
                          </td>
                          <td className="py-4 px-5 text-right">
                            <span className={`text-lg font-black ${rankColor}`}>{entry.totalScore}</span>
                            <span className="text-xs text-zinc-400 font-semibold ml-1">pts</span>
                          </td>
                          <td className="py-4 px-5">
                            <ChevronDown className={`h-4 w-4 text-zinc-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr key={`${entry.user.id}-exp`}>
                            <td colSpan={9} className="bg-zinc-50/80 px-6 py-4 border-t border-b border-zinc-100">
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-3">
                                Task Breakdown — {entry.user.name}
                              </p>
                              <div className="space-y-2">
                                {entry.tasks.map((t, ti) => {
                                  const tb = getTimelinessBadge(t.timeliness);
                                  return (
                                    <div key={ti} className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-xs shadow-2xs">
                                      <span className={`font-bold w-16 flex-shrink-0 ${getPriorityColor(t.priority)}`}>{t.priority}</span>
                                      <span className="flex-1 text-zinc-700 font-medium truncate">{t.taskDescription}</span>
                                      <span className={`flex-shrink-0 rounded border px-2 py-0.5 text-[10px] font-black ${tb.color}`}>{tb.label}</span>
                                      <span className="flex-shrink-0 font-black text-amber-600 w-12 text-right">+{t.score} pts</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="mt-3 flex justify-end">
                                <div className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm shadow-2xs">
                                  <span className="text-zinc-400 font-semibold">Total: </span>
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

          {/* Category Lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {facultySorted.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
                <h4 className="font-extrabold text-green-700 flex items-center gap-2 mb-4 text-sm">
                  <Star className="h-4 w-4" /> Faculty Rankings
                </h4>
                <div className="space-y-2.5 divide-y divide-zinc-100">
                  {facultySorted.map((e) => (
                    <div key={e.user.id} className="flex items-center gap-3 text-sm pt-2.5 first:pt-0">
                      <span className="w-6 text-xs font-black text-zinc-300">#{e.categoryRank}</span>
                      <span className="flex-1 font-bold text-zinc-800 truncate">{e.user.name}</span>
                      <span className="text-xs text-zinc-400 font-semibold truncate">{e.user.department?.name}</span>
                      <span className="font-black text-green-600 flex-shrink-0">{e.totalScore} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {staffSorted.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
                <h4 className="font-extrabold text-amber-700 flex items-center gap-2 mb-4 text-sm">
                  <Award className="h-4 w-4" /> Staff Rankings
                </h4>
                <div className="space-y-2.5 divide-y divide-zinc-100">
                  {staffSorted.map((e) => (
                    <div key={e.user.id} className="flex items-center gap-3 text-sm pt-2.5 first:pt-0">
                      <span className="w-6 text-xs font-black text-zinc-300">#{e.categoryRank}</span>
                      <span className="flex-1 font-bold text-zinc-800 truncate">{e.user.name}</span>
                      <span className="text-xs text-zinc-400 font-semibold">Admin Staff</span>
                      <span className="font-black text-amber-600 flex-shrink-0">{e.totalScore} pts</span>
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
