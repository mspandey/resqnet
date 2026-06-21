'use client';

/**
 * web/src/app/authority/district/[districtId]/page.tsx
 * Authority — drill-down from the command dashboard to a single district.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { IncidentStatusStepper } from '@/components/ui/IncidentStatusStepper';
import { getIncidents, type Incident } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Activity, Users, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={clsx('h-4 w-4', color)} />
        <p className="text-xs font-medium text-slate-400">{label}</p>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function AuthorityDistrictDetailPage() {
  const { districtId } = useParams<{ districtId: string }>();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const district = decodeURIComponent(districtId).replace(/-/g, ' ');

  useEffect(() => {
    async function load() {
      try {
        const data = await getIncidents({ district, limit: 50 });
        setIncidents(data);
      } catch {
        toast.error('Failed to load district data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [district]);

  const active = incidents.filter((i) => !['resolved', 'closed'].includes(i.status));
  const critical = incidents.filter((i) => i.severity_tier === 'critical');
  const resolved = incidents.filter((i) => i.status === 'resolved');

  return (
    <AppShell role="authority">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/authority/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Command Dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-xl font-bold capitalize text-white">{district} District</h1>
          <p className="text-sm text-slate-400">
            {incidents.length} total incident{incidents.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* KPI row */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Active" value={active.length} icon={Activity} color="text-amber-400" />
          <StatCard label="Critical" value={critical.length} icon={AlertTriangle} color="text-red-400" />
          <StatCard label="Resolved" value={resolved.length} icon={CheckCircle2} color="text-green-400" />
          <StatCard label="Teams" value="—" icon={Users} color="text-blue-400" />
        </div>

        {/* Incident list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : incidents.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-16 text-center text-slate-500 text-sm">
            No incidents in this district.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{inc.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDistanceToNow(new Date(inc.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <SeverityBadge tier={inc.severity_tier} compact />
                </div>
                <IncidentStatusStepper currentStatus={inc.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
