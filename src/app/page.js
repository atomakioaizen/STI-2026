"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            router.push('/dashboard');
            return;
          }
        }
      } catch (err) {
        console.error('Session check failed', err);
      } finally {
        setCheckingSession(false);
      }
    }
    checkSession();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid credentials. Please try again.');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white font-sans">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-zinc-950 p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-zinc-950 to-zinc-900" />
        <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-blue-600/10 blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-blue-400/5 blur-[60px]" />
        <div className="relative z-10 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-2xl mb-8">
            <span className="text-2xl font-black text-white tracking-wider">STI</span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight mb-3">
            STI Puerto Princesa
          </h2>
          <p className="text-zinc-400 text-sm font-medium max-w-xs leading-relaxed">
            Institutional Task Monitoring & Planning System — Streamline faculty deliverables with precision.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-xs mx-auto">
            {[
              { label: 'Active Tasks', color: 'bg-blue-500/20 border-blue-500/30 text-blue-300' },
              { label: 'Departments', color: 'bg-zinc-700/40 border-zinc-600/30 text-zinc-300' },
              { label: 'Leaderboard', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl border px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide ${item.color}`}>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <span className="text-xs font-black text-white">STI</span>
              </div>
              <span className="text-sm font-black text-zinc-900 tracking-tight">STI Puerto Princesa</span>
            </div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">
              Welcome back
            </h1>
            <p className="text-sm text-zinc-500 font-medium">
              Sign in to your account to continue.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-semibold">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label htmlFor="username" className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder=""
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 px-4 text-sm text-zinc-900 font-medium placeholder-zinc-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                autoComplete="off"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 px-4 text-sm text-zinc-900 font-medium focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 px-4 text-sm font-black text-white shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-zinc-400 font-medium">
            © 2026 STI College Puerto Princesa — Task Monitoring System
          </p>
        </div>
      </div>
    </div>
  );
}
