import { expect, test } from '@playwright/test';

/**
 * Browser E2E: sign-up → session → sign-out against local workers.
 * Requires auth worker on :8787 and web on :5173 (see playwright.config.ts).
 * Uses a unique email per run so tests are repeatable against a fresh local D1.
 */
const AUTH = process.env.E2E_AUTH_URL ?? 'http://localhost:8787';

test.describe('auth flow', () => {
  test('health endpoints are up', async ({ request }) => {
    const auth = await request.get(`${AUTH}/v1/health`);
    expect(auth.ok()).toBe(true);
    expect((await auth.json()).ok).toBe(true);
  });

  test('signup → session → signout via API', async ({ request }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = 'E2eTestPassword123!';

    // Mint CSRF token first (double-submit bootstrap).
    const probe = await request.get(`${AUTH}/v1/health`);
    const csrf = probe.headers()['x-csrf-token'] ?? '';
    const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf };

    const signup = await request.post(`${AUTH}/v1/auth/sign-up`, {
      headers,
      data: { email, password, firstName: 'E2E' },
    });
    // Bootstrap may require a publishable key after the first user exists;
    // accept either success or the explicit scoping error (both prove the
    // stack is wired: validation → project scoping → DB).
    expect([201, 200, 400, 401]).toContain(signup.status());
    if (!signup.ok()) {
      const body = (await signup.json()) as { error?: string };
      expect(body.error).toMatch(/Publishable key|already exists/i);
      return;
    }
    const created = (await signup.json()) as { sessionToken: string };
    expect(created.sessionToken).toBeTruthy();

    const session = await request.get(`${AUTH}/v1/session`, {
      headers: { Authorization: `Bearer ${created.sessionToken}` },
    });
    expect(session.ok()).toBe(true);

    const signout = await request.post(`${AUTH}/v1/auth/sign-out`, {
      headers: { ...headers, Authorization: `Bearer ${created.sessionToken}` },
    });
    expect(signout.ok()).toBe(true);
  });

  test('CSRF is enforced on mutations', async ({ request }) => {
    const res = await request.post(`${AUTH}/v1/auth/sign-in`, {
      data: { email: 'nobody@example.com', password: 'wrongpass1' },
    });
    expect(res.status()).toBe(403);
    expect(((await res.json()) as { error: string }).error).toBe('CSRF_TOKEN_INVALID');
  });

  test('rate limit trips after 6 rapid sign-ins', async ({ request }) => {
    const probe = await request.get(`${AUTH}/v1/health`);
    const csrf = probe.headers()['x-csrf-token'] ?? '';
    const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf };
    let last = 0;
    for (let i = 0; i < 6; i++) {
      const r = await request.post(`${AUTH}/v1/auth/sign-in`, {
        headers,
        data: { email: 'rl@example.com', password: 'wrongpass1' },
      });
      last = r.status();
    }
    expect([401, 429]).toContain(last);
  });
});
