'use client';

import type { CSSProperties } from 'react';
import { useScopedTheme } from '../../lib/scoped-theme';
import { injectStyles } from '../../styles';
import type { SlyxUpTheme } from '../../theme';
import { PlanCard, type PlanCardPlan } from '../PlanCard/PlanCard';

export type PricingPlan = PlanCardPlan;

const PRICING_GRID_CSS = [
  '.slx-pricing-grid{display:grid;gap:16px;grid-template-columns:1fr}',
  '@media(min-width:640px){.slx-pricing-grid.slx-pricing-grid--2,.slx-pricing-grid.slx-pricing-grid--3{grid-template-columns:repeat(2,minmax(0,1fr))}}',
  '@media(min-width:1024px){.slx-pricing-grid.slx-pricing-grid--3{grid-template-columns:repeat(3,minmax(0,1fr))}}',
].join('');

export interface PricingTableProps {
  plans: PricingPlan[];
  onSelect?: (plan: PricingPlan) => void;
  loading?: boolean;
  /** Plan id treated as the user's current plan — its button renders
   *  `currentLabel` disabled instead of "Get started". Pass the active
   *  subscription's planId, or the $0 plan's id when on the free tier. */
  currentPlanId?: string | null;
  currentLabel?: string;
  ctaLabel?: string;
  /** Per-component theme (accent, mode, radius…) — scoped, never global. */
  theme?: SlyxUpTheme;
  style?: CSSProperties;
  className?: string;
}

/** Clean pricing grid with popular badge. Composes PlanCard per plan. */
export function PricingTable({
  plans,
  onSelect,
  loading,
  currentPlanId = null,
  currentLabel = 'Current plan',
  ctaLabel = 'Get started',
  theme,
  style,
  className,
}: PricingTableProps) {
  injectStyles();
  const ref = useScopedTheme<HTMLDivElement>(theme);
  // Responsive columns: 1 per row on mobile, scaling up to 3 on desktop.
  const cols = Math.min(Math.max(plans.length, 1), 3);
  const gridClass = `slx-pricing-grid slx-pricing-grid--${cols} ${className ?? ''}`;
  if (loading) {
    return (
      <>
        <style>{PRICING_GRID_CSS}</style>
        <div ref={ref} className={gridClass} style={style} aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="slx-card" style={{ minHeight: 320 }}>
              <div
                className="slx-skeleton"
                style={{ height: 18, width: '45%' }}
              />
              <div
                className="slx-skeleton"
                style={{ height: 40, width: '60%', marginTop: 14 }}
              />
              <div
                className="slx-skeleton"
                style={{ height: 12, width: '80%', marginTop: 18 }}
              />
              <div
                className="slx-skeleton"
                style={{ height: 12, width: '70%', marginTop: 10 }}
              />
              <div
                className="slx-skeleton"
                style={{ height: 12, width: '75%', marginTop: 10 }}
              />
              <div
                className="slx-skeleton"
                style={{ height: 40, marginTop: 26 }}
              />
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <style>{PRICING_GRID_CSS}</style>
      <div ref={ref} className={gridClass} style={style}>
        {plans.map((plan, i) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            current={currentPlanId != null && plan.id === currentPlanId}
            currentLabel={currentLabel}
            ctaLabel={ctaLabel}
            onSelect={onSelect}
            loading={loading}
            className={i < 3 ? `slx-rise-${i + 1}` : undefined}
          />
        ))}
      </div>
    </>
  );
}
