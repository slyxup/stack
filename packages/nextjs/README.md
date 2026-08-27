# @slyxup/nextjs

Next.js (App Router + Pages Router) helpers for SlyxUp Auth — server-side session reads, route protection middleware, and cookie utilities. Built on [`@slyxup/core`](../core).

## Install

```bash
npm install @slyxup/nextjs
```

> Peer: `next ^14 || ^15`. Set `NEXT_PUBLIC_SLYXUP_API_URL=https://auth.slyxup.online` in your env.

## Server Components / Actions

```tsx
// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { auth, currentUser, requireUser } from '@slyxup/nextjs/server';

export default async function Dashboard() {
  // Option A: session summary
  const session = await auth();
  if (!session) redirect('/sign-in');

  // Option B: full user profile
  const user = await currentUser();
  if (!user) redirect('/sign-in');

  return <p>Hello {user.firstName ?? user.email}</p>;
}

// Server Action — throws 'Unauthorized: no SlyxUp session' when signed out
export async function updateProfile(formData: FormData) {
  const user = await requireUser();
  // ...
}
```

## Route protection middleware

```ts
// middleware.ts (project root or src/)
import { slyxupMiddleware } from '@slyxup/nextjs/middleware';

// Option A: publicPaths (blacklist) — these routes are public, everything else requires auth
export default slyxupMiddleware({
  publicPaths: ['/', '/sign-in', '/sign-up', '/pricing'],
  signInUrl: '/sign-in',                        // redirect target (default)
});

// Option B: protectedPaths (whitelist) — only these routes require auth, everything else is public
// export default slyxupMiddleware({
//   protectedPaths: ['/dashboard', '/settings'],
//   signInUrl: '/sign-in',
// });

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
};
```

> **Note:** `publicPaths` and `protectedPaths` are mutually exclusive. Use one or the other — do not pass both.

Unauthenticated users are redirected to `/sign-in?redirect_url=<original path>`.

## Setting/clearing the session cookie (Route Handlers)

Useful for hosted-flow callbacks where your app receives a token:

```ts
// app/api/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createSessionCookie, clearSessionCookie } from '@slyxup/nextjs';

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('session');
  const res = NextResponse.redirect(new URL('/', req.url));
  res.headers.set('Set-Cookie', createSessionCookie(token!));
  return res;
}

export async function DELETE() {
  return new NextResponse(null, { headers: { 'Set-Cookie': clearSessionCookie() }, status: 204 });
}
```

Cookie is `HttpOnly; Secure; SameSite=Lax`, 7-day expiry by default (`maxAge`/`domain` overridable).

## API reference

| Export | From | Purpose |
|---|---|---|
| `auth()` | `/server` | `{ session, user } \| null` |
| `currentUser()` | `/server` | Full user `\| null` |
| `requireUser()` | `/server` | User or throws |
| `getSessionToken()` | `/server` | Raw token from cookies |
| `slyxupMiddleware(opts)` | `/middleware` | Next.js middleware factory |
| `createSessionCookie(token)` | root | `Set-Cookie` value |
| `clearSessionCookie()` | root | Clearing `Set-Cookie` value |
| `SESSION_COOKIE_NAME` | root, `/server`, `/middleware` | `'slyxup_session'` (also exported as `MIDDLEWARE_SESSION_COOKIE` from `/middleware` and `COOKIE_NAME` from root — all refer to the same value) |

## React hooks

Pair with [`@slyxup/react`](../react) on the client and [`@slyxup/ui`](../ui) for prebuilt sign-in cards.

## License

MIT © [SlyxUp](https://github.com/slyxup/stack)
