'use client';

/**
 * web/src/app/authority/resources/page.tsx
 * Authority — statewide resource inventory and availability.
 * Shows equipment categories with unit counts; links to dispatch history.
 */

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { getResources, type Resource } from '@/lib/api';
import { Package, MapPin, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  available: { label: 'Available', color: 'text-green-400', Icon: CheckCircle },
  in_use:    { label: 'In Use',    color: 'text-amber-400', Icon: Clock },
  inactive:  { label: 'Inactive',  color: 'text-slate-500', Icon: XCircle },
};

type Filter = 'all' | 'available' | 'in_use';

export default function AuthorityResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getResources();
        setResources(data);
      } catch {
        toast.error('Failed to load resources');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const visible = resources.filter((r) => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const matchesSearch =
      !search ||
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.type?.toLowerCase().includes(search.toLowerCase()) ||
      r.district?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const available = resources.filter((r) => r.status === 'available').length;
  const inUse = resources.filter((r) => r.status === 'in_use').length;

  return (
    <AppShell role="authority">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Resource Inventory</h1>
            <p className="text-sm text-slate-400">
              {available} available · {inUse} in use · {resources.length} total
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search by name, type, or district…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={clsx(
              'flex-1 min-w-48 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm',
              'text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            )}
          />
          {(['all', 'available', 'in_use'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors capitalize',
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-200',
              )}
            >
              {f === 'in_use' ? 'In Use' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-16 text-center text-slate-500 text-sm">
            No resources match the current filter.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full text-sm" aria-label="Resource inventory">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-medium text-slate-500">
                  <th className="px-4 py-2 text-left">Resource</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">District</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Updated</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.inactive;
                  const StatusIcon = cfg.Icon;
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                          <span className="font-medium text-slate-200">{r.name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 capitalize">{r.type ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {r.district ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {r.district}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('flex items-center gap-1.5', cfg.color)}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {r.updated_at
                          ? formatDistanceToNow(new Date(r.updated_at), { addSuffix: true })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
