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
  publishableKey: 'pk_test_xxx',          // from project key management
  apiUrl: 'https://auth.slyxup.online',   // default; override for self-host/local
});

// ── Auth ──
await client.auth.signUp({ email: 'ada@example.com', password: 'password123', firstName: 'Ada', username: 'ada' });
// Returns { user, sessionToken, expiresAt } on success, or
// { code: '2FA_REQUIRED', challengeToken } when the account has 2FA enabled.
await client.auth.signIn({ email: 'ada@example.com', password: 'password123' });
// Complete a 2FA challenge:
await client.auth.completeSignIn({ challengeToken, code: '123456' }); // or { challengeToken, recoveryCode }
await client.auth.signOut();
await client.auth.resendVerification('ada@example.com');   // resend email verification
await client.auth.forgotPassword('ada@example.com');       // send reset email
await client.auth.resetPassword(token, 'newPassword');     // reset with emailed token
await client.auth.verifyEmail(token);                      // confirm email with emailed token

// ── Sessions ── (list supports pagination)
const { sessions, total } = await client.sessions.list({ limit: 10, offset: 0 });
// SlyxupSessionInfo[]: { id, ipAddress, userAgent, expiresAt, createdAt, isCurrent }
await client.sessions.revoke('session-id');  // revoke one device
const { revoked } = await client.sessions.revokeOthers();  // sign out everywhere else

// ── Password ──
await client.password.change({ currentPassword, newPassword });

// ── Two-factor (TOTP) ──
const { secret, provisioningUri, accountName } = await client.twoFactor.setup();
await client.twoFactor.enable(secret, '123456');  // returns { recoveryCodes: string[] } — save them
await client.twoFactor.verify('123456');          // { valid: true }
await client.twoFactor.disable('123456');
const { enabled } = await client.twoFactor.status();

// ── Connected accounts (OAuth) ──
const { accounts } = await client.accounts.list();  // [{ id, provider, ... }]
await client.accounts.unlink(accountId, 'google');

// ── Users ──
const me = await client.users.me();       // full profile (includes username, twoFactorEnabled)
await client.users.update({ firstName: 'Ada', username: 'ada' });
await client.users.delete();              // GDPR delete

// ── Billing ── (import { createBillingClient } from '@slyxup/core')
import { createBillingClient } from '@slyxup/core';
const billing = createBillingClient({
  publishableKey: client.publishableKey,
  getToken: () => client.getToken(),
  apiUrl: 'https://billing.slyxup.online',
});
const plans = await billing.listPlans(projectId);
const { transactionId, checkoutUrl } = await billing.checkout(planId, {
  origin: 'https://your-app.com/billing/done', // return target after payment
  openIn: '_blank',                              // or '_self' / manualOpen: true
});
// After payment, verify server-side before gating features:
const { paid, status } = await billing.getTransaction(transactionId);
const sub = await billing.getSubscription(projectId); // null when none
```

The client keeps tokens in memory by default and a cookie jar in Node. **Create a separate client for each server request**; never share a signed-in client between users. Pass `sessionToken` from your application's HttpOnly cookie for server requests. Secret keys are rejected in browsers.

For a client-only SPA, opt into `tokenStorage: 'sessionStorage'` to survive reloads in the same tab. Storage is scoped by auth URL and publishable key. This is script-readable storage, not an HttpOnly session: use a same-origin server integration for sensitive applications. Legacy `slyxup_session_token` localStorage values are not imported; users must sign in again. Project auth currently returns bearer tokens rather than setting cross-site cookies.

HTTP errors preserve server `code` values (for example `EMAIL_NOT_VERIFIED`); sign-in returns a challenge only for `2FA_REQUIRED`. Rate limits and server failures are not reported as invalid credentials. Request headers accept all standard `HeadersInit` forms. Account deletion clears the client's session state.

## Error handling

Billing uses the same typed errors as auth. Supply its URL explicitly for local/self-hosted deployments (normally `http://localhost:8788`); explicit URLs are never rewritten. `getToken` is evaluated for each request, so sign-in/sign-out on the linked auth client is reflected immediately. Billing never reads browser storage implicitly. `getSubscription()` without a project returns the newest non-canceled subscription or `null`; prefer a project ID for unambiguous billing controls.

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

`auth.startOAuth('google' | 'github', redirectUrl?)` starts browser OAuth with a tab-held verifier. `auth.completeOAuth()` exchanges the returned `slyxup_code` once, removes it from the address bar, and returns an auth response, a `2FA_REQUIRED` challenge, or null when no callback is present. The return URL must use the current app origin and a domain registered on the project. The React provider completes callbacks automatically. Both provider PKCE and the application code exchange use S256; no session token is placed in the redirect URL.

| Namespace | Method | Endpoint |
|---|---|---|
| `auth.signUp(input)` | POST | `/v1/auth/sign-up` |
| `auth.signIn(input)` | POST | `/v1/auth/sign-in` |
| `auth.completeSignIn(input)` | POST | `/v1/auth/sign-in/2fa` |
| `auth.signOut()` | POST | `/v1/auth/sign-out` |
| `auth.resendVerification(email)` | POST | `/v1/verification/resend` |
| `auth.forgotPassword(email)` | POST | `/v1/verification/password/forgot` |
| `auth.resetPassword(token, password)` | POST | `/v1/verification/password/reset` |
| `auth.verifyEmail(token)` | POST | `/v1/verification/verify` |
| `sessions.get()` | GET | `/v1/session` |
| `sessions.list({ limit, offset })` | GET | `/v1/sessions` |
| `sessions.revoke(id)` | DELETE | `/v1/sessions/:id` |
| `sessions.revokeOthers()` | DELETE | `/v1/sessions` |
| `password.change(input)` | POST | `/v1/user/password` |
| `twoFactor.setup()` | GET | `/v1/user/2fa/setup` |
| `twoFactor.status()` | GET | `/v1/user/2fa/status` |
| `twoFactor.enable(secret, code)` | POST | `/v1/user/2fa/enable` |
| `twoFactor.verify(code)` | POST | `/v1/user/2fa/verify` |
| `twoFactor.disable(code)` | POST | `/v1/user/2fa/disable` |
| `accounts.list()` | GET | `/v1/user/accounts` |
| `accounts.unlink(id, provider)` | DELETE | `/v1/user/accounts/:id` |
| `users.me()` | GET | `/v1/user` |
| `users.update(patch)` | PATCH | `/v1/user` |
| `users.delete()` | DELETE | `/v1/user` |
| `billing.listPlans(projectId)` | GET | `/v1/billing/plans` |
| `billing.checkout(planId, { origin })` | POST | `/v1/billing/checkout` |
| `billing.getTransaction(txnId)` | GET | `/v1/billing/transactions/:id` |
| `billing.getSubscription(projectId?)` | GET | `/v1/billing/subscription` |
| `billing.listSubscriptions()` | GET | `/v1/billing/subscription` (all) |
| `billing.getEntitlements(projectId)` | GET | `/v1/billing/entitlements` |
| `billing.cancelSubscription(projectId?)` | POST | `/v1/billing/subscription/cancel` |
| `billing.resumeSubscription(projectId?)` | POST | `/v1/billing/subscription/resume` |
| `billing.listInvoices()` | GET | `/v1/billing/invoices` |

## Framework wrappers

Full auth/billing setup, SPA versus server-cookie recipes and upgrade notes: [INTEGRATION_GUIDE.md](../../INTEGRATION_GUIDE.md). This is the 3.0.0 release candidate; confirm npm publication before upgrading external consumers.

`@slyxup/core/next` exports `slyxupMiddleware`, `getServerSession`, `createSessionCookie`, and `clearSessionCookie`. Middleware accepts a standard `Request` (including `NextRequest`) and returns a `Response`; protected routes validate the session with `apiUrl`. Public routes match exact pathnames, with explicit `/docs/*` wildcards. Invalid sessions redirect; auth outages return 503. A cookie's presence alone never grants access. Use `getServerSession(request, { apiUrl, publishableKey })` inside protected route handlers as well. These helpers require your application to set its own HttpOnly cookie after server-side sign-in; a direct browser sign-in to a different auth origin cannot set your application's cookie.

- Prebuilt UI cards: [`@slyxup/ui`](../ui)

## License

MIT © [SlyxUp](https://github.com/slyxup/stack)
