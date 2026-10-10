import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { clearSessionCookie, getSessionToken, setSessionCookie } from '../src/lib/cookies';

describe('session cookies', () => {
  it.each(['other_slyxup_session=wrong', 'slyxup_session=%ZZ'])('ignores invalid cookie %s', (cookie) => {
    expect(getSessionToken({ req: { header: (name) => name === 'Cookie' ? cookie : undefined } })).toBeUndefined();
  });
  it('sets and clears both host and legacy cookies without overwriting', async () => {
    const app = new Hono().get('/set', (c) => { setSessionCookie(c, 'token', new Date(Date.now() + 60000)); return c.text('ok'); }).get('/clear', (c) => { clearSessionCookie(c); return c.text('ok'); });
    {
      const response = await app.request('/set', { headers: { Host: 'auth.example.com' } });
      const cookies = response.headers.getSetCookie();
      expect(cookies).toHaveLength(2);
      expect(cookies[0]).toContain('__Host-slyxup_session=');
      expect(cookies[1]).toMatch(/^slyxup_session=/);
    }
    {
      // Clearing also revokes the refresh pair (host + legacy).
      const response = await app.request('/clear', { headers: { Host: 'auth.example.com' } });
      const cookies = response.headers.getSetCookie();
      expect(cookies).toHaveLength(4);
      expect(cookies[0]).toContain('__Host-slyxup_session=;');
      expect(cookies[1]).toMatch(/^slyxup_session=;/);
      expect(cookies[2]).toContain('__Host-slyxup_refresh=;');
      expect(cookies[3]).toMatch(/^slyxup_refresh=;/);
    }
  });
});
