'use client';

/**
 * web/src/app/volunteer/tasks/active/page.tsx
 * Volunteer — list of currently accepted active tasks.
 */

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { IncidentStatusStepper } from '@/components/ui/IncidentStatusStepper';
import { getIncidents, type Incident } from '@/lib/api';
import Link from 'next/link';
import { Loader2, MapPin, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

export default function VolunteerActiveTasksPage() {
  const [tasks, setTasks] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // In production: fetch /api/volunteer/tasks (filtered to this user's assignments)
        // For now we show dispatched incidents as a proxy
        const data = await getIncidents({ status: 'dispatched', limit: 20 });
        setTasks(data);
      } catch {
        toast.error('Failed to load tasks');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AppShell role="volunteer">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">My Active Tasks</h1>
          <p className="text-sm text-slate-400">{tasks.length} task{tasks.length !== 1 ? 's' : ''} in progress</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-16 text-center">
            <p className="text-slate-500 text-sm">No active tasks.</p>
            <Link
              href="/volunteer/heatmap"
              className="mt-3 inline-block text-sm text-blue-400 hover:text-blue-300"
            >
              Browse incidents on the heatmap →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/volunteer/incidents/${task.id}`}
                className={clsx(
                  'group rounded-xl border border-slate-800 bg-slate-900 p-5',
                  'hover:border-slate-600 transition-colors',
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                      {task.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {task.district}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <SeverityBadge tier={task.severity_tier} />
                </div>
                <IncidentStatusStepper currentStatus={task.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
