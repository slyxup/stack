import { DEFAULT_AUTH_API_URL } from '@slyxup/core';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertIcon,
  ArrowLeftIcon,
  CheckIcon,
  ClockIcon,
  MailIcon,
  ShieldCheckIcon,
} from '../../icons';
import { injectStyles } from '../../styles';

export interface EmailVerificationProps {
  /** Verification token (from email link ?token=...). If absent, shows resend form. */
  token?: string;
  apiUrl?: string;
  onSuccess?: () => void;
  /** Optional "Back to sign in" link under the card. */
  onBackToSignIn?: () => void;
}

const RESEND_COOLDOWN_S = 30;

function baseUrl(apiUrl?: string): string {
  return (
    apiUrl ??
    process.env.NEXT_PUBLIC_SLYXUP_API_URL ??
    DEFAULT_AUTH_API_URL
  ).replace(/\/$/, '');
}

/** Verify an email with the emailed token, or request a new link. */
export function EmailVerification({
  token,
  apiUrl,
  onSuccess,
  onBackToSignIn,
}: EmailVerificationProps) {
  injectStyles();
  const [status, setStatus] = useState<
    'verifying' | 'success' | 'error' | 'resend'
  >(token ? 'verifying' : 'resend');
  const [message, setMessage] = useState<string>('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run trigger: refocuses the title when verification state changes.
  useEffect(() => {
    titleRef.current?.focus();
  }, [status]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${baseUrl(apiUrl)}/v1/verification/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (res.ok) {
          setStatus('success');
          setTimeout(() => onSuccess?.(), 2200);
        } else {
          const data = await res
            .json()
            .catch(() => ({ error: 'Invalid or expired link' }));
          setMessage(data.error ?? 'Invalid or expired link');
          setStatus('error');
        }
      } catch {
        if (!cancelled) {
          setMessage('Network problem. Check your connection and try again.');
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
    if (cooldown > 0) return;
    setBusy(true);
    setMessage('');
    try {
      await fetch(`${baseUrl(apiUrl)}/v1/verification/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Always reassuring — never reveal whether the account exists.
      setMessage(
        `If an account exists for ${email}, a new verification link is on its way.`
      );
      setCooldown(RESEND_COOLDOWN_S);
    } catch {
      setMessage('Network problem. Check your connection and try again.');
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

  if (status === 'verifying') {
    return (
      <div className="slx-card" aria-busy="true" aria-live="polite">
        <div className="slx-state-icon is-loading" aria-hidden="true">
          <span className="slx-spinner-lg" />
        </div>
        <span className="slx-eyebrow">Email verification</span>
        <h1 className="slx-title" ref={titleRef} tabIndex={-1}>
          Verifying your email…
        </h1>
        <p className="slx-subtitle" style={{ marginBottom: 0 }}>
          One moment while we confirm your address.
        </p>
        {backLink}
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="slx-card" aria-live="polite">
        <div
          className="slx-state-icon is-success is-centered"
          aria-hidden="true"
        >
          <CheckIcon />
        </div>
        <span
          className="slx-eyebrow"
          style={{
            marginLeft: 'auto',
            marginRight: 'auto',
            display: 'flex',
            width: 'fit-content',
          }}
        >
          Verified
        </span>
        <h1
          className="slx-title slx-title-centered"
          ref={titleRef}
          tabIndex={-1}
        >
          Email verified
        </h1>
        <p className="slx-subtitle slx-title-centered">
          You&apos;re all set — redirecting you now.
        </p>
        {onSuccess && (
          <button type="button" className="slx-btn" onClick={onSuccess}>
            Continue
          </button>
        )}
        {backLink}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="slx-card slx-card-error">
        <div className="slx-state-icon is-error" aria-hidden="true">
          <AlertIcon />
        </div>
        <span className="slx-eyebrow">Email verification</span>
        <h1 className="slx-title" ref={titleRef} tabIndex={-1}>
          That link didn&apos;t work
        </h1>
        <p className="slx-subtitle">
          Links expire after 24 hours and work only once. Request a fresh one
          below.
        </p>
        {message && (
          <p className="slx-error-text" role="alert">
            {message}
          </p>
        )}
        <form onSubmit={resend}>
          <div className="slx-field">
            <label className="slx-label" htmlFor="slx-verify-email">
              Email address
            </label>
            <input
              id="slx-verify-email"
              className="slx-input"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            className="slx-btn"
            type="submit"
            disabled={busy || cooldown > 0}
          >
            {busy && <span className="slx-spinner" aria-hidden="true" />}
            {busy
              ? 'Sending…'
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : 'Resend verification email'}
          </button>
        </form>
        {backLink}
      </div>
    );
  }

  return (
    <div className="slx-card">
      <div className="slx-state-icon" aria-hidden="true">
        <MailIcon />
      </div>
      <span className="slx-eyebrow">Email verification</span>
      <h1 className="slx-title" ref={titleRef} tabIndex={-1}>
        Check your inbox
      </h1>
      <p className="slx-subtitle">
        Enter your account email and we&apos;ll send you a secure sign-in link.
      </p>
      {message && <output className="slx-success-text">{message}</output>}
      <form onSubmit={resend}>
        <div className="slx-field">
          <label className="slx-label" htmlFor="slx-verify-email2">
            Email address
          </label>
          <input
            id="slx-verify-email2"
            className="slx-input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <p className="slx-hint">We&apos;ll never share your email.</p>
        </div>
        <button
          className="slx-btn"
          type="submit"
          disabled={busy || cooldown > 0}
        >
          {busy && <span className="slx-spinner" aria-hidden="true" />}
          {busy
            ? 'Sending…'
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : 'Send verification link'}
        </button>
      </form>
      <div className="slx-info-box">
        <ShieldCheckIcon />
        <span>
          The link expires in 24 hours and works once. Can&apos;t find it? Check
          spam, then try resending.
        </span>
      </div>
      <div className="slx-info-box">
        <ClockIcon />
        <span className="slx-cooldown">
          {cooldown > 0
            ? `You can request a new link in ${cooldown}s.`
            : 'No email yet? Wait a minute, then request a new link.'}
        </span>
      </div>
      {backLink}
    </div>
  );
}
