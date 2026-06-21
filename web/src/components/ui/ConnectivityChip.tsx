/**
 * web/src/components/ui/ConnectivityChip.tsx
 * Persistent connectivity status chip — per DESIGN.md §3.2.
 * Uses a small, non-intrusive chip (NOT a modal) that stays visible.
 */

'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Wifi, WifiOff, RefreshCw, MessageSquare } from 'lucide-react';

type ConnState = 'online' | 'syncing' | 'offline' | 'sms';

interface Props {
  /** Override the detected state for controlled usage */
  state?: ConnState;
  /** Number of queued offline items to display */
  queueCount?: number;
}

export function ConnectivityChip({ state: controlledState, queueCount = 0 }: Props) {
  const [detected, setDetected] = useState<ConnState>('online');

  useEffect(() => {
    const update = () =>
      setDetected(navigator.onLine ? 'online' : 'offline');
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const state = controlledState ?? detected;

  const configs: Record<ConnState, { label: string; dot: string; Icon: React.ElementType }> = {
    online: {
      label: 'Online',
      dot: 'bg-green-400',
      Icon: Wifi,
    },
    syncing: {
      label: 'Syncing',
      dot: 'bg-amber-400 animate-pulse',
      Icon: RefreshCw,
    },
    offline: {
      label: queueCount > 0 ? `Offline — ${queueCount} queued` : 'Offline',
      dot: 'bg-slate-400',
      Icon: WifiOff,
    },
    sms: {
      label: 'SMS Fallback Active',
      dot: 'bg-purple-400',
      Icon: MessageSquare,
    },
  };

  const { label, dot, Icon } = configs[state];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
        'border border-slate-200 bg-white/80 shadow-sm backdrop-blur-sm',
        'dark:border-slate-700 dark:bg-slate-900/80',
        'text-xs font-medium text-slate-700 dark:text-slate-300',
      )}
    >
      <span
        className={clsx('h-2 w-2 flex-shrink-0 rounded-full', dot)}
        aria-hidden="true"
      />
      <Icon className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
