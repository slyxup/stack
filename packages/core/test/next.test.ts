import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSessionCookie, getServerSession, slyxupMiddleware } from '../src/next';

afterEach(() => vi.unstubAllGlobals());
describe('server route protection', () => {
  it.each(['/private', '/private?returnTo=/sign-in', '/sign-in-admin'])('protects %s despite public root and query strings', async (path) => {
    const response = await slyxupMiddleware()(new Request(`https://app.example${path}`));
    expect(response.status).toBe(307);
  });
  it('matches explicit public subtrees without matching sibling prefixes', async () => {
    const middleware = slyxupMiddleware({ publicRoutes: ['/docs/*'] });
    expect((await middleware(new Request('https://app.example/docs/start'))).headers.get('x-middleware-next')).toBe('1');
    expect((await middleware(new Request('https://app.example/docs-private'))).status).toBe(307);
  });
  it('validates cookies against the configured auth service', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: true, user: { id: 'u' }, session: { id: 's' } }));
    vi.stubGlobal('fetch', fetcher);
    const result = await getServerSession(new Request('https://app.example/private', { headers: { cookie: 'slyxup_session=token' } }), { apiUrl: 'https://auth.example', publishableKey: 'pk_a' });
    expect(result?.session.id).toBe('s');
    expect(fetcher).toHaveBeenCalledWith('https://auth.example/v1/session', expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer token', 'x-publishable-key': 'pk_a' }) }));
  });
  it('does not trust a forged cookie', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Invalid session' }, { status: 401 })));
    expect((await slyxupMiddleware()(new Request('https://app.example/private', { headers: { cookie: 'slyxup_session=forged' } }))).status).toBe(307);
  });
  it('fails closed on an auth outage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect((await slyxupMiddleware()(new Request('https://app.example/private', { headers: { cookie: 'slyxup_session=token' } }))).status).toBe(503);
  });
  it('rejects cookie attribute injection', () => {
    expect(() => createSessionCookie('token; Domain=evil.example')).toThrow();
  });
});
