'use client';

import { SlyxupClient } from '@slyxup/core';
import { SlyxUpProvider, useAuth, useUser } from '@slyxup/react';
import { SignIn, SignUp, SlyxUpStyles } from '@slyxup/ui';
import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { setGlobalClient } from '../../lib/dashboard-client';

// Re-export DevContext for project API helpers that still need raw token access
// But prefer useAuth().client for new code
export interface Dev {
  token: string;
  email: string;
}

const DevContext = createContext<Dev | null>(null);
export { DevContext };

export function useDev(): Dev {
  const dev = useContext(DevContext);
  if (!dev) throw new Error('useDev must be used within AuthGate');
  return dev;
}

// Keep for programmatic logout, but now uses SDK's signOut
export function useLogout() {
  const { signOut } = useAuth();
  return async () => {
    try {
      await signOut();
    } finally {
      window.location.href = '/dashboard';
    }
  };
}

function InnerGate({ children }: { children: (dev: Dev) => ReactNode }) {
  const { isLoaded, isSignedIn, client } = useAuth() as {
    isLoaded: boolean;
    isSignedIn: boolean;
    userId: string | null;
    client: SlyxupClient & { apiUrl: string; _token?: string };
  };
  const { user } = useUser() as { user: { email?: string | null } | null };
  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  useEffect(() => {
    if (client) setGlobalClient(client as unknown as SlyxupClient);
  }, [client]);

  if (!isLoaded) {
    return (
      <div className="wrap" style={{ padding: '56px 24px 80px', maxWidth: 980, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-dim)', fontSize: 15 }}>Loading…</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="wrap" style={{ padding: '56px 24px 80px', maxWidth: 980 }}>
        <h1 className="display" style={{ fontSize: 34, marginBottom: 8 }}>
          SlyxUp Dashboard
        </h1>
        <p className="page-sub" style={{ marginBottom: 28 }}>
          Sign in to manage projects. Email + password or continue with GitHub / Google.
        </p>
        <div style={{ maxWidth: 420 }}>
          {mode === 'signin' ? (
            <SignIn social onSignUpClick={() => setMode('register')} />
          ) : (
            <SignUp social onSignInClick={() => setMode('signin')} />
          )}
        </div>
      </div>
    );
  }

  // Derive Dev for legacy project APIs — SDK now handles auth via cookies,
  // but keep Dev for backwards compat (Shell shows who). Token is not needed
  // when using cookies; dashboard-client will use credentials: 'include'.
  const maybeToken =
    (client as unknown as { _token?: string })?._token ??
    (client as unknown as { storedToken?: string })?.storedToken ??
    '';
  const email = user?.email ?? '';
  const dev: Dev = { token: maybeToken, email };

  return createElement(DevContext.Provider, { value: dev }, children(dev));
}

export function AuthGate({ children }: { children: (dev: Dev) => ReactNode }) {
  const pk = process.env.NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY;
  const apiUrl = process.env.NEXT_PUBLIC_SLYXUP_API_URL;

  // If no publishable key, show setup note but still allow SDK with fallback key (like example)
  // The UI will show the "Setup:" note inside SignIn
  const publishableKey = pk && !pk.includes('REPLACE') ? pk : 'pk_test_missing';

  return (
    <SlyxUpProvider publishableKey={publishableKey} apiUrl={apiUrl}>
      <SlyxUpStyles />
      <InnerGate>{children}</InnerGate>
    </SlyxUpProvider>
  );
}
