import type { Context, Next } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { randomToken, timingSafeEqualStr } from '../lib/crypto';

const COOKIE_NAME = 'slyxup_csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Paths that never require CSRF (signature-validated or server-to-server). */
const EXEMPT_PREFIXES = ['/v1/webhooks/', '/health', '/v1/health'];

function isExempt(path: string): boolean {
  return EXEMPT_PREFIXES.some((p) => path === p || path.startsWith(p));
}

function isMachineCall(c: Context): boolean {
  const auth = c.req.header('Authorization') ?? '';
  if (auth.startsWith('Bearer sk_')) return true;
  if (c.req.header('X-Secret-Key')) return true;
  return false;
}

/** Double-submit cookie CSRF protection (mirrors auth worker). */
export async function csrfMiddleware(c: Context, next: Next) {
  // NOTE: set cookies/headers AFTER `await next()` — pre-next mutations
  // land on a placeholder response the handler discards.
  //
  // Exemptions apply to MUTATIONS only. Safe methods always mint/expose the
  // token so SDKs can bootstrap via GET /v1/health.
  if (isMachineCall(c)) {
    await next();
    return;
  }

  const path = new URL(c.req.url).pathname;
  let token = getCookie(c, COOKIE_NAME);
  let minted = false;
  if (!token) {
    token = randomToken(32);
    minted = true;
  }

  if (!SAFE_METHODS.has(c.req.method)) {
    if (isExempt(path)) {
      await next();
      c.res.headers.set('X-CSRF-Token', token);
      return;
    }
    const headerToken =
      c.req.header('X-CSRF-Token') ?? c.req.header('x-csrf-token');
    if (!headerToken || !timingSafeEqualStr(headerToken, token)) {
      if (minted) {
        const isHttps = new URL(c.req.url).protocol === 'https:';
        setCookie(c, COOKIE_NAME, token, {
          httpOnly: false,
          secure: isHttps,
          sameSite: 'Lax',
          maxAge: 60 * 60 * 24,
          path: '/',
        });
      }
      return c.json(
        {
          ok: false,
          error: 'CSRF_TOKEN_INVALID',
          message: 'CSRF token missing or invalid. Send X-CSRF-Token header.',
        },
        403
      );
    }
  }

  await next();
  if (minted) {
    const isHttps = new URL(c.req.url).protocol === 'https:';
    setCookie(c, COOKIE_NAME, token, {
      httpOnly: false,
      secure: isHttps,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
  }
  c.res.headers.set('X-CSRF-Token', token);
}
