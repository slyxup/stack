'use client';

import { SlyxupClient } from '@slyxup/core';
import { SlyxUpProvider, useAuth, useUser } from '@slyxup/react';
import { SignIn, SignUp, SlyxUpStyles } from '@slyxup/ui';
import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const { isLoaded, isSignedIn, client } = useAuth() as {
    isLoaded: boolean;
    isSignedIn: boolean;
    userId: string | null;
    client: SlyxupClient & { apiUrl: string; _token?: string };
  };
  const { user } = useUser() as {
    user: { email?: string | null; role?: string | null; mustChangePassword?: boolean | null } | null;
  };
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [bootstrap, setBootstrap] = useState<{ needsBootstrap: boolean; singleTenant: boolean; bootstrapEmail?: string | null } | null>(null);

  useEffect(() => {
    if (client) setGlobalClient(client as unknown as SlyxupClient);
  }, [client]);

  // Fetch bootstrap status once (tells us if this is a fresh self-host)
  useEffect(() => {
    try {
      let api = (client as unknown as { apiUrl?: string })?.apiUrl ?? process.env.NEXT_PUBLIC_SLYXUP_API_URL ?? 'https://auth.slyxup.online';
      if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && (api.includes('localhost') || api.includes('127.0.0.1'))) {
        api = 'https://auth.slyxup.online';
      }
      fetch(`${api.replace(/\/$/, '')}/v1/setup/status`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((j: unknown) => {
          const data = j as { needsBootstrap?: boolean; singleTenant?: boolean; bootstrapEmail?: string | null };
          if (typeof data.needsBootstrap === 'boolean') setBootstrap({ needsBootstrap: data.needsBootstrap, singleTenant: !!data.singleTenant, bootstrapEmail: data.bootstrapEmail ?? null });
        })
        .catch(() => {});
    } catch {}
  }, [client]);

  if (!isLoaded) {
    return (
      <div className="wrap" style={{ padding: '56px 24px 80px', maxWidth: 980, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-dim)', fontSize: 15 }}>Loading…</p>
      </div>
    );
  }

  // Fresh install — show bootstrap CTA
  if (bootstrap?.needsBootstrap) {
    return (
      <div className="wrap" style={{ padding: '56px 24px 80px', maxWidth: 980 }}>
        <h1 className="display" style={{ fontSize: 34, marginBottom: 8 }}>Setup your SlyxUp Stack</h1>
        <p className="page-sub" style={{ marginBottom: 18 }}>
          This is a fresh install — the first account becomes the owner (admin). {bootstrap.bootstrapEmail ? `Use ${bootstrap.bootstrapEmail}` : 'Pick your owner email'} and a strong password. Docs stay public; dashboard is owner-only.
        </p>
        <div
          style={{
            padding: 14,
            background: 'rgba(99,102,241,.08)',
            border: '1px solid rgba(99,102,241,.18)',
            borderRadius: 12,
            fontSize: 13.5,
            lineHeight: 1.6,
            marginBottom: 22,
          }}
        >
          <b>Self-host?</b> Set <code className="inl">BOOTSTRAP_SECRET</code> in <code className="inl">wrangler secret</code> and bootstrap via{' '}
          <code className="inl">POST /v1/setup/bootstrap</code> with <code className="inl">X-Bootstrap-Token</code>. See{' '}
          <a href="/docs/self-host" style={{ color: 'var(--accent)' }}>
            Self-Host guide
          </a>
          .
        </div>
        <div style={{ maxWidth: 420 }}>
          <SignUp social onSignInClick={() => setMode('signin')} />
          <p style={{ fontSize: 12, color: '#7c8195', marginTop: 12 }}>
            If you set <code className="inl">BOOTSTRAP_ADMIN_EMAIL</code>, use exactly that email here.
          </p>
        </div>
      </div>
    );
  }

  // Protected route: dashboard requires auth — redirect to dedicated /login (middleware also enforces server-side)
  useEffect(() => {
    if (isLoaded && !isSignedIn && !bootstrap?.needsBootstrap) {
      // Avoid redirect loop if already on login
      if (typeof window !== 'undefined' && window.location.pathname !== '/login' && window.location.pathname !== '/sign-in') {
        router.replace('/login');
      }
    }
  }, [isLoaded, isSignedIn, bootstrap, router]);

  if (!isSignedIn) {
    // In single-tenant personal mode (owner-only), hide registration completely.
    // Bootstrap already handled above; here we are not in bootstrap and singleTenant=true → login only.
    // Show brief redirecting state — middleware will also redirect server-side to /login
    if (isLoaded && !bootstrap?.needsBootstrap) {
      return (
        <div className="wrap" style={{ padding: '60px 24px', maxWidth: 720, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-dim)', marginBottom: 12 }}>Redirecting to login…</p>
          <a href="/login" style={{ color: 'var(--accent)' }}>Go to login →</a>
        </div>
      );
    }
    const single = bootstrap?.singleTenant ?? true;
    const showRegister = !single;
    return (
      <div className="wrap" style={{ padding: '56px 24px 80px', maxWidth: 980 }}>
        <h1 className="display" style={{ fontSize: 34, marginBottom: 8 }}>
          SlyxUp Dashboard
        </h1>
        <p className="page-sub" style={{ marginBottom: 28 }}>
          Sign in to manage projects. {showRegister ? 'Email + password or continue with GitHub / Google.' : 'Owner login only.'}
        </p>
        {single && (
          <div
            style={{
              padding: 12,
              background: 'rgba(245,158,11,.08)',
              border: '1px solid rgba(245,158,11,.18)',
              borderRadius: 10,
              marginBottom: 18,
              fontSize: 13,
              color: '#d1b07a',
            }}
          >
            This hosted instance is <b>private (single-tenant)</b> — only the owner can sign in here. Everyone else: please
            self-host your own stack. Docs & SDK stay public at <a href="/docs" style={{ color: 'var(--accent)' }}>/docs</a> and{' '}
            <a href="/docs/self-host" style={{ color: 'var(--accent)' }}>
              /docs/self-host
            </a>
            .
          </div>
        )}
        <div style={{ maxWidth: 420 }}>
          {mode === 'signin' ? (
            showRegister ? (
              <SignIn social onSignUpClick={() => setMode('register')} />
            ) : (
              <SignIn social />
            )
          ) : showRegister ? (
            <SignUp social onSignInClick={() => setMode('signin')} />
          ) : (
            <SignIn social />
          )}
          {!showRegister && (
            <p style={{ fontSize: 12, color: '#7c8195', marginTop: 12 }}>
              No registration on this instance. Need your own stack?{' '}
              <a href="/docs/self-host" style={{ color: 'var(--accent)' }}>
                Self-host in 3 commands
              </a>
              .
            </p>
          )}
        </div>
      </div>
    );
  }

  // Password rotation guard — flagged bootstrap defaults
  if ((user as unknown as { mustChangePassword?: boolean })?.mustChangePassword) {
    return (
      <div className="wrap" style={{ padding: '56px 24px 80px', maxWidth: 980 }}>
        <h1 className="display" style={{ fontSize: 30, marginBottom: 8 }}>Change your password</h1>
        <p className="page-sub" style={{ marginBottom: 18 }}>
          Your account was created with a default password and must be changed before using the dashboard.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget as HTMLFormElement);
            const oldPw = String(fd.get('old') ?? '');
            const nextPw = String(fd.get('next') ?? '');
            try {
              let api = (client as unknown as { apiUrl?: string })?.apiUrl ?? process.env.NEXT_PUBLIC_SLYXUP_API_URL ?? 'https://auth.slyxup.online';
              if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && (api.includes('localhost') || api.includes('127.0.0.1'))) {
                api = 'https://auth.slyxup.online';
              }
              const res = await fetch(`${api.replace(/\/$/, '')}/v1/auth/password/force-change`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user?.email, oldPassword: oldPw, newPassword: nextPw }),
              });
              const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
              if (!res.ok || !j.ok) throw new Error(j.error ?? 'Failed');
              window.location.reload();
            } catch (err) {
              alert(err instanceof Error ? err.message : 'Failed');
            }
          }}
          style={{ maxWidth: 420, display: 'grid', gap: 10 }}
        >
          <input name="old" type="password" placeholder="Current (default) password" required className="cin" />
          <input name="next" type="password" placeholder="New strong password (≥8 chars)" required className="cin" />
          <button type="submit" className="btn-primary">Update password</button>
        </form>
      </div>
    );
  }

  // Single-tenant: non-admin sees self-host notice, not the project table
  const role = (user as unknown as { role?: string })?.role;
  if (bootstrap?.singleTenant && role && role !== 'admin') {
    return (
      <div className="wrap" style={{ padding: '56px 24px 80px', maxWidth: 980 }}>
        <h1 className="display" style={{ fontSize: 30, marginBottom: 8 }}>This instance is private</h1>
        <p className="page-sub" style={{ marginBottom: 18 }}>
          You&apos;re signed in as <b>{user?.email}</b> (role: {role}), but this hosted SlyxUp instance is{' '}
          <b>single-tenant</b> — only the owner (admin) can manage projects here.
        </p>
        <div
          style={{
            padding: 16,
            background: 'rgba(99,102,241,.06)',
            border: '1px solid rgba(99,102,241,.14)',
            borderRadius: 12,
            marginBottom: 18,
          }}
        >
          <p style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 10 }}>
            Docs, SDK, and quick-start stay public on this site — no login needed:
          </p>
          <ul style={{ marginLeft: 18, fontSize: 13.5, lineHeight: 1.8 }}>
            <li>
              <a href="/docs" style={{ color: 'var(--accent)' }}>Docs home</a> — what SlyxUp is, how it works
            </li>
            <li>
              <a href="/docs/quick-start" style={{ color: 'var(--accent)' }}>Quick start</a> — publishable key + provider
            </li>
            <li>
              <a href="/docs/sdk/core" style={{ color: 'var(--accent)' }}>SDK reference</a> — core/react/nextjs/ui/cli
            </li>
          </ul>
          <p style={{ fontSize: 13.5, marginTop: 12 }}>
            To build on SlyxUp, <a href="/docs/self-host" style={{ color: 'var(--accent)' }}>self-host your own stack</a> — three commands
            and you have your own admin, D1, and keys.
          </p>
        </div>
        <button
          className="btn-secondary"
          onClick={async () => {
            try {
              await (client as unknown as { auth?: { signOut: () => Promise<unknown> } })?.auth?.signOut();
            } finally {
              window.location.href = '/docs/self-host';
            }
          }}
        >
          Self-host instead →
        </button>
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
