import { type FormEvent, useEffect, useState } from 'react';
import { CheckIcon, KeyholeMark } from '../../icons';
import { injectStyles } from '../../styles';
import { PasswordField } from '../PasswordField';

export interface ResetPasswordProps {
  /** Reset token (from email link ?token=...) */
  token: string;
  apiUrl?: string;
  onSuccess?: () => void;
}

/** Set a new password using the emailed reset token. */
export function ResetPassword({
  token,
  apiUrl,
  onSuccess,
}: ResetPasswordProps) {
  injectStyles();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
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
      const base = (
        apiUrl ??
        process.env.NEXT_PUBLIC_SLYXUP_API_URL ??
        'https://auth.slyxup.online'
      ).replace(/\/$/, '');
      const res = await fetch(`${base}/v1/verification/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = await res
          .json()
          .catch(() => ({ error: 'Invalid or expired link' }));
        throw new Error(data.error ?? 'Invalid or expired link');
      }
      setDone(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="slx-card">
        <div className="slx-success-icon">
          <CheckIcon />
        </div>
        <h1 className="slx-title" style={{ textAlign: 'center' }}>
          Password updated
        </h1>
        <p className="slx-subtitle" style={{ textAlign: 'center' }}>
          Your password has been changed. Use it to sign in.
        </p>
        {onSuccess && (
          <button type="button" className="slx-btn" onClick={onSuccess}>
            Continue to sign in
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`slx-card${error ? ' slx-card-error' : ''}`}>
      <div className="slx-mark">
        <KeyholeMark />
      </div>
      <h1 className="slx-title">Choose a new password</h1>
      <p className="slx-subtitle">
        Pick something strong you haven&apos;t used before.
      </p>

      {error && (
        <p className="slx-error-text" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit}>
        <div className="slx-field">
          <label className="slx-label" htmlFor="slx-reset-password">
            New password
          </label>
          <PasswordField
            id="slx-reset-password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            required
            minLength={8}
          />
        </div>
        <button className="slx-btn" type="submit" disabled={busy}>
          {busy && <span className="slx-spinner" aria-hidden="true" />}
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
