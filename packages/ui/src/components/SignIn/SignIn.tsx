import { SlyxupError } from '@slyxup/core';
import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
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
  brandPoints = [
    'Email + OAuth out of the box',
    'HttpOnly sessions, secured by default',
    'Billing ready when you are',
  ],
}: SignInProps) {
  injectStyles();
  const { signIn, completeSignIn, client, oauthChallenge, authError } =
    useAuth();
  const id = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [tfaCode, setTfaCode] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (oauthChallenge) setChallengeToken(oauthChallenge);
  }, [oauthChallenge]);
  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const identity = email.trim();
      const res = await signIn(
        username && !identity.includes('@')
          ? { username: identity, password }
          : { email: identity, password }
      );
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
      await completeSignIn({
        challengeToken,
        ...(recoveryMode
          ? { recoveryCode: tfaCode.trim() }
          : { code: tfaCode.trim() }),
      });
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
    void client.auth
      .startOAuth(provider)
      .catch((error: unknown) =>
        setError(
          error instanceof Error
            ? error.message
            : 'Unable to start social sign-in'
        )
      );
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
            <code>.env.local</code>
          </p>
        )}
        <div className="slx-mark">
          <KeyholeMark />
        </div>
        <h1 className="slx-title">Sign in</h1>
        <p className="slx-subtitle">
          Welcome back. Enter your details to continue.
        </p>

        {social && !challengeToken && (
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
          <p id={`${id}-error`} className="slx-error-text" role="alert">
            {error}
          </p>
        )}

        {challengeToken ? (
          <form
            onSubmit={onSubmit2FA}
            aria-busy={busy}
            aria-describedby={error ? `${id}-error` : undefined}
          >
            <div className="slx-field">
              <label className="slx-label" htmlFor={`${id}-2fa`}>
                {recoveryMode ? 'Recovery code' : 'Authenticator code'}
              </label>
              <input
                id={`${id}-2fa`}
                className="slx-input"
                type="text"
                inputMode={recoveryMode ? 'text' : 'numeric'}
                autoComplete="one-time-code"
                maxLength={recoveryMode ? 128 : 6}
                pattern={recoveryMode ? undefined : '[0-9]{6}'}
                placeholder={
                  recoveryMode ? 'Enter a saved recovery code' : '000000'
                }
                value={tfaCode}
                onChange={(e) =>
                  setTfaCode(
                    recoveryMode
                      ? e.target.value
                      : e.target.value.replace(/\D/g, '')
                  )
                }
                disabled={busy}
                required
              />
              <p className="slx-hint">
                {recoveryMode
                  ? 'Each recovery code can be used once.'
                  : 'Enter the 6-digit code from your authenticator app.'}
              </p>
            </div>
            <button className="slx-btn" type="submit" disabled={busy}>
              {busy && <span className="slx-spinner" aria-hidden="true" />}
              {busy ? 'Verifying…' : 'Verify code'}
            </button>
            <button
              type="button"
              className="slx-link"
              disabled={busy}
              onClick={() => {
                setRecoveryMode(!recoveryMode);
                setTfaCode('');
                setError(null);
              }}
            >
              {recoveryMode ? 'Use authenticator app' : 'Use a recovery code'}
            </button>
            <button
              type="button"
              className="slx-link"
              style={{ marginTop: 8 }}
              disabled={busy}
              onClick={() => {
                setChallengeToken(null);
                setTfaCode('');
                setError(null);
                setRecoveryMode(false);
              }}
            >
              ← Back to sign in
            </button>
          </form>
        ) : (
          <form
            onSubmit={onSubmit}
            aria-busy={busy}
            aria-describedby={error ? `${id}-error` : undefined}
          >
            <div className="slx-field">
              <label className="slx-label" htmlFor={`${id}-email`}>
                {username ? (
                  <>
                    Username <span className="slx-hint">or email</span>
                  </>
                ) : (
                  'Email'
                )}
              </label>
              <input
                id={`${id}-email`}
                className="slx-input"
                type={username ? 'text' : 'email'}
                autoComplete="username"
                placeholder={
                  username ? 'you@example.com or yourname' : 'you@example.com'
                }
                disabled={busy}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="slx-field">
              <div className="slx-row">
                <label className="slx-label" htmlFor={`${id}-password`}>
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
                id={`${id}-password`}
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
