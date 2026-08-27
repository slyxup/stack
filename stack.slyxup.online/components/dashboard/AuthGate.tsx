'use client';

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  api,
  clearDev,
  getDev,
  setDev,
  validateSession,
  type Dev,
} from '../../lib/dashboard-client';
import { SITE_CSS } from '../../lib/site-css';
import { DASHBOARD_CSS } from '../../lib/dashboard-css';

const VERIFY_HINT =
  'Check your inbox for the verification link, then sign in again.';

const DevContext = createContext<Dev | null>(null);

export function useDev(): Dev {
  const dev = useContext(DevContext);
  if (!dev) {
    throw new Error('useDev must be used within AuthGate');
  }
  return dev;
}

export { DevContext };

export function AuthGate({
  children,
}: {
  children: (dev: Dev) => ReactNode;
}) {
  const [dev, setDevState] = useState<Dev | null>(null);
  const [ready, setReady] = useState(false);
  const [validating, setValidating] = useState(false);
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [verifySent, setVerifySent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = getDev();
    if (d) {
      setValidating(true);
      validateSession(d).then((ok) => {
        if (ok) {
          setDevState(d);
        } else {
          clearDev();
        }
        setValidating(false);
        setReady(true);
      });
    } else {
      setReady(true);
    }
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setVerifySent(false);
    try {
      if (mode === 'register') {
        await api<{ ok: boolean }>('/v1/auth/sign-up', null, {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setVerifySent(true);
        return;
      }
      const next = await signIn(email, password);
      setDevState(next);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Auth failed');
    } finally {
      setBusy(false);
    }
  }

  async function signIn(emailAddr: string, pwd: string) {
    const res = await api<{ ok: boolean; sessionToken: string }>(
      '/v1/auth/sign-in',
      null,
      { method: 'POST', body: JSON.stringify({ email: emailAddr, password: pwd }) }
    );
    const d: Dev = { token: res.sessionToken, email: emailAddr };
    setDev(d);
    return d;
  }

  async function resend() {
    setBusy(true);
    try {
      await api('/v1/verification/resend', null, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setVerifySent(true);
    } catch {
      /* server stays silent */
    } finally {
      setBusy(false);
    }
  }

  if (!ready || validating) {
    return (
      <>
        <style>{SITE_CSS + DASHBOARD_CSS}</style>
        <div className="wrap" style={{ padding: '56px 24px 80px', maxWidth: 980, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-dim)', fontSize: 15 }}>Loading…</p>
        </div>
      </>
    );
  }

  if (!dev) {
    return (
      <>
        <style>{SITE_CSS + DASHBOARD_CSS}</style>
        <div className="wrap" style={{ padding: '56px 24px 80px', maxWidth: 980 }}>
          <h1 className="display" style={{ fontSize: 34, marginBottom: 8 }}>
            SlyxUp Dashboard
          </h1>
          <p className="page-sub" style={{ marginBottom: 28 }}>
            Sign in with your developer account to manage projects.
          </p>
          <div className="panel" style={{ maxWidth: 400, padding: 28 }}>
            <div className="seg" style={{ display: 'flex', gap: 4, background: 'var(--primary-weak)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, marginBottom: 18 }}>
              <button
                type="button"
                className={`nav-item${mode === 'signin' ? ' on' : ''}`}
                style={{ flex: 1, justifyContent: 'center', border: 'none', background: mode === 'signin' ? 'var(--primary)' : 'transparent', color: mode === 'signin' ? 'var(--primary-text)' : 'var(--text-dim)' }}
                onClick={() => setMode('signin')}
              >
                Sign in
              </button>
              <button
                type="button"
                className="nav-item"
                style={{ flex: 1, justifyContent: 'center', border: 'none', background: mode === 'register' ? 'var(--primary)' : 'transparent', color: mode === 'register' ? 'var(--primary-text)' : 'var(--text-dim)' }}
                onClick={() => setMode('register')}
              >
                Create account
              </button>
            </div>
            {verifySent && (
              <p className="msg" style={{ marginBottom: 14 }}>
                {VERIFY_HINT}{' '}
                <button type="button" className="linkish" onClick={() => void resend()}>
                  Resend
                </button>
              </p>
            )}
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                className="cin"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="cin"
                type="password"
                required
                minLength={8}
                placeholder="Password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {err && <p className="err">{err}</p>}
              <button className="btn-primary btn-block" disabled={busy}>
                {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </form>
            <p className="hint" style={{ marginTop: 14 }}>
              Verified SlyxUp account required. Token stored locally.
            </p>
          </div>
        </div>
      </>
    );
  }

  return createElement(DevContext.Provider, { value: dev }, children(dev));
}

export function useLogout() {
  return () => {
    clearDev();
    window.location.reload();
  };
}
