'use client';

import type { CSSProperties } from 'react';
import { useScopedTheme } from '../../lib/scoped-theme';
import { injectStyles } from '../../styles';
import type { SlyxUpTheme } from '../../theme';
import { SubscriptionStatus } from '../SubscriptionStatus/SubscriptionStatus';

export interface CurrentPlanSubscription {
  planName?: string | null;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface CurrentPlanCardLabels {
  title?: string;
  cancel?: string;
  emptyTitle?: string;
  emptyText?: string;
}

export interface CurrentPlanCardProps {
  /** Null = free tier / no subscription (renders the empty state). */
  subscription: CurrentPlanSubscription | null;
  onCancel?: () => void;
  labels?: CurrentPlanCardLabels;
  /** Per-component theme (accent, mode, radius…) — scoped, never global. */
  theme?: SlyxUpTheme;
  style?: CSSProperties;
  className?: string;
}

/**
 * Standalone "your plan" card — drop it anywhere without mounting a full
 * profile/portal. Shows status, renewal date and cancel action.
 */
export function CurrentPlanCard({
  subscription,
  onCancel,
  labels,
  theme,
  style,
  className,
}: CurrentPlanCardProps) {
  injectStyles();
  const ref = useScopedTheme<HTMLDivElement>(theme);

  if (!subscription) {
    return (
      <div ref={ref} className={`slx-card ${className ?? ''}`} style={style}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>
          {labels?.emptyTitle ?? 'No active subscription'}
        </h3>
        <p style={{ fontSize: 13.5, color: 'var(--slx-muted)', marginTop: 6 }}>
          {labels?.emptyText ??
            "You don't have a subscription yet. Choose a plan to get started."}
        </p>
      </div>
    );
  }

  return (
    <div ref={ref} className={`slx-card ${className ?? ''}`} style={style}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>
            {labels?.title ?? 'Current plan'}
            {subscription.planName ? ` — ${subscription.planName}` : ''}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--slx-muted)', marginTop: 4 }}>
            Status: <SubscriptionStatus status={subscription.status} />
          </p>
          {subscription.currentPeriodEnd && (
            <p
              style={{
                fontSize: 12.5,
                color: 'var(--slx-muted)',
                marginTop: 4,
              }}
            >
              Renews{' '}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              {subscription.cancelAtPeriodEnd ? ' (cancels at period end)' : ''}
            </p>
          )}
        </div>
        {subscription.status !== 'canceled' &&
          !subscription.cancelAtPeriodEnd &&
          onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                fontSize: 13,
                fontWeight: 550,
                background: 'transparent',
                border: '1px solid var(--slx-border)',
                borderRadius: 'var(--slx-radius)',
                padding: '8px 14px',
                cursor: 'pointer',
                color: 'var(--slx-danger)',
              }}
            >
              {labels?.cancel ?? 'Cancel'}
            </button>
          )}
      </div>
    </div>
  );
}
