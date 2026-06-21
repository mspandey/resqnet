'use client';

/**
 * web/src/app/volunteer/heatmap/page.tsx
 * Volunteer — incident heatmap + nearby incident list.
 * Per DESIGN.md §2.2: pins colored by severity tier (not just density blobs).
 * Matching explanation shown: "Matched: First Aid, 1.2km away"
 */

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { getIncidents, type Incident } from '@/lib/api';
import { useDistrictRoom } from '@/lib/socket';
import Link from 'next/link';
import { MapPin, Loader2, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const SEVERITY_ORDER = ['critical', 'high', 'moderate', 'low', 'informational'];

export default function VolunteerHeatmapPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  async function load() {
    try {
      const data = await getIncidents({ status: 'verified', limit: 100 });
      setIncidents(
        [...data].sort(
          (a, b) =>
            SEVERITY_ORDER.indexOf(a.severity_tier) -
            SEVERITY_ORDER.indexOf(b.severity_tier),
        ),
      );
    } catch {
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useDistrictRoom('all', () => load());

  const filtered =
    filter === 'all'
      ? incidents
      : incidents.filter((i) => i.severity_tier === filter);

  return (
    <AppShell role="volunteer">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Incident Heatmap</h1>
            <p className="text-sm text-slate-400">
              Nearby verified incidents · {filtered.length} shown
            </p>
          </div>

          {/* Severity filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter by severity"
              className={clsx(
                'rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200',
                'focus:border-blue-500 focus:outline-none',
              )}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="moderate">Moderate</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Mapbox placeholder (requires NEXT_PUBLIC_MAPBOX_TOKEN) */}
        <div className="mb-6 flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900 text-slate-500 text-sm">
          <div className="text-center">
            <MapPin className="mx-auto mb-2 h-8 w-8 text-slate-600" />
            <p>Map renders here with Mapbox GL</p>
            <p className="text-xs">Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local</p>
          </div>
        </div>

        {/* Incident list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-16 text-center text-slate-500 text-sm">
            No incidents matching filter
          </div>
        ) : (
          <ol className="flex flex-col gap-3">
            {filtered.map((inc) => (
              <li key={inc.id}>
                <Link
                  href={`/volunteer/incidents/${inc.id}`}
                  className={clsx(
                    'group flex items-start justify-between gap-3 rounded-xl border p-4',
                    'bg-white/5 border-slate-800 hover:border-slate-600 transition-colors',
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-100 group-hover:text-white">
                      {inc.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {inc.district}
                      </span>
                      <span>
                        {formatDistanceToNow(new Date(inc.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    {/* Matching explanation — transparency builds trust (DESIGN.md §2.2) */}
                    <p className="mt-1 text-xs text-blue-400">
                      Matched: {inc.district} · {inc.severity_tier}
                    </p>
                  </div>
                  <SeverityBadge tier={inc.severity_tier} />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </AppShell>
  );
}
