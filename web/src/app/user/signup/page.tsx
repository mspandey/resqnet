'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/api';
import { saveSession, defaultPathForRole, type AppRole } from '@/lib/auth';

import { UserPlus } from 'lucide-react';
import { clsx } from 'clsx';

const PHONE_RE = /^[6-9]\d{9}$/;

export default function UserSignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function validatePhone(value: string) {
    const digits = value.replace(/\D/g, '');
    if (!PHONE_RE.test(digits)) {
      setPhoneErr('Enter a valid 10-digit Indian mobile number (starts with 6–9)');
      return false;
    }
    setPhoneErr('');
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!validatePhone(phone)) return;
    setLoading(true);

    try {
      const result = await register({
        email,
        password,
        name,
        phone: phone.replace(/\D/g, ''),
        role: 'citizen',
      });

      // Persist JWT + role so apiFetch() attaches Authorization header automatically
      saveSession({ token: result.access_token, role: result.role as AppRole, user_id: result.user_id });
      document.cookie = `resqnet_role=citizen; path=/; SameSite=Lax`;
      router.push(defaultPathForRole('citizen'));
    } catch (err) {
      setError((err as Error).message || 'Unable to register. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = clsx(
    'rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5',
    'text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 w-full',
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-600 shadow-lg shadow-sky-500/30">
            <UserPlus className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Citizen Sign Up</h1>
            <p className="text-sm text-slate-400">Create your account to report emergencies.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Name */}
            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              Full Name
              <input
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="Priya Sharma"
              />
            </label>

            {/* Email */}
            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
              />
            </label>

            {/* Phone with validation */}
            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              Phone Number
              <input
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneErr) validatePhone(e.target.value);
                }}
                onBlur={() => validatePhone(phone)}
                className={clsx(inputCls, phoneErr && 'border-red-500 focus:border-red-500 focus:ring-red-500')}
                placeholder="9876543210"
                maxLength={10}
              />
              {phoneErr && <span className="text-xs text-red-400">{phoneErr}</span>}
            </label>

            {/* Password */}
            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              Password
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
              />
              <span className="text-xs text-slate-500">Minimum 8 characters</span>
            </label>

            {error && (
              <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={clsx(
                'mt-2 rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white transition-colors',
                'hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              {loading ? 'Creating account…' : 'Create Citizen Account'}
            </button>

            <p className="text-center text-xs text-slate-500">
              Already have an account?{' '}
              <Link href="/user/login" className="text-sky-400 hover:text-sky-300">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
