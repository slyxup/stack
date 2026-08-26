'use client';

import { useEffect, useState } from 'react';
import { injectStyles } from '../../styles';

interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}
interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue' | 'refunded';
  billedAt: string | null;
}

export interface BillingPortalProps {
  subscription: Subscription | null;
  invoices: Invoice[];
  onCancel?: () => void;
}

/** Current plan + invoices table */
export function BillingPortal({
  subscription,
  invoices,
  onCancel,
}: BillingPortalProps) {
  injectStyles();
  if (!subscription) {
    return (
      <div className="slx-card">
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>
          No active subscription
        </h3>
        <p style={{ fontSize: 13.5, color: 'var(--slx-muted)', marginTop: 6 }}>
          You don&apos;t have a subscription yet. Choose a plan to get started.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Plan card */}
      <div className="slx-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600 }}>Current plan</h3>
            <p
              style={{ fontSize: 13, color: 'var(--slx-muted)', marginTop: 4 }}
            >
              Status:{' '}
              <span
                style={{
                  fontWeight: 650,
                  color:
                    subscription.status === 'active' ||
                    subscription.status === 'trialing'
                      ? '#34d399'
                      : subscription.status === 'past_due'
                        ? 'var(--slx-danger)'
                        : 'var(--slx-muted)',
                }}
              >
                {subscription.status}
              </span>
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
                {subscription.cancelAtPeriodEnd
                  ? ' (cancels at period end)'
                  : ''}
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
                Cancel
              </button>
            )}
        </div>
      </div>

      {/* Invoices */}
      {invoices.length > 0 && (
        <div className="slx-card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
            Invoices
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
      )}
    </div>
  );
}
