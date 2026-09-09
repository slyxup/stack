# Integrating SlyxUp Auth and Billing

This guide describes the 3.0.0 SDK release candidate. Do not assume the npm `latest` tag already contains these changes: publication follows the reviewed release PR. Check registry versions and release notes before upgrading.

## Choose your session transport first

| Application | Recommended integration | Persistence |
| --- | --- | --- |
| React/Vite client-only SPA | `SlyxUpProvider` with explicit auth URL, billing URL and publishable key | Memory by default; optional project-scoped `sessionStorage` |
| Next.js or another server-rendered application | Same-origin server routes calling a request-scoped `SlyxupClient` | Application-owned HttpOnly cookie |
| Cloudflare Worker API | Validate the incoming user's session with the auth service, then enforce resource ownership | Incoming bearer token or application cookie |
| Project administration | `SlyxupClient({ secretKey })` on the server | Secret binding; never browser code |

A publishable key identifies a project. It does **not** authenticate a user. An auth session identifies a user. A secret key permits project administration and is **not** a substitute for the user's billing session. Keep production and staging in separate projects: key prefixes alone do not create separate databases.

The two services are separate:

- Auth: `https://auth.slyxup.online`, local `http://localhost:8787`.
- Billing: `https://billing.slyxup.online`, local `http://localhost:8788`.
- Source folders and pnpm filters are `auth`, `billing`, and `web`.
- Billing owns its D1 tables; auth SDK requests do not contain a `client.billing` namespace.

## 1. Provision the integration

1. Create a project using the existing management API or operator UI.
2. Create a publishable key for that project. Save a secret key only if you need server-side administration.
3. Register your frontend domain. For custom production domains, the project must be live. Explicitly configure allowed origins on self-hosted services; CORS is not user authorization.
4. Configure email delivery and verify a test account. Password sign-in requires email verification.
5. For billing, create a plan mapped to a real Paddle price in the same Paddle environment as the billing service. The checked-in billing configuration uses **sandbox**.

There is no shipped `slyxup` CLI binary in these SDK package manifests. Do not use invented commands such as `slyxup keys create`. `manageApi(apiUrl, developerSessionToken)` exposes project/key/domain management; obtain that token through the platform's sign-in flow, not a project user's session.

## 2. React/Vite: working client-only auth

```bash
pnpm add @slyxup/core @slyxup/ui
```

```tsx
// App.tsx
import { useState } from 'react';
import {
  SlyxUpProvider, SignIn, SignUp, ForgotPassword,
  UserButton, useUser,
} from '@slyxup/ui';

function Account() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'forgot'>('sign-in');
  if (!isLoaded) return <p role="status">Checking your session…</p>;
  if (isSignedIn) return <><UserButton /><p>Signed in as {user?.email}</p></>;
  if (mode === 'sign-up') return <SignUp social={false} onSignInClick={() => setMode('sign-in')} />;
  if (mode === 'forgot') return <ForgotPassword onBackToSignIn={() => setMode('sign-in')} />;
  return <SignIn social={false} username
    onSignUpClick={() => setMode('sign-up')}
    onForgotPasswordClick={() => setMode('forgot')} />;
}

export default function App() {
  return <SlyxUpProvider
    publishableKey={import.meta.env.VITE_SLYXUP_PUBLISHABLE_KEY}
    apiUrl={import.meta.env.VITE_SLYXUP_API_URL}
    billingApiUrl={import.meta.env.VITE_SLYXUP_BILLING_URL}
    tokenStorage="sessionStorage"
  ><Account /></SlyxUpProvider>;
}
```

```dotenv
# Public Vite configuration; never put a secret key here.
VITE_SLYXUP_PUBLISHABLE_KEY=pk_test_REPLACE_WITH_REAL_KEY
VITE_SLYXUP_API_URL=http://localhost:8787
VITE_SLYXUP_BILLING_URL=http://localhost:8788
```

`sessionStorage` survives reloads in the same tab and is scoped by auth URL + project key. It is readable by JavaScript, so it does not provide HttpOnly protection. Omit `tokenStorage` for memory-only tokens. Old `slyxup_session_token` localStorage values are deliberately not imported; users sign in again after upgrading.

UI visibility is not a security boundary. Your server must validate every protected request. The provider's client is available through `useAuth().client`; use `client.getToken()` for your custom API's bearer header. Never send that token to an untrusted URL.

### Verification and password reset

Render `<EmailVerification token={token} />` on the verification landing page and `<ResetPassword token={token} onSuccess={...} />` on the reset page. Read `token` from the URL using your router. These components must be inside the same configured provider. Check that the email service generates links to the correct landing pages before release.

`SignIn` automatically handles a `2FA_REQUIRED` challenge, with authenticator and single-use recovery-code choices. `SignUp` returning a user does not prove that a verified session is ready; let the provider's session state determine access.

### Project OAuth

Enable social buttons after configuring Google/GitHub credentials and registering the return hostname on the project. The SDK retains a random verifier in the initiating tab, starts OAuth with an S256 challenge, and exchanges the returned one-time `slyxup_code` before loading the session. The auth server separately binds provider state to an HttpOnly browser cookie and uses provider PKCE. Return to the same tab and keep a provider mounted on the return page. Headless clients call `auth.startOAuth(provider)` and `auth.completeOAuth()`; the latter returns either a user session or a `2FA_REQUIRED` challenge. SignIn displays that challenge automatically. Provider account lookup is scoped to the project, and the redirect never contains a session token. Real provider consent still requires an operator/browser check; automated runtime tests cover state, proof keys and exchange replay.

## 3. Headless auth and billing

```ts
import { SlyxupClient, createBillingClient, SlyxupError } from '@slyxup/core';

const auth = new SlyxupClient({
  publishableKey: 'pk_test_REPLACE_WITH_REAL_KEY',
  apiUrl: 'https://auth.slyxup.online',
});
const billing = createBillingClient({
  publishableKey: auth.publishableKey,
  apiUrl: 'https://billing.slyxup.online',
  getToken: () => auth.getToken(),
});

async function login(email: string, password: string) {
  try {
    const result = await auth.auth.signIn({ email, password });
    if ('challengeToken' in result) {
      // Show an authenticator/recovery input. Do not grant access yet.
      return { challengeToken: result.challengeToken };
    }
    return { user: result.user };
  } catch (error) {
    if (error instanceof SlyxupError && error.code === 'EMAIL_NOT_VERIFIED') {
      // Offer auth.auth.resendVerification(email), with a visible loading state.
    }
    throw error;
  }
}

// After login (and completion of any second factor):
const plans = await billing.listPlans('your-project-id');
const plan = plans[0];
if (plan) {
  const { checkoutUrl } = await billing.checkout(plan.id, {
    origin: 'https://your-app.example/billing/return',
    manualOpen: true,
  });
  // Same-tab navigation avoids popup blockers after async checkout creation.
  window.location.assign(checkoutUrl);
}
```

Use `auth.auth.completeSignIn({ challengeToken, code })` or `{ challengeToken, recoveryCode }` to finish a challenge. Billing reads the linked client's current token on each request, including after sign-out. For Node/SSR create both clients **inside each request** and pass `sessionToken` to the auth client from the application's cookie. Never keep signed-in server clients in module scope.

`getTransaction(transactionId)` is a checkout-status display aid, not authorization. The public transaction ID does not prove that the current user owns a paid plan. For protected paid features, validate the user's session and call `getEntitlements(projectId)` on the server, then check `features.includes('your-feature')`. The endpoint grants features only for active/trialing subscriptions with a future billing-period end. Paused, past-due, canceled, missing-period and expired subscriptions have no features. Webhook delivery can lag the payment redirect: show a pending state and retry with a bounded interval.

Create checkout through the authenticated billing endpoint. It persists checkout ownership before calling Paddle. New subscription webhooks must match that server record and the Paddle transaction/customer/price; arbitrary browser custom data cannot grant an entitlement. Webhook writes compare provider event timestamps; duplicate delivery uses expiring processing leases so crashed deliveries can be retried. Existing subscriptions retain their recorded owner. Check sandbox purchase/refund/cancel behavior with real Paddle before enabling live payments.

## 4. React billing components

```tsx
import { BillingPortal, useBilling, useInvoices, useSubscription } from '@slyxup/ui';

export function BillingSettings({ projectId }: { projectId: string }) {
  const { client } = useBilling();
  const sub = useSubscription(projectId);
  const invoices = useInvoices();
  if (sub.loading || invoices.loading) return <p role="status">Loading billing…</p>;
  if (sub.error || invoices.error) return <div role="alert">
    {sub.error || invoices.error}
    <button onClick={() => { void sub.reload(); void invoices.reload(); }}>Try again</button>
  </div>;
  return <BillingPortal subscription={sub.subscription} invoices={invoices.invoices}
    onCancel={async () => { await client.cancelSubscription(projectId); await sub.reload(); }}
    onResume={async () => { await client.resumeSubscription(projectId); await sub.reload(); }} />;
}
```

Render inside `SlyxUpProvider`, after auth is loaded and signed in. The hooks inherit auth/billing URLs and the current session. Mutation callbacks in your application should report failures and disable duplicate submissions. `PricingTable` and `BillingPortal` are presentation components: pass data and callbacks; they do not provision plans or authenticate on their own.

Use `CurrentPlanCard`, `InvoicesTable`, `PlanCard`, and `SubscriptionStatus` for custom layouts. Invoice totals are grouped by currency. Styles inherit the host font; external webfonts are opt-in through theme configuration. See `packages/ui/README.md` for component props and theme options.

## 5. Next.js: server-owned sessions

The SDK provides helpers, not an automatic Next.js auth backend. Implement same-origin server routes for sign-in, second-factor completion, sign-out and refresh/read before protecting pages:

1. Validate request method, content type, request size and input schema; enforce same-origin/CSRF checks on cookie-authenticated mutations.
2. Create a request-scoped `SlyxupClient({ apiUrl, publishableKey })` and call sign-in.
3. If `2FA_REQUIRED`, return the challenge to the sign-in UI; do not set a session cookie yet.
4. After successful sign-in/2FA, use `createSessionCookie(result.sessionToken, lifetimeSeconds)` in the server response's `Set-Cookie`. Derive lifetime from the server expiry where available. Return the user, not the raw token, to the browser.
5. On sign-out, revoke via auth and send `clearSessionCookie()` to the browser.
6. Call `getServerSession(request, options)` in each protected route handler and enforce resource ownership. Never authorize by cookie presence alone.

```ts
// middleware.ts — requires the application-owned cookie described above.
import { slyxupMiddleware } from '@slyxup/core/next';

export default slyxupMiddleware({
  apiUrl: process.env.SLYXUP_AUTH_URL,
  publishableKey: process.env.SLYXUP_PUBLISHABLE_KEY,
  publicRoutes: ['/', '/sign-in', '/sign-up', '/verify-email', '/reset-password', '/api/auth/*'],
});
export const config = { matcher: ['/account/:path*', '/billing/:path*'] };
```

```ts
// app/api/account/route.ts
import { getServerSession } from '@slyxup/core/next';

export async function GET(request: Request) {
  const session = await getServerSession(request, {
    apiUrl: process.env.SLYXUP_AUTH_URL,
    publishableKey: process.env.SLYXUP_PUBLISHABLE_KEY,
  });
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json({ user: session.user }, { headers: { 'Cache-Control': 'no-store' } });
}
```

Middleware accepts `Request`/`NextRequest`, returns `Promise<Response>`, matches exact public paths (or explicit `/*` subtrees), redirects invalid sessions, and returns 503 for auth outages. `getServerSession` returns null for missing/rejected sessions and throws on network/service failures. Static-export Next.js sites cannot run middleware or server routes; use the SPA integration or deploy a server-capable application.

There are no `createClient()`, `currentUser()` or `slyxup.billing.plans.list()` exports. Use the concrete APIs above.

## 6. Upgrade checklist for consuming platforms

- Upgrade core and UI together to the reviewed major release; record exact versions in each consumer's lockfile.
- Remove reliance on global `slyxup_session_token`. Sign in again and select the intended persistence mode.
- Standalone billing clients: provide `getToken`. React: configure `billingApiUrl` on the provider.
- Replace old synchronous middleware/plain-object adapters with the `Request → Promise<Response>` helper.
- Test sign-up → verification → sign-in → second factor → reload → sign-out in every consumer.
- Test that a token from project A is rejected when project B's key is supplied.
- Test checkout in Paddle sandbox, webhook delivery, entitlement activation, cancellation and expired access.
- Enable social sign-in only after registering provider credentials and the project's return domain, then verify consent and any second-factor challenge in a real browser.
- Read `RELEASE_READINESS.md` before deploying or publishing this checkout.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Signed out on page reload | Memory is the default; select tab storage or implement the server cookie flow |
| Billing 401 after auth succeeds | Same project key and explicit `getToken`; correct billing URL; verified auth user |
| Session 403 | Revoked/invalid key or session belongs to another project |
| `EMAIL_NOT_VERIFIED` | Complete verification, or resend from the correct project's integration |
| `2FA_REQUIRED` | Finish the challenge; do not treat it as a successful login |
| `CUSTOMER_IDENTITY_CONFLICT` | A Paddle customer already belongs to another auth identity; resolve with the operator, never merge ownership client-side |
| Paid redirect but no feature access | Wait for authoritative webhook/entitlements; confirm environment, plan mapping and period end |
| Middleware never runs | Next.js static export, matcher configuration, or consumer using an older package |
| CORS fails | Exact allowed origin/domain and live project; neither a key nor a client-side test header bypasses origin checks |

Do not paste tokens, cookies, reset links or secret keys into support logs. Report the endpoint, HTTP status, safe error code, package versions, and a redacted reproduction.
