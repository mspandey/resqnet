'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { register } from '@/lib/api';
import { saveSession, defaultPathForRole, type AppRole } from '@/lib/auth';
import { Shield } from 'lucide-react';
import { clsx } from 'clsx';

export default function AdminSignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await register({
        email,
        password,
        name,
        phone,
        preferred_language: 'en',
        role: 'admin',
      });

      saveSession({ token: res.access_token, role: res.role as AppRole, user_id: res.user_id });
      document.cookie = `resqnet_token=${res.access_token}; path=/; SameSite=Lax`;
      document.cookie = `resqnet_role=${res.role}; path=/; SameSite=Lax`;
      router.push(defaultPathForRole(res.role as AppRole));
    } catch (err) {
      setError((err as Error).message || 'Unable to register admin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 shadow-lg shadow-violet-500/30">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Sign Up</h1>
            <p className="text-sm text-slate-400">Hidden admin onboarding for platform administrators.</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              Name
              <input
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={clsx(
                  'rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5',
                  'text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500',
                )}
                placeholder="Platform Admin"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={clsx(
                  'rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5',
                  'text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500',
                )}
                placeholder="admin@resqnet.dev"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              Phone
              <input
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={clsx(
                  'rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5',
                  'text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500',
                )}
                placeholder="+911800001215"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              Password
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={clsx(
                  'rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5',
                  'text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500',
                )}
                placeholder="••••••••"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={clsx(
                'mt-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition-colors',
                'hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              {loading ? 'Registering admin…' : 'Register admin'}
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
            <p className="font-medium text-slate-200">Admin registration is restricted.</p>
            <p>If signup is disabled, set <code>ALLOW_ADMIN_REGISTRATION=true</code> in the API gateway environment.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
