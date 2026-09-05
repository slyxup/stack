'use client';

import type { CSSProperties } from 'react';
import { useScopedTheme } from '../../lib/scoped-theme';
import { injectStyles } from '../../styles';
import type { SlyxUpTheme } from '../../theme';

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
  /** Per-component theme (accent, mode, radius…) — scoped, never global. */
  theme?: SlyxUpTheme;
  style?: CSSProperties;
  className?: string;
}

/** Invoice history table. Renders nothing when there are no invoices. */
export function InvoicesTable({
  invoices,
  title = 'Invoices',
  theme,
  style,
  className,
}: InvoicesTableProps) {
  injectStyles();
  const ref = useScopedTheme<HTMLDivElement>(theme);
  if (invoices.length === 0) return null;
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
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background:
                      inv.status === 'paid'
                        ? 'rgba(52,211,153,.1)'
                        : inv.status === 'overdue'
                          ? 'rgba(214,69,80,.1)'
                          : 'rgba(108,108,232,.08)',
                    color:
                      inv.status === 'paid'
                        ? '#34d399'
                        : inv.status === 'overdue'
                          ? 'var(--slx-danger)'
                          : 'var(--slx-accent)',
                  }}
                >
                  {inv.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
