'use client';

import { SlyxUpProvider, useAuth, useUser, usePlans, useSubscription, useCheckout } from '@slyxup/ui';
import { SlyxUpStyles, UserButton, UserProfile, PricingTable, BillingPortal } from '@slyxup/ui';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

const PROJECT_ID = process.env.NEXT_PUBLIC_SLYXUP_PROJECT_ID || '';

interface ShortUrl {
  id: string;
  original: string;
  short: string;
  clicks: number;
  createdAt: string;
}

function generateId() {
  return Math.random().toString(36).substring(2, 8);
}

function Dashboard() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [urls, setUrls] = useState<ShortUrl[]>([]);
  const [inputUrl, setInputUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'links' | 'billing'>('links');

  // Billing hooks
  const { plans, loading: plansLoading } = usePlans(PROJECT_ID);
  const { subscription, loading: subLoading } = useSubscription(PROJECT_ID);
  const { checkout } = useCheckout();

  // Load URLs from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('shrinkr_urls');
    if (stored) setUrls(JSON.parse(stored));
  }, []);

  // Save URLs to localStorage
  useEffect(() => {
    if (urls.length > 0) localStorage.setItem('shrinkr_urls', JSON.stringify(urls));
  }, [urls]);

  const shortenUrl = useCallback(() => {
    if (!inputUrl.trim()) return;
    const id = generateId();
    const newUrl: ShortUrl = {
      id,
      original: inputUrl,
      short: `shrinkr.io/${id}`,
      clicks: 0,
      createdAt: new Date().toISOString(),
    };
    setUrls(prev => [newUrl, ...prev]);
    setInputUrl('');
  }, [inputUrl]);

  if (!isLoaded) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><p style={{ color: '#71717a' }}>Loading...</p></div>;
  }

  if (!isSignedIn) {
    router.push('/');
    return null;
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{
        padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #27272a', background: 'rgba(9,9,11,.85)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 18 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            display: 'grid', placeItems: 'center',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#fff', fontSize: 14
          }}>⚡</span>
          Shrinkr
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a href="/pricing" style={{ fontSize: 13, color: '#71717a', fontWeight: 500 }}>Pricing</a>
          <UserButton onProfileClick={() => setProfileOpen(true)} />
        </div>
      </nav>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        {/* User info */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Dashboard</h1>
          <p style={{ color: '#71717a', fontSize: 14, marginTop: 4 }}>
            Welcome, {user?.firstName || user?.email}
            {subscription?.status === 'active' && (
              <span style={{ marginLeft: 8, background: '#16a34a22', color: '#22c55e', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                Pro
              </span>
            )}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#18181b', borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {(['links', 'billing'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: activeTab === tab ? '#27272a' : 'transparent',
                color: activeTab === tab ? '#fafafa' : '#71717a',
              }}
            >
              {tab === 'links' ? '🔗 My Links' : '💳 Billing'}
            </button>
          ))}
        </div>

        {activeTab === 'links' ? (
          <LinksTab
            urls={urls}
            inputUrl={inputUrl}
            setInputUrl={setInputUrl}
            shortenUrl={shortenUrl}
            onDelete={(id) => setUrls(prev => prev.filter(u => u.id !== id))}
          />
        ) : (
          <BillingTab
            plans={plans}
            plansLoading={plansLoading}
            subscription={subscription}
            subLoading={subLoading}
            checkout={checkout}
          />
        )}
      </main>

      {profileOpen && (
        <UserProfile onClose={() => setProfileOpen(false)} onDeleted={() => router.push('/')} />
      )}
    </div>
  );
}

function LinksTab({ urls, inputUrl, setInputUrl, shortenUrl, onDelete }: {
  urls: ShortUrl[];
  inputUrl: string;
  setInputUrl: (v: string) => void;
  shortenUrl: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      {/* URL input */}
      <div style={{
        background: '#18181b', border: '1px solid #27272a', borderRadius: 16, padding: 24, marginBottom: 24
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Shorten a URL</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="url"
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && shortenUrl()}
            placeholder="https://example.com/very/long/url"
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 10,
              border: '1px solid #3f3f46', background: '#09090b', color: '#fafafa',
              fontSize: 14, outline: 'none',
            }}
          />
          <button
            onClick={shortenUrl}
            style={{
              padding: '12px 24px', borderRadius: 10, border: 'none',
              background: '#22c55e', color: '#fff', fontWeight: 600, fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Shorten
          </button>
        </div>
      </div>

      {/* URLs table */}
      {urls.length === 0 ? (
        <div style={{
          background: '#18181b', border: '1px solid #27272a', borderRadius: 16, padding: 48,
          textAlign: 'center'
        }}>
          <p style={{ color: '#52525b', fontSize: 14 }}>No links yet. Shorten your first URL above!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {urls.map(url => (
            <div
              key={url.id}
              style={{
                background: '#18181b', border: '1px solid #27272a', borderRadius: 12,
                padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#22c55e' }}>{url.short}</div>
                <div style={{ fontSize: 12, color: '#71717a', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {url.original}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginLeft: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{url.clicks}</div>
                  <div style={{ fontSize: 11, color: '#71717a' }}>clicks</div>
                </div>
                <button
                  onClick={() => onDelete(url.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: '1px solid #3f3f46',
                    background: 'transparent', color: '#71717a', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function BillingTab({ plans, plansLoading, subscription, subLoading, checkout }: {
  plans: any[];
  plansLoading: boolean;
  subscription: any;
  subLoading: boolean;
  checkout: (planId: string) => Promise<void>;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Current subscription */}
      <div style={{
        background: '#18181b', border: '1px solid #27272a', borderRadius: 16, padding: 24
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Current Plan</h2>
        {subLoading ? (
          <p style={{ color: '#71717a', fontSize: 14 }}>Loading subscription...</p>
        ) : subscription ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{subscription.planId}</span>
              <span style={{
                padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: subscription.status === 'active' ? '#16a34a22' : '#dc262622',
                color: subscription.status === 'active' ? '#22c55e' : '#ef4444',
              }}>
                {subscription.status}
              </span>
            </div>
            {subscription.currentPeriodEnd && (
              <p style={{ color: '#71717a', fontSize: 13 }}>
                Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <p style={{ color: '#71717a', fontSize: 14 }}>No active subscription. Pick a plan below to upgrade.</p>
        )}
      </div>

      {/* Plans */}
      <div style={{
        background: '#18181b', border: '1px solid #27272a', borderRadius: 16, padding: 24
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Available Plans</h2>
        {plansLoading ? (
          <p style={{ color: '#71717a', fontSize: 14 }}>Loading plans...</p>
        ) : (
          <PricingTable
            plans={plans}
            loading={plansLoading}
            onSelect={(plan) => checkout(plan.id)}
          />
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const pk = process.env.NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY;
  const projectId = process.env.NEXT_PUBLIC_SLYXUP_PROJECT_ID;
  if (!pk || !projectId) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 460 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Missing configuration</h1>
          <p style={{ color: '#71717a', marginTop: 8 }}>Set these in <code>.env.local</code>:</p>
          <pre style={{ background: '#18181b', border: '1px solid #27272a', padding: 16, borderRadius: 10, marginTop: 16, textAlign: 'left', fontSize: 13, color: '#a1a1aa' }}>
{`NEXT_PUBLIC_SLYXUP_API_URL=https://auth.slyxup.online
NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_SLYXUP_PROJECT_ID=...`}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <SlyxUpProvider publishableKey={pk} apiUrl={process.env.NEXT_PUBLIC_SLYXUP_API_URL}>
      <SlyxUpStyles />
      <Dashboard />
    </SlyxUpProvider>
  );
}
