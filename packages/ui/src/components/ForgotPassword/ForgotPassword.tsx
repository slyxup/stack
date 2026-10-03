import { DEFAULT_AUTH_API_URL, SlyxupClient } from '@slyxup/core';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import {
  ArrowLeftIcon,
  CheckIcon,
  ClockIcon,
  MailIcon,
  SendIcon,
} from '../../icons';
import { injectStyles } from '../../styles';

export interface ForgotPasswordProps {
  apiUrl?: string;
  onSuccess?: () => void;
  onBackToSignIn?: () => void;
}

const RESEND_COOLDOWN_S = 30;

/** Request a password-reset email. */
export function ForgotPassword({
  apiUrl,
  onSuccess,
  onBackToSignIn,
}: ForgotPasswordProps) {
  injectStyles();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run trigger: refocuses the title when the view flips to success.
  useEffect(() => {
    titleRef.current?.focus();
  }, [sent]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  async function send(emailToSend: string): Promise<boolean> {
    try {
      await fetch(
        `${(apiUrl ?? process.env.VITE_SLYXUP_API_URL ?? DEFAULT_AUTH_API_URL).replace(/\/$/, '')}/v1/verification/password/forgot`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailToSend }),
        }
      );
      // Always success — never reveal account existence.
      return true;
    } catch {
      setError('Network problem. Check your connection and try again.');
      return false;
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const ok = await send(email);
    setBusy(false);
    if (ok) {
      setSent(true);
      setCooldown(RESEND_COOLDOWN_S);
      onSuccess?.();
    }
    void SlyxupClient; // tree-shake guard
  }

  async function resend() {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    const ok = await send(email);
    setBusy(false);
    if (ok) setCooldown(RESEND_COOLDOWN_S);
  }

  const backLink = onBackToSignIn && (
    <div className="slx-footer-row">
      <button type="button" className="slx-back-link" onClick={onBackToSignIn}>
        <ArrowLeftIcon /> Back to sign in
      </button>
    </div>
  );

  if (sent) {
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
          Email sent
        </p>
        <h1
          className="slx-title slx-title-centered"
          ref={titleRef}
          tabIndex={-1}
        >
          Check your email
        </h1>
        <p className="slx-subtitle slx-title-centered">
          If an account exists for <strong>{email}</strong>, a reset link is on
          its way.
        </p>
        <button
          type="button"
          className="slx-btn"
          onClick={resend}
          disabled={busy || cooldown > 0}
        >
          {busy ? (
            <span className="slx-spinner" aria-hidden="true" />
          ) : (
            <SendIcon />
          )}
          {busy
            ? 'Sending…'
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : 'Resend email'}
        </button>
        <div className="slx-info-box">
          <ClockIcon />
          <span>
            The link expires in 1 hour and works once. Can&apos;t find it? Check
            spam and promotions folders.
          </span>
        </div>
        {backLink}
      </div>
    );
  }

  return (
    <div className={`slx-card${error ? ' slx-card-error' : ''}`}>
      <div className="slx-state-icon" aria-hidden="true">
        <MailIcon />
      </div>
      <p className="slx-eyebrow">Password reset</p>
      <h1 className="slx-title" ref={titleRef} tabIndex={-1}>
        Reset your password
      </h1>
      <p className="slx-subtitle">
        Enter your account email and we&apos;ll send you a secure reset link.
      </p>

      {error && (
        <p className="slx-error-text" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit}>
        <div className="slx-field">
          <label className="slx-label" htmlFor="slx-forgot-email">
            Email address
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
          <p className="slx-hint">
            Works for password and OAuth-only accounts alike.
          </p>
        </div>
        <button className="slx-btn" type="submit" disabled={busy}>
          {busy && <span className="slx-spinner" aria-hidden="true" />}
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      {backLink}
    </div>
  );
}
