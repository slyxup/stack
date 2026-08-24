import {
  NetworkError,
  RateLimitError,
  SlyxupError,
  UnauthorizedError,
} from './errors.js';
import type {
  AuthResponse,
  ErrorResponse,
  Result,
  SessionResponse,
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

  readonly auth: {
    signUp: (input: SignUpInput) => Promise<AuthResponse>;
    signIn: (input: SignInInput) => Promise<AuthResponse>;
    signOut: () => Promise<{ ok: true }>;
  };

  readonly sessions: {
    get: () => Promise<SessionResponse>;
  };

  readonly users: {
    me: () => Promise<UserResponse>;
    update: (input: UpdateUserInput) => Promise<UserResponse>;
    delete: () => Promise<{ ok: true }>;
  };

  constructor(options: SlyxupClientOptions = {}) {
    const jar = createCookieJar();
    this.publishableKey = options.publishableKey;
    this.apiUrl = (options.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, '');

    const request = async <T>(
      path: string,
      init: RequestInit & { body?: string } = {}
    ): Promise<Result<T>> => {
      let res: Response;
      try {
        res = await fetch(`${this.apiUrl}${path}`, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...jar.header(),
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
      request<T>(path, {
        method: 'POST',
        body: body === undefined ? undefined : JSON.stringify(body),
      });

    this.auth = {
      signUp: async (input) => {
        const res = await post<AuthResponse>('/v1/auth/sign-up', input);
        if (!('user' in res))
          throw new SlyxupError(res.error, 400, 'api_error');
        return res;
      },
      signIn: async (input) => {
        const res = await post<AuthResponse>('/v1/auth/sign-in', input);
        if (!('user' in res))
          throw new SlyxupError(res.error, 401, 'api_error');
        return res;
      },
      signOut: async () => {
        const res = await post<{ ok: true }>('/v1/auth/sign-out');
        return res as { ok: true };
      },
    };

    this.sessions = {
      get: async () => {
        const res = await request<SessionResponse>('/v1/session');
        if (!('session' in res)) throw new UnauthorizedError(res.error);
        return res;
      },
    };

    this.users = {
      me: async () => {
        const res = await request<UserResponse>('/v1/user');
        if (!('user' in res)) throw new UnauthorizedError(res.error);
        return res;
      },
      update: async (input) => {
        const res = await request<UserResponse>('/v1/user', {
          method: 'PATCH',
          body: JSON.stringify(input),
        });
        if (!('user' in res))
          throw new SlyxupError(res.error, 400, 'api_error');
        return res;
      },
      delete: async () => {
        const res = await request<{ ok: true }>('/v1/user', {
          method: 'DELETE',
        });
        return res as { ok: true };
      },
    };
  }
}

// Re-exports so consumers can import from '@slyxup/core'
export * from './types.js';
export * from './errors.js';
