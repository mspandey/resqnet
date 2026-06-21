'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/api';
import { saveSession, defaultPathForRole, type AppRole } from '@/lib/auth';
import { Shield, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      saveSession({ token: res.access_token, role: res.role as AppRole, user_id: res.user_id });
      document.cookie = `resqnet_role=${res.role}; path=/; SameSite=Lax`;
      router.push(defaultPathForRole(res.role as AppRole));
    } catch (err) {
      setError((err as Error).message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}
    >
      {/* Ambient glows */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 20% 30%, rgba(239,68,68,0.08) 0%, transparent 70%), radial-gradient(ellipse 50% 50% at 80% 70%, rgba(99,102,241,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              boxShadow: '0 0 40px rgba(239,68,68,0.35)',
            }}
          >
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1
              className="text-3xl font-black tracking-tight"
              style={{ background: 'linear-gradient(90deg, #fff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              resq<span style={{ WebkitTextFillColor: '#ef4444' }}>net</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">Sign in to access your portal</p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl border p-8 shadow-2xl"
          style={{
            background: 'rgba(15,23,42,0.8)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(239,68,68,0.6)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border px-4 py-3 pr-11 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(239,68,68,0.6)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loading
                  ? 'rgba(239,68,68,0.5)'
                  : 'linear-gradient(135deg, #ef4444, #b91c1c)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(239,68,68,0.4)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <span className="text-xs text-slate-600">New to ResQNet?</span>
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Signup links */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/user/signup"
              className="flex flex-col items-center rounded-2xl border px-4 py-4 text-center transition-all hover:border-sky-500/40"
              style={{
                background: 'rgba(14,165,233,0.04)',
                borderColor: 'rgba(14,165,233,0.15)',
              }}
            >
              <span className="text-sm font-semibold text-sky-400">Citizen</span>
              <span className="mt-0.5 text-xs text-slate-500">Report emergencies</span>
            </Link>
            <Link
              href="/volunteer/signup"
              className="flex flex-col items-center rounded-2xl border px-4 py-4 text-center transition-all hover:border-emerald-500/40"
              style={{
                background: 'rgba(16,185,129,0.04)',
                borderColor: 'rgba(16,185,129,0.15)',
              }}
            >
              <span className="text-sm font-semibold text-emerald-400">Volunteer</span>
              <span className="mt-0.5 text-xs text-slate-500">Respond &amp; assist</span>
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          ResQNet Emergency Response Platform · All sessions are encrypted
        </p>
      </div>
    </main>
  );
}
