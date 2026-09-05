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
  /** Period start — enables the "days left" progress bar. */
  currentPeriodStart?: string | null;
  cancelAtPeriodEnd: boolean;
  /** Minor units (cents). Shows the price line when present. */
  amount?: number | null;
  currency?: string | null;
  interval?: 'month' | 'year' | string | null;
  /** Rendered under the price, e.g. "Visa •••• 4242". */
  paymentMethod?: string | null;
}

export interface CurrentPlanCardLabels {
  title?: string;
  cancel?: string;
  resume?: string;
  renews?: string;
  billed?: string;
  daysLeft?: string;
  cancelTitle?: string;
  cancelText?: string;
  emptyTitle?: string;
  emptyText?: string;
}

export interface CurrentPlanCardProps {
  /** Null = free tier / no subscription (renders the empty state). */
  subscription: CurrentPlanSubscription | null;
  onCancel?: () => void;
  onResume?: () => void;
  labels?: CurrentPlanCardLabels;
  /** Per-component theme (accent, mode, radius…) — scoped, never global. */
  theme?: SlyxUpTheme;
  style?: CSSProperties;
  className?: string;
}

const DAY_MS = 86_400_000;

function daysLeft(endIso: string | null): number | null {
  if (!endIso) return null;
  const ms = new Date(endIso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / DAY_MS));
}

function periodProgress(
  startIso: string | null | undefined,
  endIso: string | null
): number | null {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  const pct = ((Date.now() - start) / (end - start)) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}

/**
 * Rich "your plan" card — price, status, period progress, renewal meta,
 * cancel/resume actions and a scheduled-cancellation warning. Drop it
 * anywhere without mounting a full profile/portal.
 */
export function CurrentPlanCard({
  subscription,
  onCancel,
  onResume,
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

  const left = daysLeft(subscription.currentPeriodEnd);
  const progress = periodProgress(
    subscription.currentPeriodStart,
    subscription.currentPeriodEnd
  );
  const showPrice =
    typeof subscription.amount === 'number' && subscription.amount >= 0;
  const scheduled = subscription.cancelAtPeriodEnd;
  const trialing = subscription.status === 'trialing';

  return (
    <div ref={ref} className={`slx-card ${className ?? ''}`} style={style}>
      {/* Header: plan + status */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: 'var(--slx-muted)',
              margin: '0 0 4px',
            }}
          >
            {labels?.title ?? 'Current plan'}
          </p>
          <h3
            style={{
              fontSize: 22,
              fontWeight: 750,
              letterSpacing: '-0.02em',
              fontFamily: 'var(--slx-display)',
              margin: 0,
            }}
          >
            {subscription.planName ?? 'Subscription'}
          </h3>
        </div>
        <SubscriptionStatus status={subscription.status} />
      </div>

      {/* Price line */}
      {showPrice && (
        <div style={{ marginTop: 10 }}>
          <span className="slx-price" style={{ fontSize: 30 }}>
            $
            {((subscription.amount as number) / 100).toFixed(
              (subscription.amount as number) % 100 === 0 ? 0 : 2
            )}
          </span>{' '}
          <span style={{ fontSize: 13, color: 'var(--slx-muted)' }}>
            {subscription.currency ?? ''}/
            {subscription.interval === 'year' ? 'year' : 'month'}
          </span>
          {subscription.paymentMethod && (
            <p
              style={{
                fontSize: 12.5,
                color: 'var(--slx-muted)',
                margin: '4px 0 0',
              }}
            >
              {subscription.paymentMethod}
            </p>
          )}
        </div>
      )}

      {/* Period progress */}
      {progress !== null && left !== null && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              height: 6,
              borderRadius: 999,
              background: 'color-mix(in srgb, var(--slx-ink) 8%, transparent)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                borderRadius: 999,
                background:
                  'linear-gradient(90deg, var(--slx-accent), var(--slx-accent-2))',
                transition: 'width .4s ease',
              }}
            />
          </div>
          <p
            style={{
              fontSize: 12,
              color: 'var(--slx-muted)',
              margin: '6px 0 0',
            }}
          >
            {left === 0
              ? 'Renews today'
              : `${left} day${left === 1 ? '' : 's'} left in this period`}
          </p>
        </div>
      )}

      {/* Meta rows */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 24px',
          marginTop: 16,
          paddingTop: 14,
          borderTop: '1px solid var(--slx-border)',
        }}
      >
        {subscription.currentPeriodEnd && (
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                color: 'var(--slx-muted)',
                margin: '0 0 2px',
              }}
            >
              {scheduled ? 'Ends' : (labels?.renews ?? 'Renews')}
            </p>
            <p style={{ fontSize: 13.5, fontWeight: 600, margin: 0 }}>
              {formatDate(subscription.currentPeriodEnd)}
            </p>
          </div>
        )}
        {subscription.interval && (
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                color: 'var(--slx-muted)',
                margin: '0 0 2px',
              }}
            >
              {labels?.billed ?? 'Billed'}
            </p>
            <p
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                margin: 0,
                textTransform: 'capitalize',
              }}
            >
              {subscription.interval === 'year' ? 'Yearly' : 'Monthly'}
            </p>
          </div>
        )}
        {trialing && (
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                color: 'var(--slx-muted)',
                margin: '0 0 2px',
              }}
            >
              Trial
            </p>
            <p style={{ fontSize: 13.5, fontWeight: 600, margin: 0 }}>
              Convert to paid on renewal
            </p>
          </div>
        )}
      </div>

      {/* Scheduled-cancellation warning */}
      {scheduled && (
        <div
          style={{
            marginTop: 14,
            borderRadius: 'var(--slx-radius)',
            border:
              '1px solid color-mix(in srgb, var(--slx-danger) 30%, transparent)',
            background: 'color-mix(in srgb, var(--slx-danger) 7%, transparent)',
            padding: '10px 12px',
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          <strong>{labels?.cancelTitle ?? 'Cancellation scheduled'}</strong>
          <br />
          <span style={{ color: 'var(--slx-muted)' }}>
            {labels?.cancelText ??
              'You keep access until the end date above, then move to the free tier.'}
          </span>
        </div>
      )}

      {/* Actions */}
      {(onResume && scheduled) || (onCancel && !scheduled) ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {onResume && scheduled && (
            <button
              type="button"
              onClick={onResume}
              className="slx-btn"
              style={{ width: 'auto', flex: 1 }}
            >
              {labels?.resume ?? 'Resume plan'}
            </button>
          )}
          {onCancel && !scheduled && (
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
      ) : null}
    </div>
  );
}
