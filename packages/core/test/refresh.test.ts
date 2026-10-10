import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlyxupClient } from '../src/client.js';
import { UnauthorizedError } from '../src/errors.js';

/**
 * 24h access + 7d refresh behaviour.
 *
 * These pin the contract platforms rely on: the client keeps the refresh
 * token, rotates it on 401, and retries the original request once — so a
 * lapsed access token never surfaces as a logout.
 */
function jsonResponse(
  data: unknown,
  init?: { ok?: boolean; status?: number }
): Response {
  return {
    ok: init?.ok ?? (init?.status ?? 200) < 400,
    status: init?.status ?? 200,
    headers: { get: () => null },
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

describe('session refresh', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('signIn stores both access and refresh tokens', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        user: { id: 'u1', email: 'a@b.com' },
        sessionToken: 'access-1',
        refreshToken: 'refresh-1',
      })
    );
    const client = new SlyxupClient({ apiUrl: 'http://localhost' });
    await client.auth.signIn({ email: 'a@b.com', password: '12345678' });
    expect(client.getToken()).toBe('access-1');
    expect(client.getRefreshToken()).toBe('refresh-1');
  });

  it('accepts a refreshToken restored by the host app', () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const client = new SlyxupClient({
      apiUrl: 'http://localhost',
      sessionToken: 'access-restored',
      refreshToken: 'refresh-restored',
    });
    expect(client.getRefreshToken()).toBe('refresh-restored');
  });

  it('refresh() POSTs to /v1/auth/refresh and swaps the pair', async () => {
    const fn = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        sessionToken: 'access-2',
        refreshToken: 'refresh-2',
      })
    );
    global.fetch = fn;
    const client = new SlyxupClient({
      apiUrl: 'http://localhost',
      sessionToken: 'access-1',
      refreshToken: 'refresh-1',
    });
    await expect(client.refresh()).resolves.toBe(true);
    expect(fn.mock.calls[0][0]).toBe('http://localhost/v1/auth/refresh');
    const body = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ refreshToken: 'refresh-1' });
    expect(client.getToken()).toBe('access-2');
    expect(client.getRefreshToken()).toBe('refresh-2');
  });

  it('refresh() resolves false when no refresh token is stored', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const client = new SlyxupClient({ apiUrl: 'http://localhost' });
    await expect(client.refresh()).resolves.toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('401 triggers a refresh then retries the original request', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: false }, { status: 401 }))
      .mockResolvedValueOnce(
        jsonResponse({ ok: true, sessionToken: 'access-2', refreshToken: 'refresh-2' })
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true, user: { id: 'u1' } }));
    global.fetch = fn;
    const client = new SlyxupClient({
      apiUrl: 'http://localhost',
      sessionToken: 'access-1',
      refreshToken: 'refresh-1',
    });
    const me = await client.users.me();
    expect('user' in me).toBe(true);
    expect(fn).toHaveBeenCalledTimes(3);
    expect(fn.mock.calls[1][0]).toBe('http://localhost/v1/auth/refresh');
    expect(fn.mock.calls[2][0]).toBe('http://localhost/v1/user');
    expect(client.getToken()).toBe('access-2');
  });

  it('does not retry when refresh fails — surfaces the 401', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: false }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ ok: false }, { status: 401 }));
    global.fetch = fn;
    const client = new SlyxupClient({
      apiUrl: 'http://localhost',
      sessionToken: 'access-1',
      refreshToken: 'refresh-1',
    });
    await expect(client.users.me()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('never refreshes the refresh endpoint itself (no loop)', async () => {
    const fn = vi.fn().mockResolvedValue(
      jsonResponse({ ok: false }, { status: 401 })
    );
    global.fetch = fn;
    const client = new SlyxupClient({
      apiUrl: 'http://localhost',
      sessionToken: 'access-1',
      refreshToken: 'refresh-1',
    });
    // Exactly one attempt: a second call means it attacked its own endpoint.
    await expect(client.refresh()).resolves.toBe(false);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0]).toBe('http://localhost/v1/auth/refresh');
    // The stale pair survives a failed refresh (no destructive clear).
    expect(client.getToken()).toBe('access-1');
    expect(client.getRefreshToken()).toBe('refresh-1');
  });

  it('signOut clears the stored pair', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const client = new SlyxupClient({
      apiUrl: 'http://localhost',
      sessionToken: 'access-1',
      refreshToken: 'refresh-1',
    });
    await client.auth.signOut();
    expect(client.getToken()).toBeUndefined();
    expect(client.getRefreshToken()).toBeUndefined();
  });
});
