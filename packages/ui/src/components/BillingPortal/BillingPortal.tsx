'use client';

import type { CSSProperties } from 'react';
import { injectStyles } from '../../styles';
import type { SlyxUpTheme } from '../../theme';
import {
  CurrentPlanCard,
  type CurrentPlanSubscription,
} from '../CurrentPlanCard/CurrentPlanCard';
import { type InvoiceRow, InvoicesTable } from '../InvoicesTable/InvoicesTable';

export interface PortalSubscription extends CurrentPlanSubscription {
  id: string;
  planId?: string;
}

export interface BillingPortalProps {
  subscription: PortalSubscription | null;
  invoices: InvoiceRow[];
  onCancel?: () => void;
  /** Per-component theme (accent, mode, radius…) — scoped, never global. */
  theme?: SlyxUpTheme;
  style?: CSSProperties;
  className?: string;
}

/**
 * Billing section without a full profile: current plan + invoices.
 * Composes CurrentPlanCard + InvoicesTable — use those directly for
 * finer-grained layouts.
 */
export function BillingPortal({
  subscription,
  invoices,
  onCancel,
  theme,
  style,
  className,
}: BillingPortalProps) {
  injectStyles();
  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column', gap: 18, ...style }}
    >
      <CurrentPlanCard
        subscription={subscription}
        onCancel={onCancel}
        theme={theme}
      />
      <InvoicesTable invoices={invoices} theme={theme} />
    </div>
  );
}
