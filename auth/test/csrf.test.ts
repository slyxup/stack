import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { csrfMiddleware } from '../src/middleware/csrf';

function app() {
  return new Hono()
    .use('/v1/*', csrfMiddleware)
    .get('/v1/health', (c) => c.json({ ok: true }))
    .post('/v1/auth/sign-in', (c) => c.json({ ok: true }))
    .post('/v1/verification/resend', (c) => c.json({ ok: true }))
    // Authenticated endpoint (requires session) — CSRF applies when the
    // request carries a session cookie.
    .post('/v1/user/password', (c) => c.json({ ok: true }));
}

function tokenFromSetCookie(res: Response): string | undefined {
  const setCookie = res.headers.get('set-cookie') ?? '';
  const m = setCookie.match(/slyxup_csrf=([^;]+)/);
  return m?.[1];
}

const SESSION = 'slyxup_session=some-session-token';

describe('CSRF double-submit protection (Week 1 Day 2)', () => {
  it('mints a cookie + header token on safe methods', async () => {
    const res = await app().request('/v1/health');
    expect(res.status).toBe(200);
    expect(tokenFromSetCookie(res)).toBeTruthy();
    expect(res.headers.get('X-CSRF-Token')).toBeTruthy();
  });

  it('rejects cookie-authenticated mutations without a token', async () => {
    const res = await app().request('/v1/user/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: SESSION },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('CSRF_TOKEN_INVALID');
  });

  it('rejects cookie-authenticated mutations with a mismatched token', async () => {
    const res = await app().request('/v1/user/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION}; slyxup_csrf=real-token-value-1234567890`,
        'X-CSRF-Token': 'forged-token',
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(403);
  });

  it('accepts cookie-authenticated mutations echoing the cookie value', async () => {
    const server = app();
    const probe = await server.request('/v1/health');
    const token = tokenFromSetCookie(probe) ?? probe.headers.get('X-CSRF-Token')!;
    const res = await server.request('/v1/user/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION}; slyxup_csrf=${token}`,
        'X-CSRF-Token': token,
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
  });

  it('lets public auth endpoints through without any token', async () => {
    for (const path of ['/v1/auth/sign-in', '/v1/verification/resend']) {
      const res = await app().request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);
    }
  });

  it('lets Bearer-authenticated (cookieless) mutations through', async () => {
    // Project SDKs use per-origin Bearer tokens, which browsers never attach
    // automatically — nothing CSRF can forge, so no token is required.
    const res = await app().request('/v1/user/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer sess_abc123',
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
  });

  it('exempts machine-to-machine secret-key calls', async () => {
    const res = await app().request('/v1/user/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer sk_test123',
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
  });
});
