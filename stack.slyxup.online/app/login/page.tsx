'use client';

import { SlyxUpProvider, useAuth } from '@slyxup/react';
import { SignIn, SlyxUpStyles } from '@slyxup/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Nav, Footer } from '../../components/chrome';

function LoginInner() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace('/dashboard');
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="wrap" style={{ padding: '60px 24px', maxWidth: 720, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-dim)' }}>Loading…</p>
      </div>
    );
  }
  if (isSignedIn) {
    return (
      <div className="wrap" style={{ padding: '60px 24px', maxWidth: 720, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-dim)' }}>Already signed in — redirecting…</p>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ padding: '56px 24px 80px', maxWidth: 720 }}>
      <h1 className="display" style={{ fontSize: 32, marginBottom: 8 }}>Owner login</h1>
      <p className="page-sub" style={{ marginBottom: 22 }}>
        Single-tenant instance — owner only. Docs remain public. Others please <a href="/docs/self-host" style={{ color: 'var(--accent)' }}>self-host</a>.
      </p>
      <div style={{ maxWidth: 420 }}>
        <SignIn social />
        <p style={{ fontSize: 12, color: '#7c8195', marginTop: 12 }}>
          No registration here. This uses a platform cookie (<code className="inl">__Host-slyxup_session</code>) isolated from your project apps — your other platforms stay signed in when you log out here.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const pk = process.env.NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY;
  const apiUrl = process.env.NEXT_PUBLIC_SLYXUP_API_URL;
  const publishableKey = pk && !pk.includes('REPLACE') ? pk : 'pk_test_missing';
  return (
    <>
      <Nav />
      <SlyxUpProvider publishableKey={publishableKey} apiUrl={apiUrl}>
        <SlyxUpStyles />
        <LoginInner />
      </SlyxUpProvider>
      <Footer />
    </>
  );
}
