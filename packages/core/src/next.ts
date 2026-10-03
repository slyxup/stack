// Server helpers use Web APIs and work in Next.js middleware and Workers.
import { SlyxupClient } from './client.js';

export const SESSION_COOKIE_NAME = 'slyxup_session';

export interface SlyxupNextOptions {
  apiUrl?: string;
  publishableKey?: string;
}

export function createSessionCookie(
  token: string,
  maxAge = 7 * 24 * 60 * 60
): string {
  if (!token || !/^[A-Za-z0-9._~-]+$/.test(token))
    throw new TypeError('Invalid session token');
  if (!Number.isSafeInteger(maxAge) || maxAge <= 0)
    throw new TypeError('Invalid cookie lifetime');
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export interface SlyxupMiddlewareOptions extends SlyxupNextOptions {
  /** Exact paths; use /docs/* explicitly to include descendants. */
  publicRoutes?: string[];
}

function readToken(req: Request): string | undefined {
  for (const name of ['__Host-slyxup_session', SESSION_COOKIE_NAME]) {
    const value = req.headers
      .get('cookie')
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`));
    if (value) {
      try {
        return decodeURIComponent(value.slice(name.length + 1)) || undefined;
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/** Validate the incoming application's HttpOnly session cookie with the auth API. */
export async function getServerSession(
  req: Request,
  options: SlyxupNextOptions = {}
) {
  const sessionToken = readToken(req);
  if (!sessionToken) return null;
  const client = new SlyxupClient({ ...options, sessionToken });
  try {
    return await client.sessions.get();
  } catch (error) {
    if (
      error instanceof Error &&
      'status' in error &&
      (error.status === 401 || error.status === 403)
    )
      return null;
    throw error;
  }
}

export function slyxupMiddleware(options?: SlyxupMiddlewareOptions) {
  return async function middleware(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const isPublic = (options?.publicRoutes ?? ['/sign-in', '/']).some((r) =>
      r.endsWith('/*')
        ? url.pathname === r.slice(0, -2) ||
          url.pathname.startsWith(r.slice(0, -1))
        : url.pathname === r
    );
    if (isPublic)
      return new Response(null, { headers: { 'x-middleware-next': '1' } });
    try {
      if (await getServerSession(req, options))
        return new Response(null, { headers: { 'x-middleware-next': '1' } });
    } catch {
      return new Response('Authentication service unavailable', {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      });
    }
    const target = new URL('/sign-in', url);
    target.searchParams.set('returnTo', url.pathname + url.search);
    return new Response(null, {
      status: 307,
      headers: { Location: target.href, 'Cache-Control': 'no-store' },
    });
  };
}
