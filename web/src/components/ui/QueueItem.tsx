/**
 * web/src/components/ui/QueueItem.tsx
 * A single row in the AI-prioritised dispatch queue.
 * Shows AI score + manual override control prominently — per DESIGN.md §2.3:
 * "the override must be one tap, not buried in a menu."
 */

'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { SeverityBadge, type SeverityTier } from './SeverityBadge';
import { MapPin, Clock, Sliders } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface QueueItemData {
  id: string;
  title: string;
  district: string;
  severity_tier: SeverityTier;
  severity_score: number | null;
  status: string;
  created_at: string;
  team_name?: string;
}

interface Props {
  item: QueueItemData;
  onAccept?: (id: string) => void;
  onOverride?: (id: string) => void;
  isLoading?: boolean;
}

export function QueueItem({ item, onAccept, onOverride, isLoading }: Props) {
  const [overriding, setOverriding] = useState(false);

  const age = formatDistanceToNow(new Date(item.created_at), {
    addSuffix: true,
  });

  return (
    <article
      aria-label={`Incident: ${item.title}`}
      className={clsx(
        'group flex flex-col gap-3 rounded-xl border p-4 transition-shadow',
        'bg-white shadow-sm hover:shadow-md',
        'dark:bg-slate-900 dark:border-slate-700',
        item.severity_tier === 'critical' &&
          'border-l-4 border-l-red-500',
        item.severity_tier === 'high' &&
          'border-l-4 border-l-orange-500',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-800 dark:text-slate-100">
            {item.title}
          </h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {item.district}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {age}
            </span>
          </div>
        </div>
        <SeverityBadge tier={item.severity_tier} />
      </div>

      {/* AI Score row */}
      {item.severity_score !== null && (
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            AI Score
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {item.severity_score.toFixed(2)}
            </span>
            {/* Override button — one tap, not buried in a menu (DESIGN.md §2.3) */}
            <button
              onClick={() => {
                setOverriding(true);
                onOverride?.(item.id);
              }}
              disabled={isLoading || overriding}
              aria-label="Override AI severity"
              className={clsx(
                'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
                'border border-slate-200 bg-white text-slate-600',
                'hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700',
                'dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300',
                'transition-colors disabled:opacity-50',
              )}
            >
              <Sliders className="h-3 w-3" aria-hidden="true" />
              Override
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {onAccept && (
        <button
          onClick={() => onAccept(item.id)}
          disabled={isLoading}
          className={clsx(
            'mt-1 w-full rounded-lg py-2 text-sm font-semibold',
            'bg-blue-600 text-white hover:bg-blue-700',
            'dark:bg-blue-500 dark:hover:bg-blue-400',
            'transition-colors disabled:opacity-50',
          )}
        >
          Accept Incident
        </button>
      )}
    </article>
  );
}
