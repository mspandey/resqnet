'use client';

/**
 * web/src/app/authority/alerts/new/page.tsx
 * Authority — declare a district-wide alert and broadcast via Socket.IO.
 */

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { broadcastAlert } from '@/lib/api';
import { ArrowLeft, Bell, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const SEVERITY_OPTIONS = ['critical', 'high', 'moderate', 'low'] as const;

export default function DeclareAlertPage() {
  const router = useRouter();
  const [district, setDistrict] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<string>('high');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!district.trim() || !message.trim()) return;
    setLoading(true);
    try {
      await broadcastAlert({ district, message, severity });
      toast.success('Alert declared and broadcast to district');
      router.push('/authority/dashboard');
    } catch {
      toast.error('Failed to declare alert');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell role="authority">
      <div className="mx-auto max-w-lg">
        <Link
          href="/authority/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-400" />
            <h1 className="text-lg font-bold text-white">Declare District Alert</h1>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="district" className="text-sm font-medium text-slate-300">
                District
              </label>
              <input
                id="district"
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Uttarkashi"
                className={clsx(
                  'rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5',
                  'text-sm text-slate-100 placeholder-slate-500',
                  'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="severity" className="text-sm font-medium text-slate-300">
                Alert Severity
              </label>
              <select
                id="severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className={clsx(
                  'rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5',
                  'text-sm text-slate-100',
                  'focus:border-blue-500 focus:outline-none',
                )}
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="message" className="text-sm font-medium text-slate-300">
                Alert Message
              </label>
              <textarea
                id="message"
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the alert and any immediate actions required…"
                className={clsx(
                  'resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5',
                  'text-sm text-slate-100 placeholder-slate-500',
                  'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                )}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={clsx(
                'mt-2 flex items-center justify-center gap-2 rounded-xl py-3',
                'text-sm font-semibold bg-red-600 text-white hover:bg-red-500',
                'transition-colors disabled:opacity-60',
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              Broadcast Alert
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
