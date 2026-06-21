/**
 * web/src/components/ui/ResQNetLogo.tsx
 * Official ResQNet brand logo component.
 *
 * Props
 * -----
 * variant   – "full"  : icon + wordmark + tagline (default, login screen)
 *           – "mark"  : icon-only mark (sidebar)
 *           – "inline": icon + wordmark, no tagline (compact header)
 * className – extra CSS classes for the outer element
 */

interface Props {
  variant?: 'full' | 'mark' | 'inline';
  className?: string;
}

export function ResQNetLogo({ variant = 'full', className = '' }: Props) {
  const Mark = () => (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* ── Background circle ── */}
      <circle cx="60" cy="60" r="60" fill="white" />

      {/* ── Red wings / chevrons (left side) ── */}
      <polygon points="10,44 42,44 34,52 10,52" fill="#CC2229" />
      <polygon points="10,56 38,56 30,64 10,64" fill="#CC2229" />
      <polygon points="10,68 34,68 26,76 10,76" fill="#CC2229" />

      {/* ── Dark navy R letterform ── */}
      {/* Vertical stem */}
      <rect x="36" y="28" width="14" height="64" rx="3" fill="#1B2A4A" />
      {/* Upper bowl of R */}
      <path
        d="M50 28 Q80 28 80 46 Q80 58 62 62 L78 92 L64 92 L50 64 L50 28 Z"
        fill="#1B2A4A"
      />
      {/* Inner bowl cutout */}
      <path
        d="M50 36 Q70 36 70 46 Q70 54 55 56 L50 56 Z"
        fill="white"
      />

      {/* ── Mountain silhouette inside bowl ── */}
      <polygon
        points="54,54 59,42 64,54"
        fill="#CC2229"
        opacity="0.9"
      />
      <polygon
        points="57,54 63,46 69,54"
        fill="#1B2A4A"
        opacity="0.7"
      />

      {/* ── Diagonal leg of R (road/path) ── */}
      <path
        d="M64 92 L78 92 L62 64 L50 64 Z"
        fill="#CC2229"
      />

      {/* ── Red cross / plus ── */}
      <rect x="42" y="70" width="6" height="16" rx="1.5" fill="#CC2229" />
      <rect x="37" y="75" width="16" height="6" rx="1.5" fill="#CC2229" />
    </svg>
  );

  if (variant === 'mark') {
    return (
      <span className={`inline-block ${className}`} aria-label="ResQNet">
        <Mark />
      </span>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`} aria-label="ResQNet — Respond. Connect. Save Lives.">
      {/* Icon mark */}
      <div className="w-24 h-24">
        <Mark />
      </div>

      {/* Wordmark */}
      <div className="mt-2 flex items-baseline leading-none select-none">
        <span
          style={{
            fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
            fontWeight: 900,
            fontSize: variant === 'inline' ? '1.4rem' : '2rem',
            color: '#1B2A4A',
            letterSpacing: '-0.02em',
          }}
        >
          resq
        </span>
        <span
          style={{
            fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
            fontWeight: 900,
            fontSize: variant === 'inline' ? '1.4rem' : '2rem',
            color: '#CC2229',
            letterSpacing: '-0.02em',
          }}
        >
          net
        </span>
      </div>

      {/* Tagline — only for 'full' variant */}
      {variant === 'full' && (
        <p
          style={{
            fontFamily: "'Arial', sans-serif",
            fontWeight: 600,
            fontSize: '0.62rem',
            letterSpacing: '0.22em',
            color: '#1B2A4A',
            marginTop: '0.35rem',
          }}
        >
          RESPOND. CONNECT. SAVE LIVES.
        </p>
      )}
    </div>
  );
}

/**
 * Compact sidebar variant — small square mark + bold text side-by-side.
 */
export function ResQNetSidebarBrand({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`} aria-label="ResQNet">
      {/* Mini mark */}
      <div className="h-9 w-9 flex-shrink-0 rounded-xl overflow-hidden shadow-sm">
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="60" cy="60" r="60" fill="white" />
          <polygon points="10,44 42,44 34,52 10,52" fill="#CC2229" />
          <polygon points="10,56 38,56 30,64 10,64" fill="#CC2229" />
          <polygon points="10,68 34,68 26,76 10,76" fill="#CC2229" />
          <rect x="36" y="28" width="14" height="64" rx="3" fill="#1B2A4A" />
          <path d="M50 28 Q80 28 80 46 Q80 58 62 62 L78 92 L64 92 L50 64 L50 28 Z" fill="#1B2A4A" />
          <path d="M50 36 Q70 36 70 46 Q70 54 55 56 L50 56 Z" fill="white" />
          <polygon points="54,54 59,42 64,54" fill="#CC2229" opacity="0.9" />
          <path d="M64 92 L78 92 L62 64 L50 64 Z" fill="#CC2229" />
          <rect x="42" y="70" width="6" height="16" rx="1.5" fill="#CC2229" />
          <rect x="37" y="75" width="16" height="6" rx="1.5" fill="#CC2229" />
        </svg>
      </div>

      {/* Wordmark */}
      <span className="leading-none select-none">
        <span style={{ fontWeight: 900, color: 'white', fontSize: '1rem', fontFamily: "'Arial Black', sans-serif" }}>
          resq
        </span>
        <span style={{ fontWeight: 900, color: '#CC2229', fontSize: '1rem', fontFamily: "'Arial Black', sans-serif" }}>
          net
        </span>
      </span>
    </div>
  );
}
