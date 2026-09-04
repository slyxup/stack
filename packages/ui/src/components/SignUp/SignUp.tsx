import { SlyxupError } from '@slyxup/core';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { GitHubIcon, GoogleIcon, KeyholeMark } from '../../icons';
import { useAuth } from '../../react/hooks/useAuth';
import { injectStyles } from '../../styles';
import type { AuthLayout } from '../../theme';
import { PasswordField } from '../PasswordField';

export interface SignUpProps {
  social?: boolean;
  onSuccess?: () => void;
  onSignInClick?: () => void;
  /** Page layout: 'centered' (default card), 'split' (brand panel + form), 'minimal' (chromeless). */
  layout?: AuthLayout;
  /** Show the username field (default true) — passed to signUp when filled. */
  username?: boolean;
  /** Brand panel content for the 'split' layout. */
  brandTitle?: string;
  brandSubtitle?: string;
  brandPoints?: string[];
}

/** Email/password + OAuth sign-up card. */
export function SignUp({
  social = true,
  onSuccess,
  onSignInClick,
  layout = 'centered',
  username: showUsername = true,
  brandTitle = 'Create your account',
  brandSubtitle = 'A minute to set up. Sign in forever after.',
  brandPoints = ['Email + OAuth out of the box', 'HttpOnly sessions, secured by default', 'Billing ready when you are'],
}: SignUpProps) {
  injectStyles();
  const { signUp, client } = useAuth() as unknown as {
    signUp: ReturnType<typeof useAuth>['signUp'];
    client: { publishableKey?: string; apiUrl: string };
  };
  const [firstName, setFirstName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
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
      await signUp({
        email,
        password,
        firstName: firstName || undefined,
        username: username || undefined,
      });
      setSuccessEmail(email);
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
          <code>NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY</code> — run{' '}
          <code>npx @slyxup/cli keys create</code>
        </p>
      )}
      <div className="slx-mark">
        <KeyholeMark />
      </div>
      <h1 className="slx-title">Create your account</h1>
      <p className="slx-subtitle">A minute to set up. Sign in forever after.</p>

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

      {successEmail && (
        <p
          className="slx-success-text"
          aria-live="polite"
          style={{ color: 'var(--slx-success)' }}
        >
          Account created! We sent a verification link to{' '}
          <strong>{successEmail}</strong>. Check your inbox to verify and sign
          in.
        </p>
      )}

      <form onSubmit={onSubmit}>
        <div className="slx-field">
          <label className="slx-label" htmlFor="slx-signup-name">
            First name
          </label>
          <input
            id="slx-signup-name"
            className="slx-input"
            type="text"
            autoComplete="given-name"
            placeholder="Ada"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        {showUsername && (
          <div className="slx-field">
            <label className="slx-label" htmlFor="slx-signup-username">
              Username
            </label>
          <input
            id="slx-signup-username"
            className="slx-input"
            type="text"
            autoComplete="username"
            placeholder="ada"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <p className="slx-hint">
            Optional — lets you sign in with a username instead of your email.
          </p>
          </div>
        )}
        <div className="slx-field">
          <label className="slx-label" htmlFor="slx-signup-email">
            Email
          </label>
          <input
            id="slx-signup-email"
            className="slx-input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="slx-field">
          <label className="slx-label" htmlFor="slx-signup-password">
            Password
          </label>
          <PasswordField
            id="slx-signup-password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            required
            minLength={8}
          />
          <p className="slx-hint">
            Use 8+ characters with a mix of letters and numbers.
          </p>
        </div>
        <button className="slx-btn" type="submit" disabled={busy}>
          {busy && <span className="slx-spinner" aria-hidden="true" />}
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      {onSignInClick && (
        <p className="slx-footer">
          Already have an account?{' '}
          <button type="button" className="slx-link" onClick={onSignInClick}>
            Sign in
          </button>
        </p>
      )}
      </div>
    </div>
  );
}
