"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  // Check if already logged in
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

  const handleQuickLogin = (uname, pass) => {
    setUsername(uname);
    setPassword(pass);
    setError('');
  };

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
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
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
      <div className="flex min-h-screen items-center justify-center bg-[#0a192f] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
          <p className="text-zinc-400 font-medium animate-pulse">Initializing STI Task Monitor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#020c1b] px-4 font-sans text-white">
      {/* Background Glowing Blobs */}
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-900/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-yellow-950/10 blur-[120px] pointer-events-none"></div>

      <div className="relative w-full max-w-md">
        {/* Decorative STI Color Line Accent */}
        <div className="absolute top-0 left-1/2 h-1.5 w-4/5 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500 via-yellow-400 to-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.6)]"></div>

        {/* Login Box */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-[#0a192f]/60 p-8 shadow-2xl backdrop-blur-md">
          {/* Header */}
          <div className="mb-8 flex flex-col items-center text-center">
            {/* Logo placeholder or simple styled text logo */}
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 p-2 shadow-lg ring-2 ring-yellow-400/50">
              <span className="text-2xl font-black tracking-wider text-yellow-400">STI</span>
            </div>
            
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
              STI Puerto Princesa
            </h1>
            <p className="mt-1 text-sm text-zinc-400 font-medium">
              Task Monitoring & Planning System
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-400 text-center font-medium animate-shake">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. laurice.santiago"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-3 px-4 text-white placeholder-zinc-500 transition-all duration-300 focus:border-blue-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Password
                </label>
              </div>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-white/5 py-3 px-4 text-white placeholder-zinc-500 transition-all duration-300 focus:border-blue-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-blue-700 to-blue-800 py-3 px-4 font-bold text-white shadow-lg transition-all duration-300 hover:from-blue-600 hover:to-blue-700 hover:shadow-blue-500/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Quick Login Credentials */}
          <div className="mt-8 border-t border-white/5 pt-6">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
              Quick Autofill — Password: <span className="text-yellow-400">password123</span>
            </p>
            <div className="flex justify-center text-xs font-medium">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'password123')}
                className="w-full rounded-lg bg-purple-950/20 border border-purple-500/20 py-2.5 px-4 text-purple-400 hover:bg-purple-950/40 hover:border-purple-500/40 text-center transition"
              >
                <div className="font-bold text-zinc-300">Default School Admin Account</div>
                <div className="text-xs opacity-75">Username: admin</div>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
