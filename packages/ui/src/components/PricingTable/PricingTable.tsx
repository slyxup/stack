'use client';

import { useEffect, useState } from 'react';
import { injectStyles } from '../../styles';

interface Plan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  trialDays: number | null;
  features: string[] | null;
  isPopular: boolean;
}

export interface PricingTableProps {
  plans: Plan[];
  onSelect?: (plan: Plan) => void;
  loading?: boolean;
}

/** Clean pricing grid with popular badge */
export function PricingTable({ plans, onSelect, loading }: PricingTableProps) {
  injectStyles();
  if (loading) {
    return (
      <div
        className="slx-pricing"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(plans.length, 3)}, 1fr)`,
          gap: 16,
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="slx-card"
            style={{ minHeight: 320 }}
            aria-busy="true"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(plans.length, 3)}, 1fr)`,
        gap: 16,
      }}
    >
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={`slx-card${plan.isPopular ? ' slx-card-popular' : ''}`}
          style={{
            position: plan.isPopular ? 'relative' : undefined,
            borderColor: plan.isPopular ? 'var(--slx-accent)' : undefined,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {plan.isPopular && (
            <span
              style={{
                position: 'absolute',
                top: -11,
                right: 20,
                fontSize: 10.5,
                fontFamily: 'var(--slx-mono)',
                background:
                  'linear-gradient(135deg, var(--slx-accent), var(--slx-accent-2))',
                color: '#fff',
                padding: '3px 10px',
                borderRadius: 999,
              }}
            >
              POPULAR
            </span>
          )}
          <h3
            style={{ fontSize: 15, fontWeight: 550, color: 'var(--slx-muted)' }}
          >
            {plan.name}
          </h3>
          <div style={{ margin: '8px 0 2px' }}>
            <span
              style={{
                fontSize: 38,
                fontWeight: 750,
                letterSpacing: '-0.03em',
                fontFamily: 'var(--slx-display)',
              }}
            >
              ${(plan.amount / 100).toFixed(0)}
            </span>
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
            onClick={() => onSelect?.(plan)}
            disabled={loading}
          >
            Get started
          </button>
        </div>
      ))}
    </div>
  );
}
