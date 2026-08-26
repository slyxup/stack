import { SlyxupError } from '@slyxup/core';
import { useAuth } from '@slyxup/react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { GitHubIcon, GoogleIcon, KeyholeMark } from '../../icons';
import { injectStyles } from '../../styles';

export interface SignInProps {
  /** Show social buttons (default true) */
  social?: boolean;
  /** Called after successful sign in */
  onSuccess?: () => void;
  /** Switch to sign up */
  onSignUpClick?: () => void;
}

/** Email/password + OAuth sign-in card. */
export function SignIn({
  social = true,
  onSuccess,
  onSignUpClick,
}: SignInProps) {
  injectStyles();
  const { signIn, client } = useAuth() as unknown as {
    signIn: ReturnType<typeof useAuth>['signIn'];
    client: { publishableKey?: string; apiUrl: string };
  };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      await signIn({ email, password });
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
    window.location.href = `${client.apiUrl}/v1/oauth/${provider}`;
  }

  const missingKey =
    !client.publishableKey ||
    client.publishableKey === 'pk_test_missing' ||
    client.publishableKey.includes('REPLACE');

  return (
    <div ref={cardRef} className={`slx-card${error ? ' slx-card-error' : ''}`}>
      {missingKey && (
        <p
          style={{
            fontSize: 12,
            background: '#fff3cd',
            border: '1px solid #ffe69c',
            borderRadius: 8,
            padding: '8px 10px',
            marginBottom: 14,
            lineHeight: 1.4,
          }}
        >
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

      <form onSubmit={onSubmit} noValidate={false}>
        <div className="slx-field">
          <label className="slx-label" htmlFor="slx-signin-email">
            Email
          </label>
          <input
            id="slx-signin-email"
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
          <label className="slx-label" htmlFor="slx-signin-password">
            Password
          </label>
          <input
            id="slx-signin-password"
            className="slx-input"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <button className="slx-btn" type="submit" disabled={busy}>
          {busy && <span className="slx-spinner" aria-hidden="true" />}
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {onSignUpClick && (
        <p className="slx-footer">
          Don&apos;t have an account?{' '}
          <button type="button" className="slx-link" onClick={onSignUpClick}>
            Sign up
          </button>
        </p>
      )}
    </div>
  );
}
