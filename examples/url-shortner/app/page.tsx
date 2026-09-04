'use client';

import { SlyxUpProvider, useAuth, useUser } from '@slyxup/ui';
import { SignIn, SignUp, SlyxUpStyles, UserButton } from '@slyxup/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

function Hero() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <p style={{ color: '#71717a' }}>Loading...</p>
      </div>
    );
  }

  if (isSignedIn) {
    return <SignedInHero />;
  }

  return <SignedOutHero />;
}

function SignedOutHero() {
  const [mode, setMode] = useState<'in' | 'up'>('in');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <nav style={{ padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 20 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 10,
            display: 'grid', placeItems: 'center',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#fff', fontSize: 16
          }}>
            ⚡
          </span>
          Shrinkr
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="/pricing" style={{ fontSize: 14, color: '#a1a1aa', fontWeight: 500 }}>Pricing</a>
          <UserButton />
        </div>
      </nav>

      {/* Hero */}
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '0 24px' }}>
        <div style={{ maxWidth: 460, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1 }}>
              Shorten links.<br />
              <span style={{ color: '#22c55e' }}>Track everything.</span>
            </h1>
            <p style={{ color: '#71717a', fontSize: 16, marginTop: 16, lineHeight: 1.6 }}>
              Create short URLs, track clicks, and manage your links — all in one place.
              Auth &amp; billing powered by SlyxUp.
            </p>
          </div>

          {/* Auth Card */}
          <div style={{
            background: '#18181b', border: '1px solid #27272a', borderRadius: 16, padding: 32
          }}>
            {mode === 'in' ? (
              <SignIn
                social
                onSuccess={() => window.location.href = '/dashboard'}
                onSignUpClick={() => setMode('up')}
              />
            ) : (
              <SignUp
                social
                onSuccess={() => window.location.href = '/dashboard'}
                onSignInClick={() => setMode('in')}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: 24, fontSize: 12, color: '#52525b' }}>
        Powered by <a href="https://github.com/slyxup/stack" style={{ color: '#22c55e' }}>SlyxUp Stack</a> — open-source auth on Cloudflare
      </footer>
    </div>
  );
}

function SignedInHero() {
  const router = useRouter();
  // Redirect to dashboard if signed in
  if (typeof window !== 'undefined') {
    router.push('/dashboard');
  }
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <p style={{ color: '#71717a' }}>Redirecting to dashboard...</p>
    </div>
  );
}

export default function Page() {
  const pk = process.env.NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY;
  if (!pk) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 460 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Missing configuration</h1>
          <p style={{ color: '#71717a', marginTop: 8 }}>Set <code>NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY</code> in <code>.env.local</code></p>
        </div>
      </div>
    );
  }

  return (
    <SlyxUpProvider publishableKey={pk} apiUrl={process.env.NEXT_PUBLIC_SLYXUP_API_URL}>
      <SlyxUpStyles />
      <Hero />
    </SlyxUpProvider>
  );
}
