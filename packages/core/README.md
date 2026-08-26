# @slyxup/core

Core HTTP client for the SlyxUp Auth platform. Zero framework dependencies — works in browsers, Node.js, and edge runtimes.

## Install

```bash
npm install @slyxup/core
# pnpm add @slyxup/core
```

## Quick start

```ts
import { SlyxupClient } from '@slyxup/core';

const client = new SlyxupClient({
  publishableKey: 'pk_test_xxx',          // from `slyxup keys create`
  apiUrl: 'https://auth.slyxup.online',   // default; override for self-host/local
});

// ── Auth ──
await client.auth.signUp({ email: 'ada@example.com', password: 'password123', firstName: 'Ada' });
await client.auth.signIn({ email: 'ada@example.com', password: 'password123' });
await client.auth.signOut();
await client.auth.resendVerification('ada@example.com');   // resend email verification

// ── Sessions ──
const { session, user } = await client.sessions.get();
// session.expiresAt — ISO date; throws UnauthorizedError (401) when signed out
const { sessions } = await client.sessions.list();
// SlyxupSessionInfo[]: { id, ipAddress, userAgent, expiresAt, createdAt, isCurrent }
await client.sessions.revoke('session-id');  // revoke one device
const { revoked } = await client.sessions.revokeOthers();  // sign out everywhere else

// ── Password ──
await client.password.change({ currentPassword, newPassword });

// ── Users ──
const me = await client.users.me();       // full profile
await client.users.update({ firstName: 'Ada', lastName: 'Lovelace' });
await client.users.delete();              // GDPR delete
```

The client keeps an internal cookie jar, so sign-in state persists across calls in **Node/SSR too** (browsers manage cookies natively).

## Error handling

```ts
import { SlyxupError, UnauthorizedError, RateLimitError, NetworkError, ValidationError } from '@slyxup/core';

try {
  await client.auth.signIn({ email, password });
} catch (e) {
  if (e instanceof UnauthorizedError) showInvalidCredentials();
  else if (e instanceof RateLimitError) backOff();
  else if (e instanceof SlyxupError) console.error(e.status, e.code, e.message);
}
```

| Error | Status | Meaning |
|---|---|---|
| `ValidationError` | 400 | Bad input |
| `UnauthorizedError` | 401 | No/expired session |
| `RateLimitError` | 429 | Too many requests |
| `NetworkError` | 0 | Fetch failed |
| `SlyxupError` | * | Base class (`e.status`, `e.code`) |

## API surface

| Namespace | Method | Endpoint |
|---|---|---|
| `auth.signUp(input)` | POST | `/v1/auth/sign-up` |
| `auth.signIn(input)` | POST | `/v1/auth/sign-in` |
| `auth.signOut()` | POST | `/v1/auth/sign-out` |
| `auth.resendVerification(email)` | POST | `/v1/verification/resend` |
| `sessions.get()` | GET | `/v1/session` |
| `sessions.list()` | GET | `/v1/sessions` |
| `sessions.revoke(id)` | DELETE | `/v1/sessions/:id` |
| `sessions.revokeOthers()` | DELETE | `/v1/sessions` |
| `password.change(input)` | POST | `/v1/user/password` |
| `users.me()` | GET | `/v1/user` |
| `users.update(patch)` | PATCH | `/v1/user` |
| `users.delete()` | DELETE | `/v1/user` |

## Framework wrappers

- React hooks/components: [`@slyxup/react`](../react)
- Next.js server helpers + middleware: [`@slyxup/nextjs`](../nextjs)
- Prebuilt UI cards: [`@slyxup/ui`](../ui)

## License

MIT © [SlyxUp](https://github.com/slyxup/stack)
