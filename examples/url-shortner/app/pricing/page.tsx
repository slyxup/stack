'use client';

import { SlyxUpProvider, usePlans, useCheckout } from '@slyxup/react';
import { SlyxUpStyles, PricingTable, UserButton } from '@slyxup/ui';

const PROJECT_ID = process.env.NEXT_PUBLIC_SLYXUP_PROJECT_ID || '';

function PricingPage() {
  const { plans, loading } = usePlans(PROJECT_ID);
  const { checkout } = useCheckout();

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{
        padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #27272a'
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 18 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            display: 'grid', placeItems: 'center',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#fff', fontSize: 14
          }}>⚡</span>
          Shrinkr
        </a>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a href="/dashboard" style={{ fontSize: 13, color: '#71717a', fontWeight: 500 }}>Dashboard</a>
          <UserButton />
        </div>
      </nav>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em' }}>
            Simple pricing
          </h1>
          <p style={{ color: '#71717a', fontSize: 16, marginTop: 12 }}>
            Start free. Upgrade when you need more links and analytics.
          </p>
        </div>

        <div style={{
          background: '#18181b', border: '1px solid #27272a', borderRadius: 16, padding: 32
        }}>
          <PricingTable
            plans={plans}
            loading={loading}
            onSelect={(plan) => checkout(plan.id)}
          />
        </div>
      </main>
    </div>
  );
}

export default function PricingPageRoute() {
  const pk = process.env.NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY;
  const projectId = process.env.NEXT_PUBLIC_SLYXUP_PROJECT_ID;
  if (!pk || !projectId) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 460 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Missing configuration</h1>
          <p style={{ color: '#71717a', marginTop: 8 }}>Set <code>NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY</code> and <code>NEXT_PUBLIC_SLYXUP_PROJECT_ID</code> in <code>.env.local</code></p>
        </div>
      </div>
    );
  }

  return (
    <SlyxUpProvider publishableKey={pk} apiUrl={process.env.NEXT_PUBLIC_SLYXUP_API_URL}>
      <SlyxUpStyles />
      <PricingPage />
    </SlyxUpProvider>
  );
}
