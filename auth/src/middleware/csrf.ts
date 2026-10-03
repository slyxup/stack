import type { Context, Next } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { randomToken, timingSafeEqual } from '../lib/crypto';

const COOKIE_NAME = 'slyxup_csrf';
const HEADER_NAME = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Paths that never require CSRF (signature-validated or server-to-server). */
const EXEMPT_PREFIXES = [
  '/v1/webhooks/',
  '/v1/oauth/', // OAuth start/callback use state+PKCE, not cookies
  '/health',
  '/v1/health',
  '/v1/project-environment/',
];

function isExempt(path: string): boolean {
  return EXEMPT_PREFIXES.some((p) => path === p || path.startsWith(p));
}

/** Machine-to-machine calls (secret keys) are not cookie-based → not CSRF-able. */
function isMachineCall(c: Context): boolean {
  const auth = c.req.header('Authorization') ?? '';
  if (auth.startsWith('Bearer sk_')) return true;
  if (c.req.header('X-Secret-Key')) return true;
  const bootstrap = c.req.header('X-Bootstrap-Token');
  if (bootstrap) return true;
  return false;
}

/**
 * CSRF protection via double-submit cookie.
 *
 * - GET/HEAD/OPTIONS: ensure the `slyxup_csrf` cookie exists, expose its
 *   value in the `X-CSRF-Token` response header.
 * - POST/PUT/PATCH/DELETE: require `X-CSRF-Token` header === cookie value
 *   (constant-time compare). Missing/invalid → 403 CSRF_TOKEN_INVALID.
 * - Skips machine-to-machine (secret key) and exempt paths.
 */
export async function csrfMiddleware(c: Context, next: Next) {
  const path = new URL(c.req.url).pathname;

  // NOTE: headers/cookies must be set AFTER `await next()` (or on an early
  // return). Setting them before next() mutates a placeholder response that
  // the route handler discards when it returns its own Response.
  //
  // Exemptions apply to MUTATIONS only (webhooks are HMAC-signed, OAuth
  // uses state+PKCE). Safe methods always mint/expose the token — including
  // /v1/health, which SDKs probe to bootstrap the token on first use.
  if (isMachineCall(c)) {
    await next();
    return;
  }

  let token = getCookie(c, COOKIE_NAME);
  let minted = false;
  if (!token) {
    token = randomToken(32);
    minted = true;
  }

  if (!SAFE_METHODS.has(c.req.method)) {
    if (isExempt(path)) {
      await next();
      // Still expose the token for convenience.
      c.res.headers.set('X-CSRF-Token', token);
      return;
    }
    const headerToken =
      c.req.header('X-CSRF-Token') ?? c.req.header(HEADER_NAME);
    if (!headerToken || !timingSafeEqual(headerToken, token)) {
      if (minted) {
        const isHttps = new URL(c.req.url).protocol === 'https:';
        setCookie(c, COOKIE_NAME, token, {
          httpOnly: false, // JS must read it to echo in the header
          secure: isHttps, // allow http on localhost dev
          sameSite: 'Lax',
          maxAge: 60 * 60 * 24, // 24h
          path: '/',
        });
      }
      return c.json(
        {
          ok: false,
          error: 'CSRF_TOKEN_INVALID',
          message:
            'CSRF token missing or invalid. Read the slyxup_csrf cookie (or X-CSRF-Token response header) and send it as the X-CSRF-Token header.',
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
  // Expose current token for SDK capture (safe to overwrite header).
  c.res.headers.set('X-CSRF-Token', token);
}
