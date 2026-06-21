/**
 * web/src/components/ui/IncidentStatusStepper.tsx
 * Vertical stepper for the incident lifecycle.
 * Uses NAMED stages (not a % bar) per DESIGN.md §2.1 — "discrete named stages
 * set more honest expectations than a progress bar implying a known ETA."
 */

import { clsx } from 'clsx';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

const STAGES = [
  { key: 'reported', label: 'Reported' },
  { key: 'verified', label: 'Verified' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'en_route', label: 'En Route' },
  { key: 'resolved', label: 'Resolved' },
] as const;

type StageKey = (typeof STAGES)[number]['key'];

interface Props {
  currentStatus: string;
  className?: string;
}

function statusIndex(status: string): number {
  const idx = STAGES.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

export function IncidentStatusStepper({ currentStatus, className }: Props) {
  const current = statusIndex(currentStatus);

  return (
    <ol
      aria-label="Incident status stages"
      className={clsx('flex flex-col gap-0', className)}
    >
      {STAGES.map((stage, i) => {
        const done = i < current;
        const active = i === current;
        const upcoming = i > current;

        return (
          <li key={stage.key} className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex flex-col items-center">
              {done ? (
                <CheckCircle2
                  className="h-5 w-5 text-green-500 dark:text-green-400"
                  aria-hidden="true"
                />
              ) : active ? (
                <Clock
                  className="h-5 w-5 animate-pulse text-blue-500 dark:text-blue-400"
                  aria-hidden="true"
                />
              ) : (
                <Circle
                  className="h-5 w-5 text-slate-300 dark:text-slate-600"
                  aria-hidden="true"
                />
              )}
              {/* Connector line */}
              {i < STAGES.length - 1 && (
                <div
                  className={clsx(
                    'my-1 w-0.5 flex-1',
                    done
                      ? 'bg-green-400 dark:bg-green-600'
                      : 'bg-slate-200 dark:bg-slate-700',
                  )}
                  style={{ minHeight: '1.25rem' }}
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Label */}
            <span
              aria-current={active ? 'step' : undefined}
              className={clsx(
                'pt-0.5 text-sm font-medium',
                done && 'text-green-600 dark:text-green-400',
                active && 'text-blue-600 dark:text-blue-400',
                upcoming && 'text-slate-400 dark:text-slate-500',
              )}
            >
              {stage.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
