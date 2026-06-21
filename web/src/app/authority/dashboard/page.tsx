'use client';

/**
 * web/src/app/authority/dashboard/page.tsx
 * Government Authority — Command Dashboard.
 * Per DESIGN.md §2.4: "macro view first, drill-down to individual incidents."
 * Shows district-level aggregate (counts by severity, resource %) first.
 */

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { getIncidents, getResources, type Incident } from '@/lib/api';
import { useDistrictRoom } from '@/lib/socket';
import Link from 'next/link';
import { AlertTriangle, Users, Package, TrendingUp, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

// Aggregate incidents by district
function aggregateByDistrict(incidents: Incident[]) {
  const map: Record<
    string,
    { district: string; total: number; critical: number; high: number; active: number }
  > = {};
  for (const inc of incidents) {
    if (!map[inc.district]) {
      map[inc.district] = {
        district: inc.district,
        total: 0,
        critical: 0,
        high: 0,
        active: 0,
      };
    }
    map[inc.district].total++;
    if (inc.severity_tier === 'critical') map[inc.district].critical++;
    if (inc.severity_tier === 'high') map[inc.district].high++;
    if (!['resolved', 'closed'].includes(inc.status)) map[inc.district].active++;
  }
  return Object.values(map).sort((a, b) => b.critical - a.critical || b.high - a.high);
}

export default function AuthorityDashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await getIncidents({ limit: 200 });
      setIncidents(data);
    } catch {
      toast.error('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // District-level live updates
  useDistrictRoom('all', () => load());

  const districts = aggregateByDistrict(incidents);
  const totalCritical = incidents.filter((i) => i.severity_tier === 'critical').length;
  const totalActive = incidents.filter((i) => !['resolved', 'closed'].includes(i.status)).length;

  return (
    <AppShell role="authority">
      <div className="mx-auto max-w-5xl">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Command Dashboard</h1>
          <p className="text-sm text-slate-400">
            District-level aggregate · live updates
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            {/* Summary KPI cards */}
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                {
                  label: 'Active Incidents',
                  value: totalActive,
                  Icon: AlertTriangle,
                  color: 'text-orange-400',
                },
                {
                  label: 'Critical',
                  value: totalCritical,
                  Icon: AlertTriangle,
                  color: 'text-red-400',
                },
                {
                  label: 'Districts Affected',
                  value: districts.length,
                  Icon: TrendingUp,
                  color: 'text-blue-400',
                },
                {
                  label: 'Total Incidents',
                  value: incidents.length,
                  Icon: Package,
                  color: 'text-slate-400',
                },
              ].map(({ label, value, Icon, color }) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className={clsx('mb-1 flex items-center gap-1.5 text-xs font-medium', color)}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </div>
                  <div className="text-2xl font-bold text-white">{value}</div>
                </div>
              ))}
            </div>

            {/* District table — drill down to /authority/district/:id */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-200">
                  Districts ({districts.length})
                </h2>
              </div>
              {districts.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  No incidents to display
                </p>
              ) : (
                <table className="w-full text-sm" aria-label="District summary">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-medium text-slate-500">
                      <th className="px-4 py-2 text-left">District</th>
                      <th className="px-4 py-2 text-right">Critical</th>
                      <th className="px-4 py-2 text-right">High</th>
                      <th className="px-4 py-2 text-right">Active</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {districts.map((d) => (
                      <tr
                        key={d.district}
                        className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-slate-100">
                          {d.district}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {d.critical > 0 ? (
                            <SeverityBadge tier="critical" compact />
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-orange-400">
                          {d.high || '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {d.active}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400">
                          {d.total}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/authority/district/${encodeURIComponent(d.district)}`}
                            className="text-xs font-medium text-blue-400 hover:text-blue-300"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
