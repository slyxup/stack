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
  /** Plan id treated as the user's current plan — its button renders
   *  `currentLabel` disabled instead of "Get started". Pass the active
   *  subscription's planId, or the $0 plan's id when on the free tier. */
  currentPlanId?: string | null;
  currentLabel?: string;
}

const PRICING_GRID_CSS = [
  '.slx-pricing-grid{display:grid;gap:16px;grid-template-columns:1fr}',
  '@media(min-width:640px){.slx-pricing-grid.slx-pricing-grid--2,.slx-pricing-grid.slx-pricing-grid--3{grid-template-columns:repeat(2,minmax(0,1fr))}}',
  '@media(min-width:1024px){.slx-pricing-grid.slx-pricing-grid--3{grid-template-columns:repeat(3,minmax(0,1fr))}}',
].join('');

/** Clean pricing grid with popular badge */
export function PricingTable({
  plans,
  onSelect,
  loading,
  currentPlanId = null,
  currentLabel = 'Current plan',
}: PricingTableProps) {
  injectStyles();
  // Responsive columns: 1 per row on mobile, scaling up to 3 on desktop.
  const cols = Math.min(Math.max(plans.length, 1), 3);
  const gridClass = `slx-pricing-grid slx-pricing-grid--${cols}`;
  if (loading) {
    return (
      <>
        <style>{PRICING_GRID_CSS}</style>
        <div className={gridClass}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="slx-card"
              style={{ minHeight: 320 }}
              aria-busy="true"
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <style>{PRICING_GRID_CSS}</style>
      <div className={gridClass}>
        {plans.map((plan) => {
          const isCurrent = currentPlanId != null && plan.id === currentPlanId;
          return (
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
                      'linear-gradient(135deg, color-mix(in srgb, var(--slx-accent) 78%, #0c0c12), color-mix(in srgb, var(--slx-accent-2) 55%, #0c0c12))',
                    color: '#fff',
                    padding: '3px 10px',
                    borderRadius: 999,
                  }}
                >
                  POPULAR
                </span>
              )}
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 550,
                  color: 'var(--slx-muted)',
                }}
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
                <p
                  style={{
                    fontSize: 12,
                    color: 'transparent',
                    marginBottom: 4,
                  }}
                >
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
                onClick={() => (isCurrent ? undefined : onSelect?.(plan))}
                disabled={loading || isCurrent}
                style={
                  isCurrent ? { opacity: 0.65, cursor: 'default' } : undefined
                }
              >
                {isCurrent ? currentLabel : 'Get started'}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
