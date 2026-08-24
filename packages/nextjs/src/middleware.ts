import { type NextRequest, NextResponse } from 'next/server';

export const SESSION_COOKIE_NAME = 'slyxup_session';

export interface SlyxupMiddlewareOptions {
  /** Paths that require a session. Default: everything except public paths. */
  protectedPaths?: string[];
  /** Public paths always allowed (default: /, /sign-in, /sign-up, /api/auth). */
  publicPaths?: string[];
  /** Where to redirect unauthenticated users. Default: /sign-in */
  signInUrl?: string;
  /** Where to redirect after sign-in. Default: original path */
  afterSignInUrl?: string;
  /** API base URL for session verification. Default: NEXT_PUBLIC_SLYXUP_API_URL or https://auth.slyxup.online */
  apiUrl?: string;
}

function isPublic(
  pathname: string,
  options?: SlyxupMiddlewareOptions
): boolean {
  const defaults = ['/', '/sign-in', '/sign-up', '/verify', '/forgot-password'];
  const pub = [...defaults, ...(options?.publicPaths ?? [])];
  const prot = options?.protectedPaths;
  if (prot && prot.length > 0) {
    // If explicit protected list given, everything else is public
    return !prot.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }
  return pub.some((p) => pathname === p || pathname.startsWith('/api/auth'));
}

/**
 * Next.js middleware factory.
 *
 * ```ts
 * // middleware.ts
 * import { slyxupMiddleware } from '@slyxup/nextjs/middleware';
 * export default slyxupMiddleware();
 * export const config = { matcher: ['/((?!_next|favicon.ico).*)'] };
 * ```
 */
export function slyxupMiddleware(options?: SlyxupMiddlewareOptions) {
  return async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (isPublic(pathname, options)) return NextResponse.next();

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return redirectToSignIn(req, options);

    const api = (
      options?.apiUrl ??
      process.env.NEXT_PUBLIC_SLYXUP_API_URL ??
      'https://auth.slyxup.online'
    ).replace(/\/$/, '');
    try {
      const res = await fetch(`${api}/v1/session`, {
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
        cache: 'no-store',
      });
      if (!res.ok) return redirectToSignIn(req, options);
      return NextResponse.next();
    } catch {
      return redirectToSignIn(req, options);
    }
  };
}

function redirectToSignIn(req: NextRequest, options?: SlyxupMiddlewareOptions) {
  const signInPath = options?.signInUrl ?? '/sign-in';
  const url = req.nextUrl.clone();
  url.pathname = signInPath;
  url.searchParams.set('redirect_url', req.nextUrl.pathname);
  return NextResponse.redirect(url);
}
