'use client';

import type { CSSProperties } from 'react';
import { useScopedTheme } from '../../lib/scoped-theme';
import { injectStyles } from '../../styles';
import type { SlyxUpTheme } from '../../theme';

export interface SubscriptionStatusProps {
  status: string;
  /** Per-component theme (accent, mode, radius…) — scoped, never global. */
  theme?: SlyxUpTheme;
  style?: CSSProperties;
  className?: string;
}

function toneFor(status: string): {
  background: string;
  color: string;
  live: boolean;
} {
  switch (status) {
    case 'active':
    case 'trialing':
      return {
        background: 'rgba(52,211,153,.12)',
        color: '#34d399',
        live: true,
      };
    case 'past_due':
      return {
        background: 'rgba(214,69,80,.1)',
        color: 'var(--slx-danger)',
        live: false,
      };
    default:
      return {
        background: 'var(--slx-accent-soft)',
        color: 'var(--slx-muted)',
        live: false,
      };
  }
}

/** Tiny status pill with a (pulsing, when live) dot. */
export function SubscriptionStatus({
  status,
  theme,
  style,
  className,
}: SubscriptionStatusProps) {
  injectStyles();
  const ref = useScopedTheme<HTMLSpanElement>(theme);
  const tone = toneFor(status);
  return (
    <span
      ref={ref}
      className={className}
      style={{
        fontSize: 11.5,
        fontWeight: 600,
        padding: '2px 10px',
        borderRadius: 999,
        background: tone.background,
        color: tone.color,
        ...style,
      }}
    >
      <span className={`slx-dot${tone.live ? ' slx-dot-live' : ''}`} />
      {status}
    </span>
  );
}
