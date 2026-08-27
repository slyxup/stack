import {
  NetworkError,
  RateLimitError,
  SlyxupError,
  UnauthorizedError,
} from './errors.js';
import type {
  AuthResponse,
  ChangePasswordInput,
  ErrorResponse,
  Result,
  RevokeSessionsResponse,
  SessionResponse,
  SessionsResponse,
  SignInInput,
  SignUpInput,
  SlyxupClientOptions,
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
    signIn: (input: SignInInput) => Promise<AuthResponse>;
    signOut: () => Promise<{ ok: true }>;
    resendVerification: (email: string) => Promise<{ ok: true }>;
  };

  readonly sessions: {
    get: () => Promise<SessionResponse>;
    list: () => Promise<SessionsResponse>;
    revoke: (sessionId: string) => Promise<{ ok: true }>;
    revokeOthers: () => Promise<RevokeSessionsResponse>;
  };

  readonly password: {
    change: (input: ChangePasswordInput) => Promise<{ ok: true }>;
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
    let storedToken: string | undefined;
    this.publishableKey = options.publishableKey;
    this.apiUrl = (options.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, '');
    this._getToken = () => storedToken;
    // _request will be assigned after `request` is defined below

    const requestInner = async <T>(
      path: string,
      init: RequestInit & { body?: string } = {}
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

    const post = <T>(path: string, body?: unknown) =>
      requestInner<T>(path, {
        method: 'POST',
        body: body === undefined ? undefined : JSON.stringify(body),
      });

    this.auth = {
      signUp: async (input) => {
        const res = await post<AuthResponse>('/v1/auth/sign-up', input);
        if (!('user' in res))
          throw new SlyxupError(res.error, 400, 'api_error');
        if (res.sessionToken) storedToken = res.sessionToken;
        return res;
      },
      signIn: async (input) => {
        const res = await post<AuthResponse>('/v1/auth/sign-in', input);
        if (!('user' in res))
          throw new SlyxupError(res.error, 401, 'api_error');
        if (res.sessionToken) storedToken = res.sessionToken;
        return res;
      },
      signOut: async () => {
        const res = await post<{ ok: true }>('/v1/auth/sign-out');
        storedToken = undefined;
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
    };

    this.sessions = {
      get: async () => {
        const res = await requestInner<SessionResponse>('/v1/session');
        if (!('session' in res)) throw new UnauthorizedError(res.error);
        return res;
      },
      list: async () => {
        const res = await requestInner<SessionsResponse>('/v1/sessions');
        if (!('sessions' in res))
          throw new SlyxupError(res.error, 400, 'api_error');
        return res;
      },
      revoke: async (sessionId: string) => {
        const res = await requestInner<{ ok: true }>(`/v1/sessions/${sessionId}`, {
          method: 'DELETE',
        });
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

    this._request = requestInner as unknown as <T>(path: string, init?: RequestInit) => Promise<T>;
  }
}

// Re-exports so consumers can import from '@slyxup/core'
export * from './types.js';
export * from './errors.js';
// test publish after fix
// final test for auto version after fixing strict
