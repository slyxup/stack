export const SESSION_COOKIE = 'slyxup_session';

/** Apex domain of the requesting host (e.g. `slyxup.online`) so the session
 * cookie is shared across product subdomains. Empty for localhost/IPs. */
function parentDomain(host: string): string {
  const h = host.split(':')[0].toLowerCase();
  if (!h || h === 'localhost' || h.endsWith('.localhost')) return '';
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.startsWith('[')) return '';
  const parts = h.split('.');
  return `.${parts.slice(-2).join('.')}`;
}

export function getSessionToken(c: {
  req: { header: (n: string) => string | undefined };
}): string | undefined {
  const cookie = c.req.header('Cookie') ?? '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (match) return decodeURIComponent(match[1]);
  const auth = c.req.header('Authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
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
  const domain = parentDomain(c.req.header('Host') ?? '');
  const expires = expiresAt.toUTCString();
  const value = `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Domain=${domain}; Expires=${expires}`;
  c.header('Set-Cookie', value);
}

export function clearSessionCookie(c: {
  req: { header: (n: string) => string | undefined };
  header: (n: string, v: string) => void;
}) {
  const domain = parentDomain(c.req.header('Host') ?? '');
  c.header(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Domain=${domain}; Max-Age=0`
  );
}
