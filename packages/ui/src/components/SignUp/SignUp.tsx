import { SlyxupError } from '@slyxup/core';
import { useAuth } from '@slyxup/react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { GitHubIcon, GoogleIcon, KeyholeMark } from '../../icons';

export interface SignUpProps {
  social?: boolean;
  onSuccess?: () => void;
  onSignInClick?: () => void;
}

/** Email/password + OAuth sign-up card. */
export function SignUp({
  social = true,
  onSuccess,
  onSignInClick,
}: SignUpProps) {
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState('');
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
      await signUp({ email, password, firstName: firstName || undefined });
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
    window.location.href = `/v1/oauth/${provider}`;
  }

  return (
    <div ref={cardRef} className={`slx-card${error ? ' slx-card-error' : ''}`}>
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
          <input
            id="slx-signup-password"
            className="slx-input"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
  );
}
