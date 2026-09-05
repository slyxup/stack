import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import React from 'react';

import { PlanCard } from '../src/components/PlanCard/PlanCard';
import { CurrentPlanCard } from '../src/components/CurrentPlanCard/CurrentPlanCard';
import { InvoicesTable } from '../src/components/InvoicesTable/InvoicesTable';
import { SubscriptionStatus } from '../src/components/SubscriptionStatus/SubscriptionStatus';
import { PricingTable } from '../src/components/PricingTable/PricingTable';
import { BillingPortal } from '../src/components/BillingPortal/BillingPortal';
import { CheckoutButton } from '../src/components/CheckoutButton/CheckoutButton';
import { useSubscriptions } from '../src/react/hooks/useBilling';

const plan = {
  id: 'plan_free',
  name: 'Starter',
  amount: 0,
  currency: 'USD',
  interval: 'month' as const,
  trialDays: null,
  features: ['1 project'],
  isPopular: false,
};

describe('PlanCard', () => {
  it('renders plan name and CTA', () => {
    render(<PlanCard plan={plan} />);
    expect(screen.getByText('Starter')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /get started/i })
    ).toBeTruthy();
  });

  it('renders current label disabled when current', () => {
    render(<PlanCard plan={plan} current currentLabel="Current plan" />);
    const btn = screen.getByRole('button', { name: /current plan/i });
    expect(btn).toBeTruthy();
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('applies scoped theme without leaking globally', () => {
    const { container } = render(
      <PlanCard plan={plan} theme={{ accent: 'rose' }} />
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('slyxup-root');
    expect(root.getAttribute('data-slyxup-accent')).toBe('rose');
    expect(document.documentElement.getAttribute('data-slyxup-accent')).toBeNull();
  });
});

describe('CurrentPlanCard', () => {
  it('renders empty state when no subscription', () => {
    render(<CurrentPlanCard subscription={null} />);
    expect(screen.getByText(/no active subscription/i)).toBeTruthy();
  });

  it('renders plan name, status and renew date', () => {
    render(
      <CurrentPlanCard
        subscription={{
          planName: 'Scale',
          status: 'active',
          currentPeriodEnd: '2026-10-01T00:00:00.000Z',
          cancelAtPeriodEnd: false,
        }}
      />
    );
    expect(screen.getByText(/scale/i)).toBeTruthy();
    expect(screen.getByText('active')).toBeTruthy();
  });

  it('hides cancel when cancellation is scheduled', () => {
    render(
      <CurrentPlanCard
        subscription={{
          status: 'active',
          currentPeriodEnd: null,
          cancelAtPeriodEnd: true,
        }}
        onCancel={() => {}}
      />
    );
    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull();
  });
});

describe('InvoicesTable', () => {
  it('renders nothing when empty', () => {
    const { container } = render(<InvoicesTable invoices={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders invoice rows', () => {
    render(
      <InvoicesTable
        invoices={[
          {
            id: 'in_1',
            amount: 1900,
            currency: 'USD',
            status: 'paid',
            billedAt: '2026-09-01T00:00:00.000Z',
          },
        ]}
      />
    );
    expect(screen.getByText(/invoices/i)).toBeTruthy();
    expect(screen.getByText('paid')).toBeTruthy();
  });
});

describe('SubscriptionStatus', () => {
  it('renders status text', () => {
    render(<SubscriptionStatus status="trialing" />);
    expect(screen.getByText('trialing')).toBeTruthy();
  });
});

describe('PricingTable', () => {
  it('marks the current plan without CTA', () => {
    render(<PricingTable plans={[plan]} currentPlanId="plan_free" />);
    const btn = screen.getByRole('button', { name: /current plan/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('BillingPortal', () => {  it('shows empty state and no invoices', () => {
    render(<BillingPortal subscription={null} invoices={[]} />);
    expect(screen.getByText(/no active subscription/i)).toBeTruthy();
  });

  it('shows active subscription', () => {
    render(
      <BillingPortal
        subscription={{
          id: 'sub_1',
          status: 'active',
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        }}
        invoices={[]}
      />
    );
    expect(screen.getByText('active')).toBeTruthy();
  });
});

describe('CheckoutButton', () => {
  it('renders default and custom labels', () => {
    const { unmount } = render(<CheckoutButton planId="plan_1" />);
    expect(
      screen.getByRole('button', { name: /subscribe/i })
    ).toBeTruthy();
    unmount();
    render(<CheckoutButton planId="plan_1">Buy Pro</CheckoutButton>);
    expect(screen.getByRole('button', { name: /buy pro/i })).toBeTruthy();
  });

  it('respects disabled', () => {
    render(
      <CheckoutButton planId="plan_1" disabled>
        Buy
      </CheckoutButton>
    );
    expect(
      (screen.getByRole('button', { name: /buy/i }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });
});

describe('useSubscriptions', () => {
  it('returns empty list when billing is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      () => Promise.reject(new Error('offline')) as Promise<Response>
    );
    try {
      const { result } = renderHook(() => useSubscriptions());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.subscriptions).toEqual([]);
      expect(typeof result.current.error).toBe('string');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
