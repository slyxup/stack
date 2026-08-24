export const SESSION_COOKIE_NAME = 'slyxup_session';

export interface SessionCookieOptions {
  maxAge?: number; // seconds, default 7 days
  domain?: string;
  secure?: boolean;
}

/** Serialize a session cookie Set-Cookie header value (Route Handlers / Server Actions). */
export function createSessionCookie(
  token: string,
  options: SessionCookieOptions = {}
): string {
  const maxAge = options.maxAge ?? 60 * 60 * 24 * 7;
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (options.secure !== false) parts.push('Secure');
  if (options.domain) parts.push(`Domain=${options.domain}`);
  return parts.join('; ');
}

/** Clear-cookie header value. */
export function clearSessionCookie(options: SessionCookieOptions = {}): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (options.secure !== false) parts.push('Secure');
  if (options.domain) parts.push(`Domain=${options.domain}`);
  return parts.join('; ');
}
