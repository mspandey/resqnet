'use client';

/**
 * web/src/app/rescue/history/page.tsx
 * Rescue Team — dispatch history (resolved + closed incidents).
 */

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { getIncidents, type Incident } from '@/lib/api';
import Link from 'next/link';
import { Loader2, MapPin, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function RescueHistoryPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getIncidents({ status: 'resolved', limit: 100 });
        setIncidents(data);
      } catch {
        toast.error('Failed to load history');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AppShell role="rescue_team">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Dispatch History</h1>
          <p className="text-sm text-slate-400">{incidents.length} completed dispatch{incidents.length !== 1 ? 'es' : ''}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : incidents.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-16 text-center text-slate-500 text-sm">
            No resolved incidents yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full text-sm" aria-label="Dispatch history">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-medium text-slate-500">
                  <th className="px-4 py-2 text-left">Incident</th>
                  <th className="px-4 py-2 text-left">District</th>
                  <th className="px-4 py-2 text-left">Severity</th>
                  <th className="px-4 py-2 text-left">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => (
                  <tr
                    key={inc.id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/rescue/incidents/${inc.id}`}
                        className="flex items-center gap-2 font-medium text-slate-200 hover:text-blue-400 transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                        <span className="truncate max-w-[200px]">{inc.title}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {inc.district}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge tier={inc.severity_tier} compact />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {format(new Date(inc.updated_at), 'dd MMM yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
