import { DEFAULT_AUTH_API_URL } from '@slyxup/core';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertIcon,
  ArrowLeftIcon,
  CheckIcon,
  ClockIcon,
  ShieldCheckIcon,
} from '../../icons';
import { injectStyles } from '../../styles';
import { PasswordField } from '../PasswordField';
import { PasswordStrength } from '../PasswordStrength';

export interface ResetPasswordProps {
  /** Reset token (from email link ?token=...) */
  token: string;
  apiUrl?: string;
  onSuccess?: () => void;
  /** Optional "Back to sign in" link under the card. */
  onBackToSignIn?: () => void;
}

const MIN_LENGTH = 8;

/** Set a new password using the emailed reset token. */
export function ResetPassword({
  token,
  apiUrl,
  onSuccess,
  onBackToSignIn,
}: ResetPasswordProps) {
  injectStyles();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run trigger: refocuses the title when the view flips to success.
  useEffect(() => {
    titleRef.current?.focus();
  }, [done]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const base = (
        apiUrl ??
        process.env.VITE_SLYXUP_API_URL ??
        DEFAULT_AUTH_API_URL
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const backLink = onBackToSignIn && (
    <div className="slx-footer-row">
      <button type="button" className="slx-back-link" onClick={onBackToSignIn}>
        <ArrowLeftIcon /> Back to sign in
      </button>
    </div>
  );

  if (done) {
    return (
      <div className="slx-card" aria-live="polite">
        <div
          className="slx-state-icon is-success is-centered"
          aria-hidden="true"
        >
          <CheckIcon />
        </div>
        <p
          className="slx-eyebrow"
          style={{
            marginLeft: 'auto',
            marginRight: 'auto',
            display: 'flex',
            width: 'fit-content',
          }}
        >
          Done
        </p>
        <h1
          className="slx-title slx-title-centered"
          ref={titleRef}
          tabIndex={-1}
        >
          Password updated
        </h1>
        <p className="slx-subtitle slx-title-centered">
          Your password has been changed. Use it to sign in from any device.
        </p>
        {onSuccess ? (
          <button type="button" className="slx-btn" onClick={onSuccess}>
            Continue to sign in
          </button>
        ) : (
          backLink
        )}
        {onSuccess && backLink}
      </div>
    );
  }

  return (
    <div className={`slx-card${error ? ' slx-card-error' : ''}`}>
      <div className="slx-state-icon" aria-hidden="true">
        <ShieldCheckIcon />
      </div>
      <p className="slx-eyebrow">Password reset</p>
      <h1 className="slx-title" ref={titleRef} tabIndex={-1}>
        Choose a new password
      </h1>
      <p className="slx-subtitle">
        Pick something strong you haven&apos;t used before.
      </p>

      {error && (
        <p className="slx-error-text" role="alert">
          <span
            style={{
              display: 'inline-flex',
              verticalAlign: '-3px',
              marginRight: 6,
            }}
            aria-hidden="true"
          >
            <AlertIcon />
          </span>
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
            minLength={MIN_LENGTH}
          />
        </div>
        {password.length > 0 && <PasswordStrength password={password} />}
        <button className="slx-btn" type="submit" disabled={busy}>
          {busy && <span className="slx-spinner" aria-hidden="true" />}
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </form>

      <div className="slx-info-box">
        <ClockIcon />
        <span>
          This reset link works once and expires in 1 hour. After updating,
          you&apos;ll be signed out everywhere else.
        </span>
      </div>
      {backLink}
    </div>
  );
}
