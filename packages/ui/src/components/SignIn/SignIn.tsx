import { SlyxupError } from '@slyxup/core';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { GitHubIcon, GoogleIcon, KeyholeMark } from '../../icons';
import { useAuth } from '../../react/hooks/useAuth';
import { injectStyles } from '../../styles';
import type { AuthLayout } from '../../theme';
import { PasswordField } from '../PasswordField';

export interface SignInProps {
  /** Show social buttons (default true) */
  social?: boolean;
  /** Called after successful sign in */
  onSuccess?: () => void;
  /** Switch to sign up */
  onSignUpClick?: () => void;
  /** Show "Forgot password?" — navigates via this callback */
  onForgotPasswordClick?: () => void;
  /** Page layout: 'centered' (default card), 'split' (brand panel + form), 'minimal' (chromeless). */
  layout?: AuthLayout;
  /** Accept username as well as email in the identity field (default false). */
  username?: boolean;
  /** Brand panel content for the 'split' layout. */
  brandTitle?: string;
  brandSubtitle?: string;
  brandPoints?: string[];
}

/** Email/password + OAuth sign-in card. */
export function SignIn({
  social = true,
  onSuccess,
  onSignUpClick,
  onForgotPasswordClick,
  layout = 'centered',
  username = false,
  brandTitle = 'Ship auth in minutes',
  brandSubtitle = 'Email, OAuth and 2FA — one integration, secured by default.',
  brandPoints = ['Email + OAuth out of the box', 'HttpOnly sessions, secured by default', 'Billing ready when you are'],
}: SignInProps) {
  injectStyles();
  const { signIn, completeSignIn, client } = useAuth() as unknown as {
    signIn: ReturnType<typeof useAuth>['signIn'];
    completeSignIn: ReturnType<typeof useAuth>['completeSignIn'];
    client: { publishableKey?: string; apiUrl: string };
  };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [tfaCode, setTfaCode] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

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
      const res = await signIn({ email, password });
      if (res && 'challengeToken' in res) {
        setChallengeToken(res.challengeToken);
        return;
      }
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof SlyxupError
          ? err.message
          : 'Something went wrong. Try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit2FA(e: FormEvent) {
    e.preventDefault();
    if (!challengeToken) return;
    setBusy(true);
    setError(null);
    try {
      await completeSignIn({ challengeToken, code: tfaCode.trim() });
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof SlyxupError ? err.message : 'Invalid code. Try again.'
      );
    } finally {
      setBusy(false);
    }
  }

  function oauth(provider: 'google' | 'github') {
    const redirect = encodeURIComponent(window.location.href);
    window.location.href = `${client.apiUrl}/v1/oauth/${provider}?redirect_url=${redirect}`;
  }

  const missingKey =
    !client.publishableKey ||
    client.publishableKey === 'pk_test_missing' ||
    client.publishableKey.includes('REPLACE');

  return (
    <div
      ref={cardRef}
      className={`slx-card${error ? ' slx-card-error' : ''}${layout === 'centered' ? '' : ` slx-layout-${layout}`}`}
    >
      {layout === 'split' && (
        <div className="slx-split-brand">
          <div className="slx-split-mark">
            <KeyholeMark />
          </div>
          <h2 className="slx-split-title">{brandTitle}</h2>
          <p className="slx-split-sub">{brandSubtitle}</p>
          <ul className="slx-split-points">
            {brandPoints.map((pt) => (
              <li key={pt}>{pt}</li>
            ))}
          </ul>
        </div>
      )}
      <div className={layout === 'split' ? 'slx-split-form' : 'slx-form-full'}>
      {missingKey && (
        <p className="slx-setup-note">
          <strong>Setup:</strong> Add{' '}
          <code>NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY</code> to{' '}
          <code>.env.local</code> — run <code>npx @slyxup/cli keys create</code>
        </p>
      )}
      <div className="slx-mark">
        <KeyholeMark />
      </div>
      <h1 className="slx-title">Sign in</h1>
      <p className="slx-subtitle">
        Welcome back. Enter your details to continue.
      </p>

      {social && (
        <>
          <div className="slx-social">
            <button
              type="button"
              className="slx-social-btn"
              onClick={() => oauth('google')}
            >
              <GoogleIcon /> Continue with Google
            </button>
            <button
              type="button"
              className="slx-social-btn"
              onClick={() => oauth('github')}
            >
              <GitHubIcon /> Continue with GitHub
            </button>
          </div>
          <div className="slx-divider">or</div>
        </>
      )}

      {error && (
        <p className="slx-error-text" role="alert">
          {error}
        </p>
      )}

      {challengeToken ? (
        <form onSubmit={onSubmit2FA} noValidate={false}>
          <div className="slx-field">
            <label className="slx-label" htmlFor="slx-signin-2fa">
              Authenticator code
            </label>
            <input
              id="slx-signin-2fa"
              className="slx-input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              pattern="[0-9]*"
              placeholder="000000"
              value={tfaCode}
              onChange={(e) => setTfaCode(e.target.value.replace(/\D/g, ''))}
              required
            />
            <p className="slx-hint">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>
          <button className="slx-btn" type="submit" disabled={busy}>
            {busy && <span className="slx-spinner" aria-hidden="true" />}
            {busy ? 'Verifying…' : 'Verify code'}
          </button>
          <button
            type="button"
            className="slx-link"
            style={{ marginTop: 8 }}
            onClick={() => {
              setChallengeToken(null);
              setTfaCode('');
            }}
          >
            ← Back to sign in
          </button>
        </form>
      ) : (
        <form onSubmit={onSubmit} noValidate={false}>
          <div className="slx-field">
            <label className="slx-label" htmlFor="slx-signin-email">
              {username ? (
                <>
                  Username <span className="slx-hint">or email</span>
                </>
              ) : (
                'Email'
              )}
            </label>
            <input
              id="slx-signin-email"
              className="slx-input"
              type="text"
              autoComplete="username"
              placeholder="you@example.com or yourname"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="slx-field">
            <div className="slx-row">
              <label className="slx-label" htmlFor="slx-signin-password">
                Password
              </label>
              {onForgotPasswordClick && (
                <button
                  type="button"
                  className="slx-link slx-forgot"
                  onClick={onForgotPasswordClick}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <PasswordField
              id="slx-signin-password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>
          <button className="slx-btn" type="submit" disabled={busy}>
            {busy && <span className="slx-spinner" aria-hidden="true" />}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      )}

      {onSignUpClick && (
        <p className="slx-footer">
          Don&apos;t have an account?{' '}
          <button type="button" className="slx-link" onClick={onSignUpClick}>
            Sign up
          </button>
        </p>
      )}
      </div>
    </div>
  );
}
