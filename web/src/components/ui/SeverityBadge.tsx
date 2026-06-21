/**
 * web/src/components/ui/SeverityBadge.tsx
 * Displays incident severity as a color-coded badge.
 * Per DESIGN.md §3.1 and RULES.md §4 — severity never relies on color alone:
 * each tier has a distinct icon + text label + color.
 */

import { AlertTriangle, ArrowUp, Minus, Info, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

export type SeverityTier =
  | 'critical'
  | 'high'
  | 'moderate'
  | 'medium'     // DB alias for moderate
  | 'low'
  | 'informational';

interface Props {
  tier: SeverityTier;
  /** Show compact pill without text label */
  compact?: boolean;
  className?: string;
}

const CONFIGS: Record<
  SeverityTier,
  { label: string; Icon: React.ElementType; classes: string }
> = {
  critical: {
    label: 'Critical',
    Icon: AlertTriangle,
    classes:
      'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
  },
  high: {
    label: 'High',
    Icon: ArrowUp,
    classes:
      'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
  },
  moderate: {
    label: 'Moderate',
    Icon: Minus,
    classes:
      'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
  },
  medium: {
    label: 'Medium',
    Icon: Minus,
    classes:
      'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
  },
  low: {
    label: 'Low',
    Icon: Info,
    classes:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700',
  },
  informational: {
    label: 'Info',
    Icon: AlertCircle,
    classes:
      'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
  },
};

export function SeverityBadge({ tier, compact = false, className }: Props) {
  const { label, Icon, classes } = CONFIGS[tier] ?? CONFIGS.informational;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
        classes,
        className,
      )}
      aria-label={`Severity: ${label}`}
    >
      <Icon className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
      {!compact && label}
    </span>
  );
}
