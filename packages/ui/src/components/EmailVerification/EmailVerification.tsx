import { type FormEvent, useEffect, useState } from 'react';
import { CheckIcon, KeyholeMark } from '../../icons';

export interface EmailVerificationProps {
  /** Verification token (from email link ?token=...). If absent, shows resend form. */
  token?: string;
  apiUrl?: string;
  onSuccess?: () => void;
}

/** Verify an email with the emailed token, or request a new link. */
export function EmailVerification({
  token,
  apiUrl,
  onSuccess,
}: EmailVerificationProps) {
  const [status, setStatus] = useState<
    'verifying' | 'success' | 'error' | 'resend'
  >(token ? 'verifying' : 'resend');
  const [message, setMessage] = useState<string>('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const base = (
          apiUrl ??
          process.env.NEXT_PUBLIC_SLYXUP_API_URL ??
          'https://auth.slyxup.online'
        ).replace(/\/$/, '');
        const res = await fetch(`${base}/v1/verification/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (res.ok) {
          setStatus('success');
          setTimeout(() => onSuccess?.(), 1800);
        } else {
          const data = await res
            .json()
            .catch(() => ({ error: 'Invalid or expired link' }));
          setMessage(data.error ?? 'Invalid or expired link');
          setStatus('error');
        }
      } catch {
        if (!cancelled) {
          setMessage('Network problem. Try again.');
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, apiUrl, onSuccess]);

  async function resend(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const base = (
        apiUrl ??
        process.env.NEXT_PUBLIC_SLYXUP_API_URL ??
        'https://auth.slyxup.online'
      ).replace(/\/$/, '');
      await fetch(`${base}/v1/verification/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setMessage(
        'If that account exists, a new verification link is on its way.'
      );
    } catch {
      setMessage('Network problem. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="slx-card">
      <div className="slx-mark">
        <KeyholeMark />
      </div>

      {status === 'verifying' && (
        <>
          <h1 className="slx-title">Verifying your email…</h1>
          <p className="slx-subtitle">One moment while we confirm.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="slx-success-icon">
            <CheckIcon />
          </div>
          <h1 className="slx-title" style={{ textAlign: 'center' }}>
            Email verified
          </h1>
          <p className="slx-subtitle" style={{ textAlign: 'center' }}>
            You&apos;re all set. Redirecting…
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <h1 className="slx-title">Link didn&apos;t work</h1>
          {message && (
            <p className="slx-error-text" role="alert">
              {message}
            </p>
          )}
          <p className="slx-subtitle">Request a fresh link below.</p>
          <form onSubmit={resend}>
            <div className="slx-field">
              <label className="slx-label" htmlFor="slx-verify-email">
                Email
              </label>
              <input
                id="slx-verify-email"
                className="slx-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button className="slx-btn" type="submit" disabled={busy}>
              {busy && <span className="slx-spinner" aria-hidden="true" />}
              {busy ? 'Sending…' : 'Resend verification email'}
            </button>
          </form>
        </>
      )}

      {status === 'resend' && (
        <>
          <h1 className="slx-title">Verify your email</h1>
          <p className="slx-subtitle">
            Enter your email and we&apos;ll send a verification link.
          </p>
          {message && (
            <p className="slx-hint" style={{ marginBottom: 12 }}>
              {message}
            </p>
          )}
          <form onSubmit={resend}>
            <div className="slx-field">
              <label className="slx-label" htmlFor="slx-verify-email2">
                Email
              </label>
              <input
                id="slx-verify-email2"
                className="slx-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button className="slx-btn" type="submit" disabled={busy}>
              {busy && <span className="slx-spinner" aria-hidden="true" />}
              {busy ? 'Sending…' : 'Send verification link'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
