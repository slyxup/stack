import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SlyxupClient } from '../src/client.js';
import { SlyxupError, UnauthorizedError, NetworkError, RateLimitError } from '../src/errors.js';

function mockFetch(
  data: unknown,
  init?: { ok?: boolean; status?: number; headers?: Record<string, string> }
) {
  const fn = vi.fn().mockResolvedValue({
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    headers: {
      get: (key: string) => {
        const lower = key.toLowerCase();
        for (const [k, v] of Object.entries(init?.headers ?? {})) {
          if (k.toLowerCase() === lower) return v;
        }
        return null;
      },
    },
    json: () => Promise.resolve(data),
  });
  global.fetch = fn;
  return fn;
}

describe('SlyxupClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use default apiUrl', () => {
      mockFetch({ ok: true });
      const client = new SlyxupClient();
      expect(client.apiUrl).toBe('https://auth.slyxup.online');
    });

    it('should strip trailing slash from apiUrl', () => {
      mockFetch({ ok: true });
      const client = new SlyxupClient({ apiUrl: 'http://localhost:3000/' });
      expect(client.apiUrl).toBe('http://localhost:3000');
    });

    it('should store publishableKey', () => {
      mockFetch({ ok: true });
      const client = new SlyxupClient({ publishableKey: 'pk_test_123' });
      expect(client.publishableKey).toBe('pk_test_123');
    });
  });

  describe('auth.signUp', () => {
    it('should POST to /v1/auth/sign-up with JSON body', async () => {
      const fn = mockFetch({ ok: true, user: { id: 'u1', email: 'a@b.com' } });
      const client = new SlyxupClient({ apiUrl: 'http://localhost' });
      const res = await client.auth.signUp({
        email: 'a@b.com',
        password: '12345678',
        firstName: 'Test',
      });
      expect(fn).toHaveBeenCalledWith(
        'http://localhost/v1/auth/sign-up',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'a@b.com', password: '12345678', firstName: 'Test' }),
        })
      );
      expect(res).toEqual({ ok: true, user: { id: 'u1', email: 'a@b.com' } });
    });

    it('should throw SlyxupError when response has no user', async () => {
      mockFetch({ ok: true, error: 'Invalid email' });
      const client = new SlyxupClient({ apiUrl: 'http://localhost' });
      await expect(
        client.auth.signUp({ email: 'bad', password: '12345678' })
      ).rejects.toThrow(SlyxupError);
    });
  });

  describe('auth.signIn', () => {
    it('should POST to /v1/auth/sign-in', async () => {
      const fn = mockFetch({ ok: true, user: { id: 'u1', email: 'a@b.com' } });
      const client = new SlyxupClient({ apiUrl: 'http://localhost' });
      const res = await client.auth.signIn({ email: 'a@b.com', password: 'pass' });
      expect(fn).toHaveBeenCalledWith(
        'http://localhost/v1/auth/sign-in',
        expect.objectContaining({ method: 'POST' })
      );
      expect(res).toEqual({ ok: true, user: { id: 'u1', email: 'a@b.com' } });
    });

    it('should throw UnauthorizedError on 401', async () => {
      mockFetch({ ok: false, error: 'Bad credentials' }, { ok: false, status: 401 });
      const client = new SlyxupClient({ apiUrl: 'http://localhost' });
      await expect(
        client.auth.signIn({ email: 'a@b.com', password: 'wrong' })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw SlyxupError when response has no user', async () => {
      mockFetch({ ok: true, error: 'No user' });
      const client = new SlyxupClient({ apiUrl: 'http://localhost' });
      await expect(
        client.auth.signIn({ email: 'a@b.com', password: 'pass' })
      ).rejects.toThrow(SlyxupError);
    });
  });

  describe('auth.signOut', () => {
    it('should POST to /v1/auth/sign-out', async () => {
      const fn = mockFetch({ ok: true });
      const client = new SlyxupClient({ apiUrl: 'http://localhost' });
      const res = await client.auth.signOut();
      expect(fn).toHaveBeenCalledWith(
        'http://localhost/v1/auth/sign-out',
        expect.objectContaining({ method: 'POST' })
      );
      expect(res).toEqual({ ok: true });
    });
  });

  describe('sessions.get', () => {
    it('should GET /v1/session', async () => {
      const data = { ok: true, user: { id: 'u1', email: 'a@b.com' }, session: { id: 's1', expiresAt: '2030' } };
      const fn = mockFetch(data);
      const client = new SlyxupClient({ apiUrl: 'http://localhost' });
      const res = await client.sessions.get();
      expect(fn).toHaveBeenCalledWith('http://localhost/v1/session', expect.anything());
      expect(res).toEqual(data);
    });

    it('should throw UnauthorizedError when no session in response', async () => {
      mockFetch({ ok: true, error: 'No session' });
      const client = new SlyxupClient({ apiUrl: 'http://localhost' });
      await expect(client.sessions.get()).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NetworkError when fetch rejects', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('fetch failed'));
      const client = new SlyxupClient({ apiUrl: 'http://localhost' });
      await expect(client.sessions.get()).rejects.toThrow(NetworkError);
    });
  });

  describe('users.me', () => {
    it('should GET /v1/user', async () => {
      const user = { id: 'u1', email: 'a@b.com', firstName: 'Test', lastName: 'User', createdAt: '', updatedAt: '', projectId: null, emailVerified: true, avatarUrl: null, preferences: null };
      const fn = mockFetch({ ok: true, user });
      const client = new SlyxupClient({ apiUrl: 'http://localhost' });
      const res = await client.users.me();
      expect(fn).toHaveBeenCalledWith('http://localhost/v1/user', expect.anything());
      expect(res.user).toEqual(user);
    });

    it('should throw UnauthorizedError when no user', async () => {
      mockFetch({ ok: true, error: 'Not found' });
      const client = new SlyxupClient({ apiUrl: 'http://localhost' });
      await expect(client.users.me()).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('users.update', () => {
    it('should PATCH /v1/user with JSON body', async () => {
      const fn = mockFetch({ ok: true, user: { id: 'u1', firstName: 'Jane' } });
      const client = new SlyxupClient({ apiUrl: 'http://localhost' });
      await client.users.update({ firstName: 'Jane' });
      expect(fn).toHaveBeenCalledWith(
        'http://localhost/v1/user',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ firstName: 'Jane' }) })
      );
    });
  });

  describe('users.delete', () => {
    it('should DELETE /v1/user', async () => {
      const fn = mockFetch({ ok: true });
      const client = new SlyxupClient({ apiUrl: 'http://localhost' });
      const res = await client.users.delete();
      expect(fn).toHaveBeenCalledWith('http://localhost/v1/user', expect.objectContaining({ method: 'DELETE' }));
      expect(res).toEqual({ ok: true });
    });
  });

  describe('cookie jar', () => {
    it('should capture Set-Cookie and forward as Cookie header', async () => {
      const fn = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
            get: (key: string) => key.toLowerCase() === 'set-cookie' ? 'slyxup_session=abc123; Path=/; HttpOnly' : null,
          },
          json: () => Promise.resolve({ ok: true, user: { id: 'u1', email: 'a@b.com' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => null },
          json: () => Promise.resolve({ ok: true, user: { id: 'u1', email: 'a@b.com' }, session: { id: 's1', expiresAt: '2030' } }),
        });
      global.fetch = fn;
      const client = new SlyxupClient({ apiUrl: 'http://localhost' });
      await client.auth.signIn({ email: 'a@b.com', password: 'pass' });
      await client.sessions.get();
      expect(fn).toHaveBeenCalledTimes(2);
      const secondCall = fn.mock.calls[1] as any[];
      expect(secondCall[1].headers).toMatchObject({ Cookie: 'slyxup_session=abc123' });
    });
  });

  describe('error handling', () => {
    it('should throw RateLimitError on 429', async () => {
      mockFetch({ error: 'rate limited' }, { ok: false, status: 429 });
      const client = new SlyxupClient({ apiUrl: 'http://localhost' });
      await expect(client.sessions.get()).rejects.toThrow(RateLimitError);
    });

    it('should throw NetworkError when fetch rejects', async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
      const client = new SlyxupClient({ apiUrl: 'http://localhost' });
      await expect(client.auth.signIn({ email: 'a', password: 'b' })).rejects.toThrow(NetworkError);
    });

    it('should throw SlyxupError on 500 with error message', async () => {
      mockFetch({ error: 'Server error' }, { ok: false, status: 500 });
      const client = new SlyxupClient({ apiUrl: 'http://localhost' });
      try {
        await client.sessions.get();
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(SlyxupError);
        expect((e as SlyxupError).status).toBe(500);
        expect((e as SlyxupError).code).toBe('api_error');
        expect((e as SlyxupError).message).toBe('Server error');
      }
    });

    it('should handle invalid JSON gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: () => Promise.reject(new Error('not json')),
      });
      const client = new SlyxupClient({ apiUrl: 'http://localhost' });
      await expect(client.sessions.get()).rejects.toThrow(UnauthorizedError);
    });
  });
});
