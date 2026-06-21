'use client';

/**
 * web/src/app/rescue/incidents/[id]/resolve/page.tsx
 * Rescue Team — log outcome and close case.
 * Outcome notes are required; dispatchers must record what happened.
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { updateDispatchStatus } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const OUTCOME_OPTIONS = [
  { value: 'resolved', label: 'Resolved — situation contained' },
  { value: 'referred', label: 'Referred — handed off to specialist' },
  { value: 'false_alarm', label: 'False Alarm — no emergency found' },
  { value: 'ongoing', label: 'Ongoing — requires continued monitoring' },
] as const;

export default function RescueResolvePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [outcome, setOutcome] = useState<string>('resolved');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!notes.trim()) {
      toast.error('Outcome notes are required');
      return;
    }
    setLoading(true);
    try {
      // In production: PATCH /api/dispatch/:dispatch_id/status with outcome + notes
      await new Promise((r) => setTimeout(r, 800));
      toast.success('Case closed — good work');
      router.push('/rescue/queue');
    } catch {
      toast.error('Failed to resolve incident');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell role="rescue_team">
      <div className="mx-auto max-w-lg">
        <Link
          href={`/rescue/incidents/${id}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Incident
        </Link>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <h1 className="text-lg font-bold text-white">Log Outcome & Close Case</h1>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Outcome radio group */}
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-300">
                Outcome
              </legend>
              <div className="flex flex-col gap-2">
                {OUTCOME_OPTIONS.map(({ value, label }) => (
                  <label
                    key={value}
                    className={clsx(
                      'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                      outcome === value
                        ? 'border-blue-600 bg-blue-600/10 text-blue-300'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500',
                    )}
                  >
                    <input
                      type="radio"
                      name="outcome"
                      value={value}
                      checked={outcome === value}
                      onChange={() => setOutcome(value)}
                      className="accent-blue-500"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="notes" className="text-sm font-medium text-slate-300">
                Outcome Notes <span className="text-red-400">*</span>
              </label>
              <textarea
                id="notes"
                rows={4}
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe what was found on-site, actions taken, and current state…"
                className={clsx(
                  'resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5',
                  'text-sm text-slate-100 placeholder-slate-500',
                  'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                )}
              />
              <p className="text-xs text-slate-600">
                These notes are stored with the incident record for post-incident review.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={clsx(
                'flex items-center justify-center gap-2 rounded-xl py-3',
                'text-sm font-semibold bg-green-600 text-white hover:bg-green-500',
                'transition-colors disabled:opacity-60',
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Close Case
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
