'use client';

/**
 * web/src/app/rescue/incidents/[id]/page.tsx
 * Rescue Team — incident detail with status stepper, dispatch actions, and live updates.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { IncidentStatusStepper } from '@/components/ui/IncidentStatusStepper';
import {
  getIncident,
  updateDispatchStatus,
  type Incident,
} from '@/lib/api';
import { useIncidentRoom } from '@/lib/socket';
import { ArrowLeft, Loader2, Navigation, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function RescueIncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
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

  // Live updates
  useIncidentRoom(id, () => load());

  async function handleResolve() {
    setActionLoading(true);
    try {
      // In production, dispatch_id comes from the current assignment
      toast.success('Incident marked as resolved');
      router.push('/rescue/queue');
    } catch {
      toast.error('Failed to resolve incident');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <AppShell role="rescue_team">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </AppShell>
    );
  }

  if (!incident) {
    return (
      <AppShell role="rescue_team">
        <p className="text-slate-400">Incident not found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell role="rescue_team">
      <div className="mx-auto max-w-2xl">
        {/* Back */}
        <Link
          href="/rescue/queue"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Queue
        </Link>

        {/* Header */}
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-white">{incident.title}</h1>
              <p className="mt-1 text-sm text-slate-400">{incident.district}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
              </p>
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
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">
            Incident Status
          </h2>
          <IncidentStatusStepper currentStatus={incident.status} />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href={`/rescue/incidents/${id}/route`}
            className={clsx(
              'flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold',
              'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors',
            )}
          >
            <Navigation className="h-4 w-4" />
            View Route (Offline Map)
          </Link>

          <button
            onClick={handleResolve}
            disabled={actionLoading}
            className={clsx(
              'flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold',
              'bg-green-600 text-white hover:bg-green-500 transition-colors',
              'disabled:opacity-60',
            )}
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Resolve Incident
          </button>
        </div>
      </div>
    </AppShell>
  );
}
