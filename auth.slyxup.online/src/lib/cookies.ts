export const SESSION_COOKIE = 'slyxup_session';
/** Host-only cookie name (preferred) — prevents cross-subdomain leakage */
export const SESSION_COOKIE_HOST = '__Host-slyxup_session';

/** Apex domain of the requesting host (e.g. `slyxup.online`) so the session
 * cookie is shared across product subdomains. Empty for localhost/IPs and
 * when isolation is desired (per-platform cookies). */
function parentDomain(host: string): string {
  const h = host.split(':')[0].toLowerCase();
  if (!h || h === 'localhost' || h.endsWith('.localhost')) return '';
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.startsWith('[')) return '';
  const parts = h.split('.');
  return `.${parts.slice(-2).join('.')}`;
}

/**
 * Get session token with per-platform isolation:
 * 1) Authorization Bearer is authoritative per-app (localStorage, SDK)
 *    → each platform keeps its own token in its own origin's localStorage
 *    → prevents cookie overwrite when same browser logs into two platforms
 * 2) Host-only cookie (__Host-) preferred
 * 3) Legacy slyxup_session fallback (for old clients)
 *
 * Domain cookies (`.slyxup.online`) are deprecated for isolation — host-only
 * is default. Cookie is host-only unless explicitly shared via env flag.
 */
export function getSessionToken(c: {
  req: { header: (n: string) => string | undefined };
}): string | undefined {
  // Per-platform isolation: Bearer wins over shared cookie
  const auth = c.req.header('Authorization');
  if (auth?.startsWith('Bearer ')) {
    const bearer = auth.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookie = c.req.header('Cookie') ?? '';
  // Prefer host cookie first
  const hostMatch = cookie.match(new RegExp(`${SESSION_COOKIE_HOST}=([^;]+)`));
  if (hostMatch) return decodeURIComponent(hostMatch[1]);
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (match) return decodeURIComponent(match[1]);
  return undefined;
}

export function setSessionCookie(
  c: {
    req: { header: (n: string) => string | undefined };
    header: (n: string, v: string) => void;
  },
  token: string,
  expiresAt: Date
) {
  const host = (c.req.header('Host') ?? '').split(':')[0].toLowerCase();
  const isLocalhost =
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const expires = expiresAt.toUTCString();
  // Host-only Secure cookie — isolated per host (auth.slyxup.online vs stack.slyxup.online)
  // No Domain attribute = host-only, prevents `.slyxup.online` cross-platform overwrite.
  // For local dev we also omit Domain.
  // Use __Host- prefix when secure (requires Secure + Path=/ + no Domain) — ideal isolation.
  const useHostPrefix = !isLocalhost; // __Host requires Secure, which localhost dev may lack over http
  const cookieName = useHostPrefix ? SESSION_COOKIE_HOST : SESSION_COOKIE;
  const parts = [
    `${cookieName}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Expires=${expires}`,
  ];
  // IMPORTANT: do NOT set Domain for isolation. Only set Domain if explicitly
  // enabled via legacy behavior — currently disabled to fix overwrite bug.
  // Previously we set Domain=.slyxup.online which made every login overwrite
  // the single shared cookie across all platforms in same browser.
  const value = parts.join('; ');
  c.header('Set-Cookie', value);
  // Also set legacy cookie for backwards compat during rollout (both names)
  // Legacy clients reading slyxup_session continue to work until they upgrade.
  if (useHostPrefix) {
    const legacy = `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}`;
    c.header('Set-Cookie', legacy);
  }
}

export function clearSessionCookie(c: {
  req: { header: (n: string) => string | undefined };
  header: (n: string, v: string) => void;
}) {
  const host = (c.req.header('Host') ?? '').split(':')[0].toLowerCase();
  const isLocalhost =
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const useHostPrefix = !isLocalhost;
  const cookieName = useHostPrefix ? SESSION_COOKIE_HOST : SESSION_COOKIE;
  c.header(
    'Set-Cookie',
    `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
  if (useHostPrefix) {
    c.header(
      'Set-Cookie',
      `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
    );
  }
}
