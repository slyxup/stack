import type { ReactNode } from 'react';
import { injectStyles } from '../styles';

export interface ErrorDisplayProps {
  /** Machine code from the API (e.g. CSRF_TOKEN_INVALID, TOO_MANY_REQUESTS). */
  code?: string;
  /** Human-readable message. */
  message: string;
  /** Optional troubleshooting hint shown below the message. */
  hint?: string;
  /** Optional retry action. */
  onRetry?: () => void;
  action?: ReactNode;
}

/** Friendly error → troubleshooting hint map for known API codes. */
const HINTS: Record<string, string> = {
  CSRF_TOKEN_INVALID: 'Refresh the page and try again.',
  TOO_MANY_REQUESTS: 'Too many attempts — wait a moment, then retry.',
  EMAIL_NOT_VERIFIED: 'Check your inbox for the verification link.',
  PASSWORD_CHANGE_REQUIRED: 'You need to set a new password first.',
  INVALID_2FA_CODE: 'Check your authenticator app and try the latest code.',
  ACCOUNT_BLOCKED: 'Contact support if you think this is a mistake.',
  '2FA_REQUIRED': 'Enter the code from your authenticator app.',
};

/**
 * Accessible error display: `role="alert"` so screen readers announce it,
 * optional code chip, troubleshooting hint, and retry action.
 */
export function ErrorDisplay({ code, message, hint, onRetry, action }: ErrorDisplayProps) {
  injectStyles();
  const resolvedHint = hint ?? (code ? HINTS[code] : undefined);
  return (
    <div className="slx-error" role="alert" aria-live="assertive">
      {code && (
        <span className="slx-error-code" aria-label={`Error code ${code}`}>
          {code}
        </span>
      )}
      <p className="slx-error-text">{message}</p>
      {resolvedHint && <p className="slx-hint">{resolvedHint}</p>}
      {(onRetry || action) && (
        <div className="slx-error-action">
          {onRetry && (
            <button type="button" className="slx-btn slx-btn-secondary" onClick={onRetry}>
              Try again
            </button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
