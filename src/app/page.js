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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent"></div>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans p-6">
      <div className="w-full max-w-md bg-white rounded-3xl border border-zinc-200/80 shadow-2xl p-8 md:p-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">
            Puerto Princesa
          </h1>
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">
            Task Monitoring System
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-xs text-red-700 font-semibold animate-shake">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          <div>
            <label htmlFor="username" className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3.5 px-4 text-sm text-zinc-900 font-medium placeholder-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none transition-all duration-200"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="off"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3.5 px-4 text-sm text-zinc-900 font-medium placeholder-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none transition-all duration-200"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-zinc-900 py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-zinc-900/25 hover:bg-zinc-800 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none mt-2 cursor-pointer"
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

        <p className="mt-8 text-center text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
          © 2026 PPSTMS — ALL RIGHTS RESERVED
        </p>
      </div>
    </div>
  );
}
