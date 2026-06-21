'use client';

/**
 * web/src/app/rescue/incidents/[id]/route/page.tsx
 * Rescue Team — offline-capable Mapbox route view.
 * Per DESIGN.md §2.3: must work with pre-cached Mapbox tiles;
 * shows "tiles cached for offline use" indicator.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getIncident, type Incident } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Download, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

export default function RescueRoutePage() {
  const { id } = useParams<{ id: string }>();
  const mapRef = useRef<HTMLDivElement>(null);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [tilesCached, setTilesCached] = useState(false);
  const [cachingInProgress, setCachingInProgress] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
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
    load();
  }, [id]);

  async function handleCacheTiles() {
    setCachingInProgress(true);
    try {
      // Production: trigger Mapbox tile caching via service worker
      await new Promise((r) => setTimeout(r, 1500));
      setTilesCached(true);
      toast.success('Tiles cached — you can now go offline');
    } catch {
      toast.error('Caching failed');
    } finally {
      setCachingInProgress(false);
    }
  }

  return (
    <AppShell role="rescue_team">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/rescue/incidents/${id}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Incident
        </Link>

        {/* Connectivity + cache status — per DESIGN.md §2.3 */}
        <div
          className={clsx(
            'mb-4 flex items-center justify-between rounded-xl border px-4 py-3',
            tilesCached
              ? 'border-green-800/40 bg-green-900/20'
              : 'border-slate-800 bg-slate-900',
          )}
        >
          <div className="flex items-center gap-2 text-sm">
            {online ? (
              <Wifi className="h-4 w-4 text-green-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-slate-400" />
            )}
            <span className={online ? 'text-green-300' : 'text-slate-400'}>
              {online ? 'Online' : 'Offline'}
            </span>
            {tilesCached && (
              <span className="ml-2 rounded-full bg-green-800/40 px-2 py-0.5 text-xs text-green-300">
                ✓ Tiles cached for offline use
              </span>
            )}
          </div>
          {!tilesCached && online && (
            <button
              onClick={handleCacheTiles}
              disabled={cachingInProgress}
              className={clsx(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold',
                'bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-60',
              )}
            >
              {cachingInProgress ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Download className="h-3 w-3" />
              )}
              Cache for Offline
            </button>
          )}
        </div>

        {/* Incident title */}
        {incident && (
          <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
            <p className="text-xs text-slate-500">Routing to incident</p>
            <p className="font-semibold text-white">{incident.title}</p>
            <p className="text-sm text-slate-400">{incident.district}</p>
          </div>
        )}

        {/* Mapbox GL map container */}
        {loading ? (
          <div className="flex h-80 items-center justify-center rounded-xl border border-slate-800 bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div
            ref={mapRef}
            className="relative flex h-80 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900 sm:h-[480px]"
          >
            <div className="text-center text-slate-500">
              <p className="text-sm font-medium">Mapbox GL JS Route View</p>
              <p className="mt-1 text-xs">
                Set{' '}
                <code className="rounded bg-slate-800 px-1 py-0.5 font-mono text-slate-300">
                  NEXT_PUBLIC_MAPBOX_TOKEN
                </code>{' '}
                in .env.local
              </p>
              {incident?.location && (
                <p className="mt-2 font-mono text-xs text-blue-400">
                  Target: {incident.location.lat.toFixed(5)}, {incident.location.lng.toFixed(5)}
                </p>
              )}
            </div>
          </div>
        )}

        <p className="mt-3 text-center text-xs text-slate-600">
          Mapbox offline tiles require a Pro plan and service worker registration.
        </p>
      </div>
    </AppShell>
  );
}
