import { SlyxupClient } from '@slyxup/core';
import { type FormEvent, useEffect, useState } from 'react';
import { CheckIcon, KeyholeMark } from '../../icons';

export interface ForgotPasswordProps {
  apiUrl?: string;
  onSuccess?: () => void;
  onBackToSignIn?: () => void;
}

/** Request a password-reset email. */
export function ForgotPassword({
  apiUrl,
  onSuccess,
  onBackToSignIn,
}: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fetch(
        `${(apiUrl ?? process.env.NEXT_PUBLIC_SLYXUP_API_URL ?? 'https://auth.slyxup.online').replace(/\/$/, '')}/v1/verification/password/forgot`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }
      );
      setSent(true); // always success — never reveal account existence
      onSuccess?.();
    } catch {
      setError('Network problem. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
    void SlyxupClient; // tree-shake guard
  }

  if (sent) {
    return (
      <div className="slx-card">
        <div className="slx-success-icon">
          <CheckIcon />
        </div>
        <h1 className="slx-title" style={{ textAlign: 'center' }}>
          Check your email
        </h1>
        <p className="slx-subtitle" style={{ textAlign: 'center' }}>
          If an account exists for {email}, a reset link is on its way.
        </p>
        {onBackToSignIn && (
          <p className="slx-footer">
            <button type="button" className="slx-link" onClick={onBackToSignIn}>
              Back to sign in
            </button>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`slx-card${error ? ' slx-card-error' : ''}`}>
      <div className="slx-mark">
        <KeyholeMark />
      </div>
      <h1 className="slx-title">Reset your password</h1>
      <p className="slx-subtitle">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {error && (
        <p className="slx-error-text" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit}>
        <div className="slx-field">
          <label className="slx-label" htmlFor="slx-forgot-email">
            Email
          </label>
          <input
            id="slx-forgot-email"
            className="slx-input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button className="slx-btn" type="submit" disabled={busy}>
          {busy && <span className="slx-spinner" aria-hidden="true" />}
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      {onBackToSignIn && (
        <p className="slx-footer">
          <button type="button" className="slx-link" onClick={onBackToSignIn}>
            Back to sign in
          </button>
        </p>
      )}
    </div>
  );
}
