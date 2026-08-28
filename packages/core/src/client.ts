import {
  NetworkError,
  RateLimitError,
  SlyxupError,
  UnauthorizedError,
} from './errors.js';
import type {
  AuthResponse,
  ChangePasswordInput,
  CompleteSignInInput,
  ConnectedAccountsResponse,
  EnableTOTPResponse,
  ErrorResponse,
  Result,
  RevokeSessionsResponse,
  SessionResponse,
  SessionsResponse,
  SignInInput,
  SignInResponse,
  SignUpInput,
  SlyxupClientOptions,
  TOTPSetupResponse,
  TwoFactorRequiredResponse,
  TwoFactorStatusResponse,
  UpdateUserInput,
  UserResponse,
} from './types.js';

const DEFAULT_API_URL = 'https://auth.slyxup.online';

/** Minimal cookie jar so the SDK works in Node/SSR (browsers manage cookies natively). */
function createCookieJar() {
  let jar: string | undefined;
  return {
    capture(res: Response) {
      const setCookie = res.headers.get('set-cookie');
      if (setCookie) jar = setCookie.split(';')[0]?.trim();
    },
    header(): Record<string, string> {
      return jar ? { Cookie: jar } : {};
    },
    clear() {
      jar = undefined;
    },
  };
}

/**
 * SlyxUp Core Client.
 *
 * ```ts
 * const client = new SlyxupClient({ publishableKey: 'pk_test_xxx' });
 * await client.auth.signIn({ email: 'a@b.com', password: '12345678' });
 * const session = await client.sessions.get();
 * ```
 */
export class SlyxupClient {
  readonly publishableKey?: string;
  readonly apiUrl: string;
  private _getToken?: () => string | undefined;
  private _request?: <T>(path: string, init?: RequestInit) => Promise<T>;

  readonly auth: {
    signUp: (input: SignUpInput) => Promise<AuthResponse>;
    signIn: (input: SignInInput) => Promise<SignInResponse>;
    signOut: () => Promise<{ ok: true }>;
    resendVerification: (email: string) => Promise<{ ok: true }>;
    forgotPassword: (
      email: string,
      projectId?: string
    ) => Promise<{ ok: true }>;
    resetPassword: (token: string, password: string) => Promise<{ ok: true }>;
    verifyEmail: (token: string) => Promise<{ ok: true }>;
    /** Complete a 2FA challenge returned by signIn. */
    completeSignIn: (input: CompleteSignInInput) => Promise<AuthResponse>;
  };

  readonly sessions: {
    get: () => Promise<SessionResponse>;
    list: (opts?: {
      limit?: number;
      offset?: number;
    }) => Promise<SessionsResponse>;
    revoke: (sessionId: string) => Promise<{ ok: true }>;
    revokeOthers: () => Promise<RevokeSessionsResponse>;
  };

  readonly password: {
    change: (input: ChangePasswordInput) => Promise<{ ok: true }>;
  };

  readonly twoFactor: {
    setup: () => Promise<TOTPSetupResponse>;
    status: () => Promise<TwoFactorStatusResponse>;
    enable: (secret: string, code: string) => Promise<EnableTOTPResponse>;
    verify: (code: string) => Promise<{ ok: boolean; valid: boolean }>;
    disable: (code: string) => Promise<{ ok: true }>;
  };

  readonly accounts: {
    list: () => Promise<ConnectedAccountsResponse>;
    unlink: (
      accountId: string,
      provider: 'google' | 'github'
    ) => Promise<{ ok: true }>;
  };

  readonly users: {
    me: () => Promise<UserResponse>;
    update: (input: UpdateUserInput) => Promise<UserResponse>;
    delete: () => Promise<{ ok: true }>;
  };

  /** Get current session token (for custom project APIs that need Bearer) */
  getToken(): string | undefined {
    return this._getToken?.();
  }
  /** Raw request for custom endpoints (uses same auth headers + cookies as SDK) */
  async request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!this._request) throw new Error('Client not initialized');
    return this._request<T>(path, init);
  }

  constructor(options: SlyxupClientOptions = {}) {
    const jar = createCookieJar();
    // Persist token in localStorage so refresh keeps session for cross-origin (auth -> billing) and for dashboard project APIs
    const STORAGE_KEY = 'slyxup_session_token';
    let storedToken: string | undefined;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        storedToken = window.localStorage.getItem(STORAGE_KEY) ?? undefined;
      }
    } catch {}
    const persistToken = (t: string | undefined) => {
      storedToken = t;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          if (t) window.localStorage.setItem(STORAGE_KEY, t);
          else window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch {}
    };
    this.publishableKey = options.publishableKey;
    this.apiUrl = (options.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, '');
    this._getToken = () => storedToken;
    // _request will be assigned after `request` is defined below

    const requestInner = async <T>(
      path: string,
      init: RequestInit & { body?: string } = {},
      opts?: { captureError?: boolean }
    ): Promise<Result<T>> => {
      let res: Response;
      try {
        // Build headers: prefer cookie jar (SSR), fall back to stored Bearer token (browser cross-origin)
        const authHeaders: Record<string, string> = {};
        const jarHeader = jar.header();
        if (Object.keys(jarHeader).length > 0) {
          Object.assign(authHeaders, jarHeader);
        } else if (storedToken) {
          authHeaders.Authorization = `Bearer ${storedToken}`;
        }
        // Always send publishable key so server can scope auth to the correct project
        // and reject requests with invalid / missing keys (fixes demo-with-wrong-pk bug).
        if (this.publishableKey && this.publishableKey !== 'pk_test_missing') {
          authHeaders['X-Publishable-Key'] = this.publishableKey;
        }

        res = await fetch(`${this.apiUrl}${path}`, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...init.headers,
          },
          credentials: 'include',
        });
      } catch {
        throw new NetworkError();
      }
      jar.capture(res);

      const data = (await res
        .json()
        .catch(() => ({ ok: false, error: 'Invalid response' }))) as object;

      if (!res.ok) {
        if (opts?.captureError) return data as Result<T>;
        if (res.status === 401)
          throw new UnauthorizedError(
            'error' in data ? String(data.error) : undefined
          );
        if (res.status === 429) throw new RateLimitError();
        throw new SlyxupError(
          'error' in data
            ? String(data.error)
            : `Request failed (${res.status})`,
          res.status,
          'api_error'
        );
      }

      return data as Result<T>;
    };

    const post = <T>(
      path: string,
      body?: unknown,
      opts?: { captureError?: boolean }
    ) =>
      requestInner<T>(
        path,
        {
          method: 'POST',
          body: body === undefined ? undefined : JSON.stringify(body),
        },
        opts
      );

    this.auth = {
      signUp: async (input) => {
        const res = await post<AuthResponse>('/v1/auth/sign-up', input);
        if (!('user' in res))
          throw new SlyxupError(res.error, 400, 'api_error');
        if (res.sessionToken) persistToken(res.sessionToken);
        return res;
      },
      signIn: async (input) => {
        // The server may answer 403 with code 2FA_REQUIRED — we must surface
        // the challenge back to the caller instead of throwing a generic error.
        const res = await post<SignInResponse>('/v1/auth/sign-in', input, {
          captureError: true,
        });
        if ('challengeToken' in res) {
          return res as TwoFactorRequiredResponse;
        }
        if (!('user' in res))
          throw new UnauthorizedError(
            (res as { error?: string }).error ?? 'Sign in failed'
          );
        if (res.sessionToken) persistToken(res.sessionToken);
        return res;
      },
      completeSignIn: async (input) => {
        const res = await post<AuthResponse>('/v1/auth/sign-in/2fa', input);
        if (!('user' in res)) throw new UnauthorizedError(res.error);
        if (res.sessionToken) persistToken(res.sessionToken);
        return res;
      },
      signOut: async () => {
        const res = await post<{ ok: true }>('/v1/auth/sign-out');
        persistToken(undefined);
        jar.clear();
        return res as { ok: true };
      },
      resendVerification: async (email: string) => {
        const res = await post<{ ok: true }>('/v1/verification/resend', {
          email,
        });
        if (!res.ok) throw new SlyxupError(res.error, 400, 'api_error');
        return res as { ok: true };
      },
      forgotPassword: async (email: string, projectId?: string) => {
        const res = await post<{ ok: true }>(
          '/v1/verification/password/forgot',
          {
            email,
            projectId,
          }
        );
        if (!res.ok) throw new SlyxupError(res.error, 400, 'api_error');
        return res as { ok: true };
      },
      resetPassword: async (token: string, password: string) => {
        const res = await post<{ ok: true }>(
          '/v1/verification/password/reset',
          {
            token,
            password,
          }
        );
        if (!res.ok) throw new SlyxupError(res.error, 400, 'api_error');
        return res as { ok: true };
      },
      verifyEmail: async (token: string) => {
        const res = await post<{ ok: true }>('/v1/verification/verify', {
          token,
        });
        if (!res.ok) throw new SlyxupError(res.error, 400, 'api_error');
        return res as { ok: true };
      },
    };

    this.sessions = {
      get: async () => {
        const res = await requestInner<SessionResponse>('/v1/session');
        if (!('session' in res)) throw new UnauthorizedError(res.error);
        return res;
      },
      list: async (opts?: { limit?: number; offset?: number }) => {
        const params = new URLSearchParams();
        if (opts?.limit !== undefined) params.set('limit', String(opts.limit));
        if (opts?.offset !== undefined)
          params.set('offset', String(opts.offset));
        const qs = params.toString();
        const res = await requestInner<SessionsResponse>(
          `/v1/sessions${qs ? `?${qs}` : ''}`
        );
        if (!('sessions' in res))
          throw new SlyxupError(res.error, 400, 'api_error');
        return res;
      },
      revoke: async (sessionId: string) => {
        const res = await requestInner<{ ok: true }>(
          `/v1/sessions/${sessionId}`,
          {
            method: 'DELETE',
          }
        );
        return res as { ok: true };
      },
      revokeOthers: async () => {
        const res = await requestInner<RevokeSessionsResponse>('/v1/sessions', {
          method: 'DELETE',
        });
        if (!('revoked' in res))
          throw new SlyxupError(res.error, 400, 'api_error');
        return res;
      },
    };

    this.password = {
      change: async (input) => {
        const res = await post<{ ok: true }>('/v1/user/password', input);
        if (!res.ok) throw new SlyxupError(res.error, 400, 'api_error');
        return res as { ok: true };
      },
    };

    this.twoFactor = {
      setup: async () => {
        const res = await requestInner<TOTPSetupResponse>('/v1/user/2fa/setup');
        if (!('secret' in res))
          throw new SlyxupError(res.error, 400, 'api_error');
        return res;
      },
      status: async () => {
        const res = await requestInner<TwoFactorStatusResponse>(
          '/v1/user/2fa/status'
        );
        return res as TwoFactorStatusResponse;
      },
      enable: async (secret, code) => {
        const res = await post<EnableTOTPResponse>(
          '/v1/user/2fa/enable',
          { secret, code },
          { captureError: true }
        );
        if (!('recoveryCodes' in res))
          throw new SlyxupError(res.error, 400, 'api_error');
        return res;
      },
      verify: async (code) => {
        const res = await post<{ ok: boolean; valid: boolean }>(
          '/v1/user/2fa/verify',
          { code },
          { captureError: true }
        );
        if (!('valid' in res))
          throw new SlyxupError(res.error, 400, 'api_error');
        return res as { ok: boolean; valid: boolean };
      },
      disable: async (code) => {
        const res = await post<{ ok: true }>('/v1/user/2fa/disable', { code });
        if (!res.ok) throw new SlyxupError(res.error, 400, 'api_error');
        return res as { ok: true };
      },
    };

    this.accounts = {
      list: async () => {
        const res =
          await requestInner<ConnectedAccountsResponse>('/v1/user/accounts');
        if (!('accounts' in res))
          throw new SlyxupError(res.error, 400, 'api_error');
        return res;
      },
      unlink: async (accountId, provider) => {
        const res = await requestInner<{ ok: true }>(
          `/v1/user/accounts/${accountId}?provider=${encodeURIComponent(provider)}`,
          {
            method: 'DELETE',
          }
        );
        return res as { ok: true };
      },
    };

    this.users = {
      me: async () => {
        const res = await requestInner<UserResponse>('/v1/user');
        if (!('user' in res)) throw new UnauthorizedError(res.error);
        return res;
      },
      update: async (input) => {
        const res = await requestInner<UserResponse>('/v1/user', {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
        if (!('user' in res))
          throw new SlyxupError(res.error, 400, 'api_error');
        return res;
      },
      delete: async () => {
        const res = await requestInner<{ ok: true }>('/v1/user', {
          method: 'DELETE',
        });
        return res as { ok: true };
      },
    };

    this._request = requestInner as unknown as <T>(
      path: string,
      init?: RequestInit
    ) => Promise<T>;
  }
}

// Re-exports so consumers can import from '@slyxup/core'
export * from './types.js';
export * from './errors.js';
// test publish after fix
