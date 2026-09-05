'use client';

import type { CSSProperties } from 'react';
import { useScopedTheme } from '../../lib/scoped-theme';
import { injectStyles } from '../../styles';
import type { SlyxUpTheme } from '../../theme';

export interface PlanCardPlan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  trialDays: number | null;
  features: string[] | null;
  isPopular: boolean;
}

export interface PlanCardProps {
  plan: PlanCardPlan;
  /** Renders the disabled current-plan state instead of the CTA. */
  current?: boolean;
  currentLabel?: string;
  ctaLabel?: string;
  popularBadgeText?: string;
  onSelect?: (plan: PlanCardPlan) => void;
  loading?: boolean;
  /** Per-component theme (accent, mode, radius…) — scoped, never global. */
  theme?: SlyxUpTheme;
  style?: CSSProperties;
  className?: string;
}

/** Single pricing card — use standalone or inside PricingTable. */
export function PlanCard({
  plan,
  current = false,
  currentLabel = 'Current plan',
  ctaLabel = 'Get started',
  popularBadgeText = 'POPULAR',
  onSelect,
  loading,
  theme,
  style,
  className,
}: PlanCardProps) {
  injectStyles();
  const ref = useScopedTheme<HTMLDivElement>(theme);
  return (
    <div
      ref={ref}
      className={`slx-card slx-card-hover${plan.isPopular && !current ? ' slx-card-featured' : ''} ${className ?? ''}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {plan.isPopular && !current && (
        <span className="slx-badge-float">{popularBadgeText}</span>
      )}
      {current && <span className="slx-badge-current">{currentLabel}</span>}
      <h3 style={{ fontSize: 15, fontWeight: 550, color: 'var(--slx-muted)' }}>
        {plan.name}
      </h3>
      <div style={{ margin: '8px 0 2px' }}>
        <span className="slx-price">${(plan.amount / 100).toFixed(0)}</span>
        <span style={{ fontSize: 14, color: 'var(--slx-muted)' }}>
          /{plan.interval}
        </span>
      </div>
      {plan.trialDays ? (
        <p
          style={{
            fontSize: 12,
            color: 'var(--slx-accent)',
            marginBottom: 4,
          }}
        >
          {plan.trialDays} day free trial
        </p>
      ) : (
        <p style={{ fontSize: 12, color: 'transparent', marginBottom: 4 }}>
          &nbsp;
        </p>
      )}
      <ul style={{ listStyle: 'none', margin: '14px 0 22px', flex: 1 }}>
        {((plan.features ?? []) as string[]).map((f: string) => (
          <li
            key={f}
            style={{
              fontSize: 13.5,
              color: 'var(--slx-ink)',
              padding: '5px 0 5px 24px',
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: 0,
                color: '#34d399',
                fontWeight: 700,
              }}
            >
              &#10003;
            </span>{' '}
            {f}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="slx-btn"
        onClick={() => (current ? undefined : onSelect?.(plan))}
        disabled={loading || current}
        style={current ? { opacity: 0.65, cursor: 'default' } : undefined}
      >
        {current ? currentLabel : ctaLabel}
      </button>
    </div>
  );
}
