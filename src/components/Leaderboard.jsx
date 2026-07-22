"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Trophy, Medal, Star, TrendingUp, Users, Crown,
  Calendar, ChevronDown, Award, Zap, Clock, BarChart3,
  RefreshCw, Info, Flame, Sparkles, Play, Eye, EyeOff, RotateCcw, X
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
  return                              { label: 'Faculty',      color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
}

function getPriorityColor(p) {
  if (p === 'High')   return 'text-red-600 font-bold';
  if (p === 'Medium') return 'text-amber-600 font-bold';
  return 'text-zinc-500 font-medium';
}

function getTimelinessBadge(t) {
  if (t === 'on_time')  return { label: '✓ On Time', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  if (t === 'delayed')  return { label: '⚠ Late',   color: 'text-red-700 bg-red-50 border-red-200' };
  return                       { label: '○ Open',   color: 'text-zinc-600 bg-zinc-50 border-zinc-200' };
}

// ── Clean & Spacious Podium Card ──────────────────────────────────────────────
function PremiumPodiumCard({ entry, position }) {
  if (!entry) return null;
  const configs = {
    1: {
      cardBg: 'bg-gradient-to-b from-amber-500/10 via-yellow-400/5 to-white border-amber-300/80 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20',
      badgeBg: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-white shadow-md shadow-amber-500/30',
      icon: <Crown className="h-6 w-6 text-amber-500 drop-shadow-sm animate-bounce" />,
      avatarBg: 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-md shadow-amber-400/40 border-2 border-white',
      nameColor: 'text-amber-950 font-black',
      scoreColor: 'text-amber-600 font-black text-xl',
      rankText: '1ST PLACE',
      badgeLabel: '🥇 CHAMPION',
      orderClass: 'order-1 md:order-2 md:-translate-y-4'
    },
    2: {
      cardBg: 'bg-gradient-to-b from-slate-200/40 via-zinc-100/20 to-white border-slate-300/80 shadow-md shadow-slate-400/10 hover:shadow-slate-400/20',
      badgeBg: 'bg-gradient-to-r from-slate-400 to-zinc-400 text-white shadow-sm',
      icon: <Medal className="h-5 w-5 text-slate-400" />,
      avatarBg: 'bg-gradient-to-br from-slate-300 to-zinc-400 text-white shadow-md border-2 border-white',
      nameColor: 'text-slate-800 font-bold',
      scoreColor: 'text-slate-600 font-black text-lg',
      rankText: '2ND PLACE',
      badgeLabel: '🥈 RUNNER UP',
      orderClass: 'order-2 md:order-1'
    },
    3: {
      cardBg: 'bg-gradient-to-b from-orange-400/10 via-amber-300/5 to-white border-orange-300/80 shadow-md shadow-orange-500/10 hover:shadow-orange-500/20',
      badgeBg: 'bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-sm',
      icon: <Medal className="h-5 w-5 text-orange-400" />,
      avatarBg: 'bg-gradient-to-br from-orange-400 to-amber-400 text-white shadow-md border-2 border-white',
      nameColor: 'text-orange-950 font-bold',
      scoreColor: 'text-orange-600 font-black text-lg',
      rankText: '3RD PLACE',
      badgeLabel: '🥉 3RD PLACE',
      orderClass: 'order-3 md:order-3'
    },
  };
  const c = configs[position] || configs[2];
  const initials = entry.user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();

  return (
    <div className={`relative flex flex-col items-center justify-between rounded-2xl border ${c.cardBg} p-5 transition-all duration-300 hover:-translate-y-1.5 w-full ${c.orderClass}`}>
      <div className="flex flex-col items-center gap-1.5 w-full text-center">
        <div className="flex items-center justify-center gap-1.5 py-0.5">
          {c.icon}
          <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">{c.rankText}</span>
        </div>

        <div className={`h-16 w-16 flex items-center justify-center rounded-full text-xl font-black my-2 ${c.avatarBg}`}>
          {initials}
        </div>

        <div className="w-full">
          <p className={`text-sm truncate px-1 ${c.nameColor}`} title={entry.user.name}>{entry.user.name}</p>
          <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-medium">{entry.user.department?.name || entry.user.position || 'Academic'}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-1 w-full pt-3 border-t border-zinc-100/80">
        <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${c.badgeBg}`}>
          {c.badgeLabel}
        </span>
        <p className={c.scoreColor}>{entry.totalScore}<span className="text-xs text-zinc-400 font-semibold ml-1">pts</span></p>
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
  const [activeCategoryTab, setActiveCategoryTab] = useState('ALL');

  // Collapsible Accordion States (Default folded/hidden by user request)
  const [isPodiumsCollapsed, setIsPodiumsCollapsed] = useState(true);
  const [isTableCollapsed, setIsTableCollapsed]     = useState(true);

  // Interactive Meeting Ceremony Reveal Mode State
  const [isRevealMode, setIsRevealMode] = useState(false);
  const [revealedCategories, setRevealedCategories] = useState({
    programHead: false,
    faculty: false,
    staff: false
  });
  const [activeRevealAnim, setActiveRevealAnim] = useState(null);

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

  const rawAll          = data?.rankings || [];
  const rawProgramHeads = data?.categories?.programHeads || [];
  const rawFaculty      = data?.categories?.academicFaculty || [];
  const rawStaff        = data?.categories?.adminStaff || [];

  const allRanked         = sortRankings(rawAll).map((e, i) => ({ ...e, rank: i + 1 }));
  const programHeadSorted = sortRankings(rawProgramHeads).map((e, i) => ({ ...e, categoryRank: i + 1 }));
  const facultySorted     = sortRankings(rawFaculty).map((e, i) => ({ ...e, categoryRank: i + 1 }));
  const staffSorted       = sortRankings(rawStaff).map((e, i) => ({ ...e, categoryRank: i + 1 }));

  // Podium sorting: Top 3 array ordered [2nd, 1st, 3rd] for classic podium display
  const getPodiumDisplay = (list) => {
    if (!list || list.length === 0) return [];
    const first = list.find(e => e.categoryRank === 1);
    const second = list.find(e => e.categoryRank === 2);
    const third = list.find(e => e.categoryRank === 3);
    const result = [];
    if (second) result.push(second);
    if (first) result.push(first);
    if (third) result.push(third);
    return result;
  };

  const programHeadPodium = getPodiumDisplay(programHeadSorted);
  const facultyPodium     = getPodiumDisplay(facultySorted);
  const staffPodium       = getPodiumDisplay(staffSorted);

  const periodLabel = timeframe === 'weekly'
    ? 'This Week'
    : timeframe === 'yearly'
    ? `Year ${new Date().getFullYear()}`
    : monthLabel(selectedMonth);

  const isPrincipal = user.role === 'PRINCIPAL';
  const isSchoolAdmin = user.role === 'SCHOOL_ADMIN' || user.role === 'ADMIN';
  const isProgramHead = user.role === 'PROGRAM_HEAD';

  const audioRef = useRef(null);
  const [isPreparingReveal, setIsPreparingReveal] = useState(false);

  const stopCelebrationSound = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (_) {}
      audioRef.current = null;
    }
  };

  const playCelebrationSound = () => {
    stopCelebrationSound();
    try {
      const audio = new Audio('/dora_fanfare.mp3');
      audio.volume = 1.0;
      audio.play().catch(err => {
        console.log('Audio autoplay prevented:', err);
      });
      audioRef.current = audio;

      // Auto stop after 15 seconds if not closed earlier
      setTimeout(() => {
        if (audioRef.current === audio) {
          stopCelebrationSound();
        }
      }, 15000);
    } catch (err) {
      console.log('Audio playback error', err);
    }
  };

  const handleTriggerReveal = (categoryKey) => {
    setIsPreparingReveal(true);
    setActiveRevealAnim(categoryKey);
    setRevealedCategories(prev => ({ ...prev, [categoryKey]: true }));
    playCelebrationSound();
    
    // Smooth 3-Second Transition: Suspense aura smoothly cross-fades into Name Spotlight
    setTimeout(() => {
      setIsPreparingReveal(false);
    }, 3000);
  };

  const closeSpotlight = () => {
    stopCelebrationSound();
    setActiveRevealAnim(null);
    setIsPreparingReveal(false);
  };

  const resetReveals = () => {
    stopCelebrationSound();
    setIsPreparingReveal(false);
    setRevealedCategories({ programHead: false, faculty: false, staff: false });
  };

  return (
    <div className="space-y-6 text-zinc-900 animate-fadeIn">

      {/* ── Meeting Ceremony Reveal Overlay (Portaled directly to document.body to fully escape parent layout constraints & cover sticky header) ── */}
      {isRevealMode && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[2147483647] bg-slate-950 p-6 md:p-10 flex flex-col text-white overflow-y-auto animate-fadeIn w-screen h-screen">

          {/* Combined Smooth Single-Container Reveal & Suspense Overlay */}
          {activeRevealAnim && (
            <div 
              onClick={closeSpotlight}
              className="fixed inset-0 cursor-pointer z-[2147483647] flex flex-col items-center justify-center overflow-hidden bg-black/85 backdrop-blur-md animate-fadeIn"
            >
              {/* Confetti Side Bursts & Rain */}
              {!isPreparingReveal && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {Array.from({ length: 50 }).map((_, i) => {
                    const colors = ['bg-yellow-400', 'bg-amber-300', 'bg-emerald-400', 'bg-blue-400', 'bg-rose-400', 'bg-purple-400'];
                    const randomColor = colors[i % colors.length];
                    const leftPos = Math.random() * 100;
                    const animDuration = 1.5 + Math.random() * 2;
                    const animDelay = Math.random() * 0.5;
                    const size = 8 + Math.random() * 10;
                    return (
                      <div
                        key={i}
                        className={`absolute rounded-sm ${randomColor} opacity-90 shadow-sm`}
                        style={{
                          top: '-5%',
                          left: `${leftPos}%`,
                          width: `${size}px`,
                          height: `${size * 1.4}px`,
                          transform: `rotate(${Math.random() * 360}deg)`,
                          animation: `fall ${animDuration}s linear ${animDelay}s infinite`
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* 1. Suspense Stage (0s - 3s): Pokémon Evolving Aura + CONGRATULATIONS Text */}
              {isPreparingReveal ? (
                <div className="relative z-20 flex flex-col items-center justify-center animate-scaleIn">
                  <div className="relative flex items-center justify-center mb-6">
                    <div className="absolute h-64 w-64 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-200 to-white opacity-40 animate-ping" />
                    <div className="absolute h-48 w-48 rounded-full bg-yellow-400/50 animate-pulse blur-xl" />
                    <div className="relative p-8 bg-slate-900 border-4 border-yellow-400 rounded-full shadow-[0_0_100px_rgba(250,204,21,0.9)] animate-spin">
                      <Sparkles className="h-20 w-20 text-yellow-300" />
                    </div>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black text-amber-300 tracking-widest uppercase mt-4 animate-bounce text-center drop-shadow-[0_0_25px_rgba(250,204,21,0.8)]">
                    🎉 CONGRATULATIONS! 🎉
                  </h2>
                  <p className="text-zinc-300 text-sm md:text-base font-extrabold uppercase tracking-wider mt-3 animate-pulse">
                    Get ready for the official winner announcement…
                  </p>
                </div>
              ) : (
                /* 2. Spotlight Winner Stage (3s onwards): Smooth Scale-In Name Card */
                (() => {
                  let winnerObj = null;
                  let title = '';
                  if (activeRevealAnim === 'programHead') {
                    winnerObj = data?.awards?.programHeadOfPeriod;
                    title = '👑 PROGRAM HEAD OF THE PERIOD';
                  } else if (activeRevealAnim === 'faculty') {
                    winnerObj = data?.awards?.facultyOfPeriod;
                    title = '🎓 FACULTY OF THE PERIOD';
                  } else if (activeRevealAnim === 'staff') {
                    winnerObj = data?.awards?.staffOfPeriod;
                    title = '🗂 ADMINISTRATIVE STAFF OF THE PERIOD';
                  }
                  if (!winnerObj) return null;

                  return (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="relative z-10 text-center px-8 py-10 bg-slate-900 border-2 border-amber-400 rounded-3xl shadow-[0_0_90px_rgba(251,191,36,0.45)] animate-scaleIn max-w-2xl w-full mx-4 cursor-default text-white"
                    >
                      <span className="text-amber-400 font-black text-xs md:text-sm tracking-widest uppercase mb-3 block animate-pulse">
                        {title}
                      </span>
                      <h1 className="text-4xl md:text-6xl font-black text-amber-300 tracking-tight my-3 drop-shadow-lg">
                        {winnerObj.user.name}
                      </h1>
                      <p className="text-slate-200 font-bold text-base md:text-lg mt-2">
                        {winnerObj.user.department?.name || winnerObj.user.position || 'Academic Awardee'}
                      </p>
                      
                      <div className="mt-5 inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/40 px-6 py-2.5 rounded-full mb-8">
                        <Trophy className="h-6 w-6 text-yellow-400" />
                        <span className="text-3xl font-black text-yellow-300">{winnerObj.totalScore}</span>
                        <span className="text-xs font-black text-amber-200 uppercase tracking-wider">PTS</span>
                      </div>

                      <div className="pt-4 border-t border-slate-800">
                        <button
                          onClick={closeSpotlight}
                          className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs md:text-sm rounded-2xl uppercase tracking-widest shadow-xl shadow-amber-500/30 transition transform hover:scale-105 active:scale-95 cursor-pointer"
                        >
                          ✓ Continue & Attach to Leaderboard
                        </button>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          <div className="flex justify-between items-center border-b border-zinc-800 pb-6 mb-8 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-2xl shadow-lg shadow-amber-500/20 text-slate-950 font-black">
                <Trophy className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  Executive Meeting Awards Ceremony
                </h1>
                <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mt-1">
                  Official Recognition · {periodLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Timeframe selector inside presentation mode */}
              <div className="flex items-center gap-1 bg-slate-900 border border-zinc-800 rounded-xl p-1">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setTimeframe(tab.id);
                      resetReveals();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      timeframe === tab.id
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Month selector inside presentation mode — fixed container to prevent layout shifts */}
              <div className="min-w-[140px] flex items-center justify-end">
                {timeframe === 'monthly' ? (
                  <div className="relative w-full">
                    <select
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        resetReveals();
                      }}
                      className="w-full appearance-none rounded-xl border border-zinc-800 bg-slate-900 py-1.5 pl-7 pr-7 text-xs font-bold text-amber-300 focus:outline-none cursor-pointer"
                    >
                      {months.map(m => (
                        <option key={m} value={m} className="bg-slate-900 text-white">{monthLabel(m)}</option>
                      ))}
                    </select>
                    <Calendar className="absolute left-2 top-2 h-3.5 w-3.5 text-amber-400 pointer-events-none" />
                    <ChevronDown className="absolute right-2 top-2.5 h-3 w-3 text-amber-400 pointer-events-none" />
                  </div>
                ) : (
                  <span className="text-xs text-zinc-500 font-semibold px-2 select-none">Global Filter</span>
                )}
              </div>

              <button
                onClick={resetReveals}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition"
                title="Reset all unrevealed winners"
              >
                <RotateCcw className="h-4 w-4" /> Reset Reveal
              </button>
              <button
                onClick={() => {
                  setIsRevealMode(false);
                  resetReveals();
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-red-600/20"
              >
                <X className="h-4 w-4" /> Exit Meeting Mode
              </button>
            </div>
          </div>

          <div className="flex-1 max-w-6xl w-full mx-auto space-y-12">
            {/* Award Reveal Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* 1. Program Head Reveal Card */}
              {(isPrincipal || isSchoolAdmin) && (
                <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-blue-500/30 rounded-3xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10 text-blue-400">
                    <Crown className="h-32 w-32" />
                  </div>
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest">
                        👑 Program Head
                      </span>
                      <Sparkles className="h-5 w-5 text-blue-400" />
                    </div>

                    <h3 className="text-xl font-black text-white mb-2">Program Head of the {timeframe === 'weekly' ? 'Week' : timeframe === 'yearly' ? 'Year' : 'Month'}</h3>
                    <p className="text-zinc-400 text-xs mb-6">Highest efficiency and task completion across academic departments.</p>
                  </div>

                  {revealedCategories.programHead && data?.awards?.programHeadOfPeriod ? (
                    <div className="bg-gradient-to-b from-blue-950/60 to-slate-900 border border-blue-400/50 rounded-2xl p-5 text-center animate-scaleIn shadow-xl">
                      <div className="h-20 w-20 bg-gradient-to-tr from-blue-500 to-cyan-400 text-slate-950 font-black rounded-full mx-auto flex items-center justify-center text-2xl border-4 border-blue-300 shadow-lg mb-3">
                        {data.awards.programHeadOfPeriod.user.name.slice(0, 2).toUpperCase()}
                      </div>
                      <h4 className="text-xl font-black text-white">{data.awards.programHeadOfPeriod.user.name}</h4>
                      <p className="text-blue-300 text-xs font-bold mt-1">{data.awards.programHeadOfPeriod.user.department?.name || 'Academic Dept'}</p>
                      <div className="mt-4 bg-blue-500/20 py-2 px-4 rounded-xl border border-blue-400/30 inline-block">
                        <span className="text-2xl font-black text-blue-200">{data.awards.programHeadOfPeriod.totalScore}</span>
                        <span className="text-xs text-blue-300 font-bold ml-1">pts</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      disabled={!data?.awards?.programHeadOfPeriod}
                      onClick={() => handleTriggerReveal('programHead')}
                      className={`w-full py-5 rounded-2xl font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition ${
                        data?.awards?.programHeadOfPeriod
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-600/30 transform active:scale-95 cursor-pointer'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Sparkles className="h-5 w-5 text-yellow-300" />
                      {data?.awards?.programHeadOfPeriod ? 'Reveal Program Head Winner' : 'No Awardee Yet (0 PTS)'}
                    </button>
                  )}
                </div>
              )}

              {/* 2. Faculty Reveal Card */}
              <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 text-emerald-400">
                  <Star className="h-32 w-32" />
                </div>
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest">
                      🎓 Academic Faculty
                    </span>
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                  </div>

                  <h3 className="text-xl font-black text-white mb-2">Faculty of the {timeframe === 'weekly' ? 'Week' : timeframe === 'yearly' ? 'Year' : 'Month'}</h3>
                  <p className="text-zinc-400 text-xs mb-6">Top performing academic instructor with outstanding performance score.</p>
                </div>

                {revealedCategories.faculty && data?.awards?.facultyOfPeriod ? (
                  <div className="bg-gradient-to-b from-emerald-950/60 to-slate-900 border border-emerald-400/50 rounded-2xl p-5 text-center animate-scaleIn shadow-xl">
                    <div className="h-20 w-20 bg-gradient-to-tr from-emerald-400 to-teal-300 text-slate-950 font-black rounded-full mx-auto flex items-center justify-center text-2xl border-4 border-emerald-300 shadow-lg mb-3">
                      {data.awards.facultyOfPeriod.user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <h4 className="text-xl font-black text-white">{data.awards.facultyOfPeriod.user.name}</h4>
                    <p className="text-emerald-300 text-xs font-bold mt-1">{data.awards.facultyOfPeriod.user.department?.name || 'Faculty'}</p>
                    <div className="mt-4 bg-emerald-500/20 py-2 px-4 rounded-xl border border-emerald-400/30 inline-block">
                      <span className="text-2xl font-black text-emerald-200">{data.awards.facultyOfPeriod.totalScore}</span>
                      <span className="text-xs text-emerald-300 font-bold ml-1">pts</span>
                    </div>
                  </div>
                ) : (
                  <button
                    disabled={!data?.awards?.facultyOfPeriod}
                    onClick={() => handleTriggerReveal('faculty')}
                    className={`w-full py-5 rounded-2xl font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition ${
                      data?.awards?.facultyOfPeriod
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-600/30 transform active:scale-95 cursor-pointer'
                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Sparkles className="h-5 w-5 text-yellow-300" />
                    {data?.awards?.facultyOfPeriod ? 'Reveal Faculty Winner' : 'No Awardee Yet (0 PTS)'}
                  </button>
                )}
              </div>

              {/* 3. Administrative Staff Reveal Card */}
              {isSchoolAdmin && (
                <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-amber-500/30 rounded-3xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10 text-amber-400">
                    <Award className="h-32 w-32" />
                  </div>
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest">
                        🗂 Admin Staff
                      </span>
                      <Sparkles className="h-5 w-5 text-amber-400" />
                    </div>

                    <h3 className="text-xl font-black text-white mb-2">Staff of the {timeframe === 'weekly' ? 'Week' : timeframe === 'yearly' ? 'Year' : 'Month'}</h3>
                    <p className="text-zinc-400 text-xs mb-6">Excellence in administrative support and timely task completions.</p>
                  </div>

                  {revealedCategories.staff && data?.awards?.staffOfPeriod ? (
                    <div className="bg-gradient-to-b from-amber-950/60 to-slate-900 border border-amber-400/50 rounded-2xl p-5 text-center animate-scaleIn shadow-xl">
                      <div className="h-20 w-20 bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black rounded-full mx-auto flex items-center justify-center text-2xl border-4 border-amber-300 shadow-lg mb-3">
                        {data.awards.staffOfPeriod.user.name.slice(0, 2).toUpperCase()}
                      </div>
                      <h4 className="text-xl font-black text-white">{data.awards.staffOfPeriod.user.name}</h4>
                      <p className="text-amber-300 text-xs font-bold mt-1">Admin Department</p>
                      <div className="mt-4 bg-amber-500/20 py-2 px-4 rounded-xl border border-amber-400/30 inline-block">
                        <span className="text-2xl font-black text-amber-200">{data.awards.staffOfPeriod.totalScore}</span>
                        <span className="text-xs text-amber-300 font-bold ml-1">pts</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      disabled={!data?.awards?.staffOfPeriod}
                      onClick={() => handleTriggerReveal('staff')}
                      className={`w-full py-5 rounded-2xl font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition ${
                        data?.awards?.staffOfPeriod
                          ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 shadow-xl shadow-amber-500/30 transform active:scale-95 cursor-pointer'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <Sparkles className="h-5 w-5 text-white" />
                      {data?.awards?.staffOfPeriod ? 'Reveal Staff Winner' : 'No Awardee Yet (0 PTS)'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-widest mb-1">
            <Sparkles className="h-4 w-4" /> Performance Recognition
          </div>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
            Institutional Leaderboard
          </h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Rankings by verified task accomplishments · {periodLabel}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Executive Presentation / Meeting Reveal Mode Button */}
          <button
            onClick={() => setIsRevealMode(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-extrabold px-4 py-2.5 text-xs shadow-md shadow-amber-500/20 transition active:scale-95"
          >
            <Play className="h-4 w-4 fill-slate-950" /> Award Reveal Presentation
          </button>

          {/* Formula toggle */}
          <button
            onClick={() => setShowFormula(!showFormula)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 px-3.5 py-2.5 text-xs font-bold text-zinc-700 transition"
          >
            <Info className="h-4 w-4 text-zinc-500" /> Scoring Rule
          </button>

          {/* Sort selector */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-3.5 pr-8 text-xs font-bold text-zinc-700 focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="score">Sort by Score</option>
              <option value="tasks">Sort by Tasks</option>
              <option value="ontime">Sort by On-Time</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-3 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          </div>

          <button onClick={fetchLeaderboard} className="p-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Timeframe & Month Filter Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl p-2.5">
        <div className="flex items-center gap-1.5 bg-white border border-zinc-200/80 rounded-xl p-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTimeframe(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                timeframe === tab.id
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {timeframe === 'monthly' && (
          <div className="flex items-center gap-2 pr-2">
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Select Month:</span>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none rounded-xl border border-zinc-200 bg-white py-1.5 pl-8 pr-8 text-xs font-bold text-zinc-700 focus:outline-none cursor-pointer shadow-xs"
              >
                {months.map(m => (
                  <option key={m} value={m}>{monthLabel(m)}</option>
                ))}
              </select>
              <Calendar className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
              <ChevronDown className="absolute right-2.5 top-2.5 h-3 w-3 text-zinc-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* ── Scoring Formula ── */}
      {showFormula && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-6 space-y-4 animate-slideDown">
          <h3 className="font-extrabold text-blue-900 flex items-center gap-2 text-sm">
            <BarChart3 className="h-4.5 w-4.5 text-blue-600" /> Transparent Scoring System
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white p-4 rounded-xl border border-blue-100">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-2">1. Priority Points</p>
              <div className="space-y-1.5">
                <div className="flex justify-between"><span className="text-red-600 font-bold">High Priority</span><span className="font-extrabold">30 pts</span></div>
                <div className="flex justify-between"><span className="text-amber-600 font-bold">Medium Priority</span><span className="font-extrabold">20 pts</span></div>
                <div className="flex justify-between"><span className="text-zinc-500 font-bold">Low Priority</span><span className="font-extrabold">10 pts</span></div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-blue-100">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-2">2. Timeliness Multiplier</p>
              <div className="space-y-1.5">
                <div className="flex justify-between"><span className="text-emerald-700 font-bold">Completed On Time</span><span className="font-extrabold text-emerald-600">×1.5</span></div>
                <div className="flex justify-between"><span className="text-zinc-500 font-bold">No Deadline Set</span><span className="font-extrabold text-zinc-600">×1.2</span></div>
                <div className="flex justify-between"><span className="text-red-600 font-bold">Completed Late</span><span className="font-extrabold text-red-600">×1.0</span></div>
              </div>
            </div>
            <div className="flex flex-col justify-center rounded-xl border border-blue-200 bg-white p-4 text-center">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">Calculation Example</p>
              <p className="font-extrabold text-zinc-900 text-sm">High Priority + On Time</p>
              <p className="text-amber-600 font-black text-xl mt-0.5">= 45 Points</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4 bg-white border border-zinc-200/80 rounded-2xl">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Computing rankings…</p>
        </div>
      ) : !data || allRanked.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 gap-3 text-center bg-white border border-zinc-200/80 rounded-2xl p-6">
          <Trophy className="h-16 w-16 text-zinc-200" />
          <p className="text-zinc-800 font-extrabold text-base">No completed tasks found for {periodLabel}</p>
          <p className="text-zinc-400 text-xs">Rankings update dynamically as staff members complete assigned tasks.</p>
        </div>
      ) : (
        <>
          {/* ── Collapsible Category Podiums Section (Folded by default) ── */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white overflow-hidden shadow-xs">
            <div 
              onClick={() => setIsPodiumsCollapsed(!isPodiumsCollapsed)}
              className="px-6 py-4 flex items-center justify-between bg-zinc-50 hover:bg-zinc-100/70 transition cursor-pointer select-none border-b border-zinc-100"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-zinc-900 text-sm">Category Podiums</h3>
                  <p className="text-zinc-500 text-xs mt-0.5">Top 3 performers per role & academic category</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-500 bg-white border border-zinc-200 px-3 py-1 rounded-full shadow-2xs">
                  {isPodiumsCollapsed ? 'Click to Extend 👇' : 'Click to Collapse ☝️'}
                </span>
                <ChevronDown className={`h-5 w-5 text-zinc-400 transition-transform duration-300 ${!isPodiumsCollapsed ? 'rotate-180 text-amber-600' : ''}`} />
              </div>
            </div>

            {!isPodiumsCollapsed && (
              <div className="p-6 space-y-6 animate-slideDown">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Filter View:</span>
                  <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveCategoryTab('ALL')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${activeCategoryTab === 'ALL' ? 'bg-white shadow text-zinc-900' : 'text-zinc-500 hover:text-zinc-800'}`}
                    >
                      All Categories
                    </button>
                    {(isPrincipal || isSchoolAdmin) && (
                      <button
                        onClick={() => setActiveCategoryTab('PROGRAM_HEAD')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${activeCategoryTab === 'PROGRAM_HEAD' ? 'bg-blue-600 text-white shadow' : 'text-zinc-500 hover:text-zinc-800'}`}
                      >
                        Program Heads
                      </button>
                    )}
                    <button
                      onClick={() => setActiveCategoryTab('FACULTY')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${activeCategoryTab === 'FACULTY' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-500 hover:text-zinc-800'}`}
                    >
                      Faculty
                    </button>
                    {isSchoolAdmin && (
                      <button
                        onClick={() => setActiveCategoryTab('STAFF')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${activeCategoryTab === 'STAFF' ? 'bg-amber-600 text-white shadow' : 'text-zinc-500 hover:text-zinc-800'}`}
                      >
                        Admin Staff
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  {/* Program Head Podium */}
                  {(activeCategoryTab === 'ALL' || activeCategoryTab === 'PROGRAM_HEAD') && (isPrincipal || isSchoolAdmin) && programHeadPodium.length > 0 && (
                    <div className="bg-gradient-to-b from-blue-50/50 via-white to-white border border-blue-100 rounded-3xl p-6 shadow-xs">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-sm font-black text-blue-900 uppercase tracking-wider flex items-center gap-2">
                          <Crown className="h-5 w-5 text-blue-600" /> Program Head Champions
                        </h4>
                        <span className="text-xs font-bold text-blue-600 bg-blue-100/60 px-3 py-1 rounded-full">Academic Supervision</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        {programHeadPodium.map((e) => (
                          <PremiumPodiumCard key={e.user.id} entry={e} position={e.categoryRank} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Faculty Podium */}
                  {(activeCategoryTab === 'ALL' || activeCategoryTab === 'FACULTY') && facultyPodium.length > 0 && (
                    <div className="bg-gradient-to-b from-emerald-50/50 via-white to-white border border-emerald-100 rounded-3xl p-6 shadow-xs">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-sm font-black text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                          <Star className="h-5 w-5 text-emerald-600" /> Faculty Champions
                        </h4>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-100/60 px-3 py-1 rounded-full">Academic Faculty</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        {facultyPodium.map((e) => (
                          <PremiumPodiumCard key={e.user.id} entry={e} position={e.categoryRank} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Staff Podium */}
                  {(activeCategoryTab === 'ALL' || activeCategoryTab === 'STAFF') && isSchoolAdmin && staffPodium.length > 0 && (
                    <div className="bg-gradient-to-b from-amber-50/50 via-white to-white border border-amber-100 rounded-3xl p-6 shadow-xs">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-sm font-black text-amber-900 uppercase tracking-wider flex items-center gap-2">
                          <Award className="h-5 w-5 text-amber-600" /> Administrative Staff Champions
                        </h4>
                        <span className="text-xs font-bold text-amber-600 bg-amber-100/60 px-3 py-1 rounded-full">Administrative Support</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        {staffPodium.map((e) => (
                          <PremiumPodiumCard key={e.user.id} entry={e} position={e.categoryRank} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Collapsible Full Overall Rankings Table (Folded by default) ── */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white overflow-hidden shadow-xs">
            <div 
              onClick={() => setIsTableCollapsed(!isTableCollapsed)}
              className="border-b border-zinc-100 px-6 py-4 flex items-center justify-between bg-zinc-50 hover:bg-zinc-100/70 transition cursor-pointer select-none"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-zinc-900 text-sm flex items-center gap-2">
                    Comprehensive Rankings List — {periodLabel}
                  </h3>
                  <p className="text-zinc-500 text-xs mt-0.5">{allRanked.length} Participants Total</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-500 bg-white border border-zinc-200 px-3 py-1 rounded-full shadow-2xs">
                  {isTableCollapsed ? 'Click to Extend 👇' : 'Click to Collapse ☝️'}
                </span>
                <ChevronDown className={`h-5 w-5 text-zinc-400 transition-transform duration-300 ${!isTableCollapsed ? 'rotate-180 text-blue-600' : ''}`} />
              </div>
            </div>

            {!isTableCollapsed && (
              <div className="overflow-x-auto animate-slideDown">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-zinc-50/80 text-[10px] font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-200">
                    <tr>
                      <th className="py-3.5 px-6 w-20">Rank</th>
                      <th className="py-3.5 px-6">Personnel</th>
                      <th className="py-3.5 px-6">Department</th>
                      <th className="py-3.5 px-6">Role</th>
                      <th className="py-3.5 px-6 text-center">Completed Tasks</th>
                      <th className="py-3.5 px-6 text-center">On-Time</th>
                      <th className="py-3.5 px-6 text-center">High Priority</th>
                      <th className="py-3.5 px-6 text-right">Total Score</th>
                      <th className="py-3.5 px-6 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {allRanked.map((entry, index) => {
                      const badge = getRoleBadge(entry.user.role, entry.user.department?.name);
                      const isExpanded = expandedRank === entry.user.id;
                      const isMe = entry.user.id === user.id;
                      const zebra = index % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50';
                      const rankBadge = entry.rank === 1 ? 'bg-amber-100 text-amber-800 border-amber-200 font-black' :
                                        entry.rank === 2 ? 'bg-slate-100 text-slate-800 border-slate-200 font-bold' :
                                        entry.rank === 3 ? 'bg-orange-100 text-orange-800 border-orange-200 font-bold' :
                                        'bg-zinc-100 text-zinc-600 border-zinc-200 font-bold';
                      const initials = entry.user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();

                      return (
                        <React.Fragment key={entry.user.id}>
                          <tr
                            onClick={() => setExpandedRank(isExpanded ? null : entry.user.id)}
                            className={`hover:bg-blue-50/30 transition cursor-pointer ${zebra} ${isMe ? 'bg-blue-50/60' : ''}`}
                          >
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center justify-center h-7 w-8 rounded-lg text-xs border ${rankBadge}`}>
                                #{entry.rank}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 flex items-center justify-center rounded-full text-xs font-black bg-zinc-100 border border-zinc-200 text-zinc-700 flex-shrink-0">
                                  {initials}
                                </div>
                                <div>
                                  <p className="font-extrabold text-zinc-900 text-sm">
                                    {entry.user.name}
                                    {isMe && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 font-black px-2 py-0.5 rounded-full">(You)</span>}
                                  </p>
                                  <p className="text-xs text-zinc-400 font-medium">{entry.user.position || '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-xs text-zinc-600 font-bold">{entry.user.department?.name || '—'}</td>
                            <td className="py-4 px-6">
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${badge.color}`}>{badge.label}</span>
                            </td>
                            <td className="py-4 px-6 text-center font-extrabold text-zinc-800">{entry.taskCount}</td>
                            <td className="py-4 px-6 text-center">
                              <span className="text-emerald-600 font-extrabold">{entry.onTimeCount}</span>
                              <span className="text-zinc-300 text-xs"> / {entry.taskCount}</span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className="text-red-500 font-extrabold">{entry.highCount}</span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <span className="text-lg font-black text-amber-600">{entry.totalScore}</span>
                              <span className="text-xs text-zinc-400 font-semibold ml-1">pts</span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180 text-blue-600' : ''}`} />
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr key={`${entry.user.id}-exp`}>
                              <td colSpan={9} className="bg-zinc-50/90 px-6 py-5 border-t border-b border-zinc-200">
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-3">
                                  Detailed Accomplishment Breakdown — {entry.user.name}
                                </p>
                                <div className="space-y-2">
                                  {entry.tasks.map((t, ti) => {
                                    const tb = getTimelinessBadge(t.timeliness);
                                    return (
                                      <div key={ti} className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 text-xs shadow-2xs">
                                        <span className={`font-bold w-16 flex-shrink-0 ${getPriorityColor(t.priority)}`}>{t.priority}</span>
                                        <span className="flex-1 text-zinc-800 font-medium truncate">{t.taskDescription}</span>
                                        <span className={`flex-shrink-0 rounded-lg border px-2.5 py-0.5 text-[10px] font-black ${tb.color}`}>{tb.label}</span>
                                        <span className="flex-shrink-0 font-black text-amber-600 w-16 text-right">+{t.score} pts</span>
                                      </div>
                                    );
                                  })}
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
            )}
          </div>
        </>
      )}
    </div>
  );
}
