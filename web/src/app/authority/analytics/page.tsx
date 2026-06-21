'use client';

/**
 * web/src/app/authority/analytics/page.tsx
 * Authority — aggregate metrics for post-incident review and trend analysis.
 * Per DESIGN.md §2.4: data transparency — includes data currency timestamp.
 */

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { getIncidents, type Incident } from '@/lib/api';
import {
  BarChart3, TrendingUp, AlertTriangle, CheckCircle2,
  Activity, Clock, Download, Loader2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { format, subDays, isAfter } from 'date-fns';
import toast from 'react-hot-toast';

type Window = '7d' | '30d' | '90d';

interface DistrictStat {
  district: string;
  total: number;
  critical: number;
  resolved: number;
  avgResolutionH: number | null;
}

const TIER_LABELS: Record<string, string> = {
  critical: 'Critical',
  high:     'High',
  medium:   'Medium',
  low:      'Low',
};

const TIER_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-green-500',
};

export default function AuthorityAnalyticsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [window, setWindow] = useState<Window>('30d');
  const [dataFetchedAt, setDataFetchedAt] = useState<Date | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getIncidents({ limit: 1000 });
        setIncidents(data);
        setDataFetchedAt(new Date());
      } catch {
        toast.error('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cutoff = subDays(new Date(), window === '7d' ? 7 : window === '30d' ? 30 : 90);
  const windowed = incidents.filter((i) => isAfter(new Date(i.created_at), cutoff));

  // Tier breakdown
  const tierCounts = ['critical', 'high', 'medium', 'low'].map((t) => ({
    tier: t,
    count: windowed.filter((i) => i.severity_tier === t).length,
  }));
  const maxTierCount = Math.max(...tierCounts.map((t) => t.count), 1);

  // District stats
  const districtMap = new Map<string, DistrictStat>();
  for (const inc of windowed) {
    const d = inc.district ?? 'Unknown';
    if (!districtMap.has(d)) {
      districtMap.set(d, { district: d, total: 0, critical: 0, resolved: 0, avgResolutionH: null });
    }
    const s = districtMap.get(d)!;
    s.total++;
    if (inc.severity_tier === 'critical') s.critical++;
    if (inc.status === 'resolved') s.resolved++;
  }
  const districtStats = [...districtMap.values()].sort((a, b) => b.total - a.total).slice(0, 10);

  const totalResolved = windowed.filter((i) => i.status === 'resolved').length;
  const resolutionPct = windowed.length > 0 ? Math.round((totalResolved / windowed.length) * 100) : 0;

  return (
    <AppShell role="authority">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Analytics</h1>
            {/* Data currency — DESIGN.md §2.4 */}
            {dataFetchedAt && (
              <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Data as of {format(dataFetchedAt, 'HH:mm, dd MMM yyyy')}
              </p>
            )}
          </div>
          <button className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-colors">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>

        {/* Window selector */}
        <div className="mb-6 flex gap-2">
          {(['7d', '30d', '90d'] as Window[]).map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                window === w
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500',
              )}
            >
              {w === '7d' ? 'Last 7 days' : w === '30d' ? 'Last 30 days' : 'Last 90 days'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Total Incidents', value: windowed.length, Icon: Activity, color: 'text-blue-400' },
                { label: 'Critical', value: windowed.filter((i) => i.severity_tier === 'critical').length, Icon: AlertTriangle, color: 'text-red-400' },
                { label: 'Resolved', value: totalResolved, Icon: CheckCircle2, color: 'text-green-400' },
                { label: 'Resolution Rate', value: `${resolutionPct}%`, Icon: TrendingUp, color: 'text-amber-400' },
              ].map(({ label, value, Icon, color }) => (
                <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className={clsx('h-4 w-4', color)} />
                    <span className="text-xs text-slate-500">{label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* Severity breakdown bar chart */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-200">Incidents by Severity Tier</h2>
              </div>
              <div className="flex flex-col gap-3">
                {tierCounts.map(({ tier, count }) => (
                  <div key={tier} className="flex items-center gap-3">
                    <span className="w-16 text-xs text-slate-400 text-right">{TIER_LABELS[tier]}</span>
                    <div className="flex-1 bg-slate-800 rounded-full h-5 overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full transition-all duration-500', TIER_COLORS[tier])}
                        style={{ width: `${(count / maxTierCount) * 100}%` }}
                        role="progressbar"
                        aria-valuenow={count}
                        aria-valuemax={maxTierCount}
                        aria-label={`${TIER_LABELS[tier]} incidents: ${count}`}
                      />
                    </div>
                    <span className="w-8 text-xs font-mono text-slate-300">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* District table */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800">
                <h2 className="text-sm font-semibold text-slate-200">Top Districts by Incident Volume</h2>
              </div>
              <table className="w-full text-sm" aria-label="District analytics">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-medium text-slate-500">
                    <th className="px-4 py-2 text-left">District</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-right">Critical</th>
                    <th className="px-4 py-2 text-right">Resolved</th>
                    <th className="px-4 py-2 text-right">Res. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {districtStats.map((s) => {
                    const rate = s.total > 0 ? Math.round((s.resolved / s.total) * 100) : 0;
                    return (
                      <tr
                        key={s.district}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-slate-200">{s.district}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-300">{s.total}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-red-400">{s.critical}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-green-400">{s.resolved}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span
                            className={clsx(
                              'font-semibold',
                              rate >= 80 ? 'text-green-400' : rate >= 50 ? 'text-amber-400' : 'text-red-400',
                            )}
                          >
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {districtStats.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-sm">
                        No data for selected window.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
