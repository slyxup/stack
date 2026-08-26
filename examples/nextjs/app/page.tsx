'use client';

import { SlyxUpProvider, useAuth, useUser } from '@slyxup/react';
import { SignIn, SignUp, UserButton, SlyxUpStyles } from '@slyxup/ui';
import { useState } from 'react';

function Dashboard() {
  const { isSignedIn, isLoaded, signOut } = useAuth();
  const { user } = useUser();

  if (!isLoaded) return <div style={{ padding: 40, textAlign: 'center', color: '#6f6f7b' }}>Loading…</div>;

  if (!isSignedIn) {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <AuthCard />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div
        style={{
          background: '#fff',
          border: '1px solid #e6e6ec',
          borderRadius: 16,
          padding: 32,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Welcome back</h1>
            <p style={{ color: '#6f6f7b', fontSize: 14, marginTop: 4 }}>{user?.email} · Verified user</p>
          </div>
          <button
            onClick={() => signOut()}
            style={{
              fontSize: 13,
              fontWeight: 600,
              background: '#16161d',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '9px 14px',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            ['Projects', '3'],
            ['Team', '8 members'],
            ['Usage', '12k req'],
          ].map(([k, v]) => (
            <div key={k} style={{ background: '#f7f7fa', borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#6f6f7b' }}>{k}</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#f7f7fa', borderRadius: 12, padding: 16, fontSize: 13, lineHeight: 1.6, color: '#6f6f7b' }}>
          <strong style={{ color: '#16161d' }}>Platform demo:</strong> Ye SlyxUp Auth ka live use hai. Upar `UserButton` me avatar dropdown, `SignIn`/`SignUp` cards, `useUser()` se profile — sab isi `packages/*` se chal raha hai jo abhi `feat/api-contract` pe banaya.
        </div>
      </div>

      <p style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: '#9a9aa6' }}>
        API: {process.env.NEXT_PUBLIC_SLYXUP_API_URL ?? 'https://auth.slyxup.online'} · SlyxUp SDK v0.2.0
      </p>
    </div>
  );
}

function AuthCard() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  return (
    <div>
      {mode === 'in' ? (
        <SignIn onSignUpClick={() => setMode('up')} />
      ) : (
        <SignUp onSignInClick={() => setMode('in')} />
      )}
      <p style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: '#9a9aa6' }}>
        Demo account: <code>demo@slyxup.online / password123</code>
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <SlyxUpProvider publishableKey={process.env.NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY ?? 'pk_test_demo'} apiUrl={process.env.NEXT_PUBLIC_SLYXUP_API_URL}>
      <SlyxUpStyles />
      {/* Topbar like real SaaS */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'blur(12px)',
          background: 'rgba(247,247,250,.85)',
          borderBottom: '1px solid #e6e6ec',
        }}
      >
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                display: 'grid',
                placeItems: 'center',
                background: 'linear-gradient(135deg,#5b5bd6,#9a6cf0)',
                color: '#fff',
                fontSize: 14,
              }}
            >
              ◆
            </span>
            SlyxUp Demo
          </div>
          <UserButton />
        </div>
      </header>

      <main style={{ padding: '40px 24px' }}>
        <Dashboard />
      </main>

      <footer style={{ textAlign: 'center', padding: 32, fontSize: 12, color: '#9a9aa6' }}>
        SlyxUp Stack — open-source auth on Cloudflare Workers + D1 · <a href="https://github.com/slyxup/stack" style={{ color: '#5b5bd6' }}>github.com/slyxup/stack</a>
      </footer>
    </SlyxUpProvider>
  );
}
