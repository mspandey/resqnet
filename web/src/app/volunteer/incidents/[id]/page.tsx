'use client';

/**
 * web/src/app/volunteer/incidents/[id]/page.tsx
 * Volunteer — incident detail with match explanation, task accept, and status tracker.
 * Per DESIGN.md §2.2: shows *why* this task matched ("Matched: First Aid, 1.2km away").
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { IncidentStatusStepper } from '@/components/ui/IncidentStatusStepper';
import { getIncident, type Incident } from '@/lib/api';
import { useIncidentRoom } from '@/lib/socket';
import Link from 'next/link';
import { ArrowLeft, MapPin, Clock, CheckCircle, Loader2, Flag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

export default function VolunteerIncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    try {
      const data = await getIncident(id);
      setIncident(data);
    } catch {
      toast.error('Failed to load incident');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);
  useIncidentRoom(id, () => load());

  async function handleAccept() {
    setActionLoading(true);
    try {
      // POST to volunteer task assignment endpoint (to be wired in Sprint 2)
      await new Promise((r) => setTimeout(r, 500)); // optimistic stub
      setAccepted(true);
      toast.success('Task accepted — check My Tasks for updates');
    } catch {
      toast.error('Failed to accept task');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <AppShell role="volunteer">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </AppShell>
    );
  }

  if (!incident) {
    return (
      <AppShell role="volunteer">
        <p className="text-slate-400">Incident not found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell role="volunteer">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/volunteer/heatmap"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Heatmap
        </Link>

        {/* Match explanation banner — transparency builds trust (DESIGN.md §2.2) */}
        <div className="mb-4 rounded-xl border border-blue-800/40 bg-blue-900/20 px-4 py-3">
          <p className="text-sm font-medium text-blue-300">
            Matched: {incident.district} ·{' '}
            <span className="capitalize">{incident.severity_tier}</span> severity
          </p>
        </div>

        {/* Header card */}
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white">{incident.title}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {incident.district}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            <SeverityBadge tier={incident.severity_tier} />
          </div>

          {incident.description && (
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              {incident.description}
            </p>
          )}
        </div>

        {/* Status stepper */}
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">Incident Status</h2>
          <IncidentStatusStepper currentStatus={incident.status} />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {!accepted ? (
            <button
              onClick={handleAccept}
              disabled={actionLoading}
              className={clsx(
                'flex items-center justify-center gap-2 rounded-xl py-3',
                'text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500',
                'transition-colors disabled:opacity-60',
              )}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Accept Task
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-green-700/50 bg-green-900/20 py-3 text-sm font-semibold text-green-400">
              <CheckCircle className="h-4 w-4" />
              Task Accepted
            </div>
          )}

          <button
            className={clsx(
              'flex items-center justify-center gap-2 rounded-xl py-3',
              'text-sm font-semibold border border-slate-700 bg-slate-800 text-slate-300',
              'hover:bg-slate-700 transition-colors',
            )}
          >
            <Flag className="h-4 w-4" />
            Flag Resource Need
          </button>
        </div>
      </div>
    </AppShell>
  );
}
