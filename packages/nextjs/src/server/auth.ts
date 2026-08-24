import { SlyxupClient } from '@slyxup/core';
import type { SessionResponse, SlyxupUser, UserResponse } from '@slyxup/core';

export const SESSION_COOKIE_NAME = 'slyxup_session';

export interface SlyxupNextOptions {
  apiUrl?: string;
  publishableKey?: string;
}

function apiUrl(options?: SlyxupNextOptions): string {
  return (
    options?.apiUrl ??
    process.env.NEXT_PUBLIC_SLYXUP_API_URL ??
    'https://auth.slyxup.online'
  ).replace(/\/$/, '');
}

/** Read the session token from Next.js request cookies (Server Components / Route Handlers). */
export async function getSessionToken(): Promise<string | undefined> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value;
}

export interface AuthResult {
  session: SessionResponse['session'];
  user: Pick<SlyxupUser, 'id' | 'email'>;
}

/**
 * Get the current auth session in a Server Component / Server Action / Route Handler.
 * Returns null when not signed in.
 *
 * ```ts
 * // app/dashboard/page.tsx
 * import { auth } from '@slyxup/nextjs/server';
 * export default async function Page() {
 *   const session = await auth();
 *   if (!session) redirect('/sign-in');
 *   return <p>Hello {session.user.email}</p>;
 * }
 * ```
 */
export async function auth(
  options?: SlyxupNextOptions
): Promise<AuthResult | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const res = await fetch(`${apiUrl(options)}/v1/session`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<SessionResponse>;
    if (!data.user || !data.session) return null;
    return {
      session: { id: data.session.id, expiresAt: data.session.expiresAt },
      user: data.user,
    };
  } catch {
    return null;
  }
}

/**
 * Get the full current user.
 * Returns null when not signed in.
 *
 * ```ts
 * import { currentUser } from '@slyxup/nextjs/server';
 * const user = await currentUser();
 * if (user) console.log(user.firstName);
 * ```
 */
export async function currentUser(
  options?: SlyxupNextOptions
): Promise<SlyxupUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const res = await fetch(`${apiUrl(options)}/v1/user`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<UserResponse>;
    return data.user ?? null;
  } catch {
    return null;
  }
}

/** Require an authenticated user or throw — use inside Server Actions. */
export async function requireUser(
  options?: SlyxupNextOptions
): Promise<SlyxupUser> {
  const user = await currentUser(options);
  if (!user) throw new Error('Unauthorized: no SlyxUp session');
  return user;
}
