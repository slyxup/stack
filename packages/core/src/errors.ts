// SlyxUp Core SDK — typed errors + actionable error catalog (Week 5).
//
// Every API error carries a machine `code`. `getErrorHint(code)` maps it to a
// troubleshooting hint shown by `<ErrorDisplay />` and documented in docs/ERRORS.md.

export class SlyxupError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'SlyxupError';
    this.status = status;
    this.code = code;
  }

  /** Troubleshooting hint for this error's code (undefined when unknown). */
  get hint(): string | undefined {
    return getErrorHint(this.code);
  }
}

export class UnauthorizedError extends SlyxupError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export class ValidationError extends SlyxupError {
  constructor(message = 'Validation failed') {
    super(message, 400, 'validation_error');
    this.name = 'ValidationError';
  }
}

export class NetworkError extends SlyxupError {
  constructor(message = 'Network request failed') {
    super(message, 0, 'network_error');
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends SlyxupError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'rate_limited');
    this.name = 'RateLimitError';
  }
}

/** Actionable catalog: machine code → what to do about it. */
export const ERROR_CATALOG: Record<
  string,
  { hint: string; retryable: boolean }
> = {
  CSRF_TOKEN_INVALID: {
    hint: 'Refresh the page to mint a new CSRF token, then retry.',
    retryable: true,
  },
  TOO_MANY_REQUESTS: {
    hint: 'Rate limited. Wait for the Retry-After interval, then retry.',
    retryable: true,
  },
  rate_limited: {
    hint: 'Rate limited. Wait a moment, then retry.',
    retryable: true,
  },
  EMAIL_NOT_VERIFIED: {
    hint: 'Check the inbox for the verification link, or resend it.',
    retryable: false,
  },
  PASSWORD_CHANGE_REQUIRED: {
    hint: 'Set a new password via force-change before signing in.',
    retryable: false,
  },
  '2FA_REQUIRED': {
    hint: 'Complete sign-in with the TOTP code from the authenticator app.',
    retryable: false,
  },
  INVALID_2FA_CODE: {
    hint: 'Use the latest code from the authenticator app (codes rotate every 30s).',
    retryable: true,
  },
  '2FA_CHALLENGE_INVALID': {
    hint: 'The 2FA challenge expired (5 min). Sign in again from the password step.',
    retryable: false,
  },
  ACCOUNT_BLOCKED: {
    hint: 'Account blocked. Contact support if this is a mistake.',
    retryable: false,
  },
  INVALID_PUBLISHABLE_KEY: {
    hint: 'Check NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY — it must be a pk_ key for this project.',
    retryable: false,
  },
  INVALID_BOOTSTRAP_TOKEN: {
    hint: 'Wrong X-Bootstrap-Token. See BOOTSTRAP_SECRET in the worker env.',
    retryable: false,
  },
  unauthorized: {
    hint: 'Sign in first — the session is missing or expired.',
    retryable: false,
  },
  validation_error: {
    hint: 'Check the highlighted fields and resubmit.',
    retryable: false,
  },
  network_error: {
    hint: 'Could not reach the API. Check connectivity and the apiUrl.',
    retryable: true,
  },
};

export function getErrorHint(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return ERROR_CATALOG[code]?.hint;
}

export function isRetryableCode(code: string | undefined): boolean {
  if (!code) return false;
  return ERROR_CATALOG[code]?.retryable ?? false;
}
