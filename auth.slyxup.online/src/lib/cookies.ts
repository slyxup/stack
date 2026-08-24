export const SESSION_COOKIE = 'slyxup_session';

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
  c: { header: (n: string, v: string) => void },
  token: string,
  expiresAt: Date
) {
  const isProd = true; // Workers always Secure
  const expires = expiresAt.toUTCString();
  const value = `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}`;
  c.header('Set-Cookie', value);
}

export function clearSessionCookie(c: {
  header: (n: string, v: string) => void;
}) {
  c.header(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
}
