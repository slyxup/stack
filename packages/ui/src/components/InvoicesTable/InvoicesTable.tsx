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
  const totals = new Map<string, number>();
  for (const invoice of invoices) {
    if (invoice.status === 'paid')
      totals.set(
        invoice.currency,
        (totals.get(invoice.currency) ?? 0) + invoice.amount
      );
  }
  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(
      amount / 100
    );
  return (
    <div ref={ref} className={`slx-card ${className ?? ''}`} style={style}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
        {title}
      </h3>
      <table
        aria-label={title}
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
                {money(inv.amount, inv.currency)} {inv.currency}
              </td>
              <td style={{ padding: '8px 0' }}>
                <SubscriptionStatus status={inv.status} />
              </td>
            </tr>
          ))}
        </tbody>
        {showTotal && totals.size > 0 && (
          <tfoot>
            {Array.from(totals, ([currency, paidTotal]) => (
              <tr key={currency}>
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
                  {money(paidTotal, currency)} {currency}
                </td>
              </tr>
            ))}
          </tfoot>
        )}
      </table>
    </div>
  );
}
