// Merged from @slyxup/nextjs — server helpers + middleware + cookies, now part of core.
// Import from '@slyxup/core/next'. Old '@slyxup/nextjs' re-exports this.

export const SESSION_COOKIE_NAME = 'slyxup_session';

export interface SlyxupNextOptions {
  apiUrl?: string;
  publishableKey?: string;
}

function baseApiUrl(_options?: SlyxupNextOptions): string {
  return 'https://auth.slyxup.online';
}

export function createSessionCookie(
  token: string,
  maxAge = 7 * 24 * 60 * 60
): string {
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export interface SlyxupMiddlewareOptions extends SlyxupNextOptions {
  publicRoutes?: string[];
}

export function slyxupMiddleware(options?: SlyxupMiddlewareOptions) {
  return function middleware(req: {
    cookies?: Record<string, string>;
    url: string;
  }) {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    const isPublic = (options?.publicRoutes ?? ['/sign-in', '/']).some((r) =>
      req.url.includes(r)
    );
    if (!token && !isPublic) return { redirect: '/sign-in' as const };
    return { next: true as const };
  };
}
