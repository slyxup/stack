'use client';

import type { CSSProperties } from 'react';
import { useScopedTheme } from '../../lib/scoped-theme';
import { injectStyles } from '../../styles';
import type { SlyxUpTheme } from '../../theme';
import { SubscriptionStatus } from '../SubscriptionStatus/SubscriptionStatus';

export interface InvoiceRow {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue' | 'refunded';
  billedAt: string | null;
}

export interface InvoicesTableProps {
  invoices: InvoiceRow[];
  title?: string;
  /** Show a "Total paid" footer row. Default true. */
  showTotal?: boolean;
  /** Per-component theme (accent, mode, radius…) — scoped, never global. */
  theme?: SlyxUpTheme;
  style?: CSSProperties;
  className?: string;
}

/** Invoice history table with status pills + paid total. Renders nothing when empty. */
export function InvoicesTable({
  invoices,
  title = 'Invoices',
  showTotal = true,
  theme,
  style,
  className,
}: InvoicesTableProps) {
  injectStyles();
  const ref = useScopedTheme<HTMLDivElement>(theme);
  if (invoices.length === 0) return null;
  const paidTotal = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);
  const currency = invoices[0]?.currency ?? 'USD';
  return (
    <div ref={ref} className={`slx-card ${className ?? ''}`} style={style}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
        {title}
      </h3>
      <table
        style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}
      >
        <thead>
          <tr
            style={{
              borderBottom: '1px solid var(--slx-border)',
              textAlign: 'left',
            }}
          >
            <th style={{ padding: '6px 0', fontWeight: 550 }}>Date</th>
            <th style={{ padding: '6px 0', fontWeight: 550 }}>Amount</th>
            <th style={{ padding: '6px 0', fontWeight: 550 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              className="slx-row-hover"
              style={{ borderBottom: '1px solid var(--slx-border)' }}
            >
              <td style={{ padding: '8px 0' }}>
                {inv.billedAt
                  ? new Date(inv.billedAt).toLocaleDateString()
                  : '—'}
              </td>
              <td style={{ padding: '8px 0' }}>
                ${(inv.amount / 100).toFixed(2)} {inv.currency}
              </td>
              <td style={{ padding: '8px 0' }}>
                <SubscriptionStatus status={inv.status} />
              </td>
            </tr>
          ))}
        </tbody>
        {showTotal && paidTotal > 0 && (
          <tfoot>
            <tr>
              <td
                colSpan={2}
                style={{
                  padding: '10px 0 2px',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  color: 'var(--slx-muted)',
                }}
              >
                Total paid
              </td>
              <td
                style={{
                  padding: '10px 0 2px',
                  fontSize: 14,
                  fontWeight: 750,
                  fontFamily: 'var(--slx-display)',
                }}
              >
                ${(paidTotal / 100).toFixed(2)} {currency}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
