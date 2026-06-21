'use client';

/**
 * web/src/app/rescue/queue/page.tsx
 * Rescue Team — AI-prioritised dispatch queue.
 * Core view per DESIGN.md §2.3 and WEBFLOW.md §3.2.
 * Receives real-time updates via Socket.IO district room.
 */

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { QueueItem, type QueueItemData } from '@/components/ui/QueueItem';
import { getIncidents, createDispatch, overrideIncidentSeverity } from '@/lib/api';
import { useDistrictRoom } from '@/lib/socket';
import { getSession } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RescueQueuePage() {
  const [incidents, setIncidents] = useState<QueueItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  async function load() {
    try {
      const data = await getIncidents({ status: 'verified', limit: 50 });
      // Sort by severity score desc (AI-prioritised)
      const sorted = [...data].sort(
        (a, b) => (b.severity_score ?? 0) - (a.severity_score ?? 0),
      );
      setIncidents(sorted as QueueItemData[]);
    } catch {
      toast.error('Failed to load dispatch queue');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Live updates from district room
  useDistrictRoom('all', () => {
    load();
  });

  async function handleAccept(incidentId: string) {
    setActionId(incidentId);
    try {
      // In production the team_id comes from the logged-in user's team
      const session = getSession();
      if (!session) return;
      await createDispatch(incidentId, session.user_id); // user_id used as placeholder
      toast.success('Incident accepted — navigate to your route');
      await load();
    } catch {
      toast.error('Failed to accept incident');
    } finally {
      setActionId(null);
    }
  }

  async function handleOverride(incidentId: string) {
    // In production: open a modal to choose new tier/score
    const newScore = window.prompt(
      'Enter new severity score (0.0 – 1.0):',
      '0.5',
    );
    if (!newScore) return;
    try {
      await overrideIncidentSeverity(incidentId, 'moderate', parseFloat(newScore));
      toast.success('Severity overridden');
      await load();
    } catch {
      toast.error('Override failed');
    }
  }

  return (
    <AppShell role="rescue_team">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Dispatch Queue</h1>
            <p className="text-sm text-slate-400">
              AI-prioritised · live updates · {incidents.length} incidents
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : incidents.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-20 text-center text-slate-500">
            No verified incidents in queue
          </div>
        ) : (
          <ol className="flex flex-col gap-3">
            {incidents.map((incident) => (
              <li key={incident.id}>
                <QueueItem
                  item={incident}
                  onAccept={handleAccept}
                  onOverride={handleOverride}
                  isLoading={actionId === incident.id}
                />
              </li>
            ))}
          </ol>
        )}
      </div>
    </AppShell>
  );
}
