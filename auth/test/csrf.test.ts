import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { csrfMiddleware } from '../src/middleware/csrf';

function app() {
  return new Hono()
    .use('/v1/*', csrfMiddleware)
    .get('/v1/health', (c) => c.json({ ok: true }))
    .post('/v1/auth/sign-in', (c) => c.json({ ok: true }));
}

function tokenFromSetCookie(res: Response): string | undefined {
  const setCookie = res.headers.get('set-cookie') ?? '';
  const m = setCookie.match(/slyxup_csrf=([^;]+)/);
  return m?.[1];
}

describe('CSRF double-submit protection (Week 1 Day 2)', () => {
  it('mints a cookie + header token on safe methods', async () => {
    const res = await app().request('/v1/health');
    expect(res.status).toBe(200);
    expect(tokenFromSetCookie(res)).toBeTruthy();
    expect(res.headers.get('X-CSRF-Token')).toBeTruthy();
  });

  it('rejects mutations without a token', async () => {
    const res = await app().request('/v1/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('CSRF_TOKEN_INVALID');
  });

  it('rejects mutations with a mismatched token', async () => {
    const res = await app().request('/v1/auth/sign-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'slyxup_csrf=real-token-value-1234567890',
        'X-CSRF-Token': 'forged-token',
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(403);
  });

  it('accepts mutations echoing the cookie value', async () => {
    const server = app();
    const probe = await server.request('/v1/health');
    const token = tokenFromSetCookie(probe) ?? probe.headers.get('X-CSRF-Token')!;
    const res = await server.request('/v1/auth/sign-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `slyxup_csrf=${token}`,
        'X-CSRF-Token': token,
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
  });

  it('exempts machine-to-machine secret-key calls', async () => {
    const res = await app().request('/v1/auth/sign-in', {
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
