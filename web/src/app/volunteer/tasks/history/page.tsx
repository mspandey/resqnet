'use client';

/**
 * web/src/app/volunteer/tasks/history/page.tsx
 * Volunteer — completed task history.
 */

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { getIncidents, type Incident } from '@/lib/api';
import Link from 'next/link';
import { Loader2, MapPin, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

export default function VolunteerTaskHistoryPage() {
  const [tasks, setTasks] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getIncidents({ status: 'resolved', limit: 50 });
        setTasks(data);
      } catch {
        toast.error('Failed to load history');
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
          <h1 className="text-xl font-bold text-white">Task History</h1>
          <p className="text-sm text-slate-400">{tasks.length} completed task{tasks.length !== 1 ? 's' : ''}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-16 text-center text-slate-500 text-sm">
            No completed tasks yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <ul className="divide-y divide-slate-800">
              {tasks.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/volunteer/incidents/${task.id}`}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-slate-800/40 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">
                        {task.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {task.district}
                        </span>
                        <span>
                          {format(new Date(task.updated_at), 'dd MMM yyyy')}
                        </span>
                      </div>
                    </div>
                    <SeverityBadge tier={task.severity_tier} compact />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}
