# @slyxup/ui

Prebuilt, themeable auth + billing components — sign-in cards, user button, password flows, pricing table. Built on [`@slyxup/react`](../react). **Zero CSS dependencies** — styles are self-contained and injected once.

## Install

```bash
npm install @slyxup/ui @slyxup/react @slyxup/core
```

> Peer: `react ^18 || ^19`

## Setup

Inject the stylesheet once at your app root:

```tsx
import { SlyxUpProvider } from '@slyxup/react';
import { SlyxUpStyles } from '@slyxup/ui';

<SlyxUpProvider publishableKey="pk_test_xxx">
  <SlyxUpStyles />
  <App />
</SlyxUpProvider>
```

(Components also auto-inject on first mount if you skip this.)

## Components

### `<SignIn />` / `<SignUp />`

```tsx
import { SignIn, SignUp } from '@slyxup/ui';

<SignIn
  social                       // show Google/GitHub buttons (default true)
  onSuccess={() => router.push('/dashboard')}
  onSignUpClick={() => setMode('sign-up')}
  onForgotPasswordClick={() => setMode('forgot')}
/>

<SignUp onSignInClick={() => setMode('sign-in')} />
```

Notes:
- `SignIn` accepts **either an email or a username** in the identifier field.
- When the account has 2FA enabled, `SignIn` auto-detects the `2FA_REQUIRED` response and swaps to an authenticator-code step, then completes the sign-in with `completeSignIn`.
- `SignUp` includes an optional **username** field (used for password sign-in as an alternative to email).

### `<UserButton />` — avatar + dropdown

```tsx
import { UserButton } from '@slyxup/ui';

<header>
  <UserButton />   {/* gradient initials avatar → menu: profile, sign out */}
</header>
```

Renders nothing until loaded; shows initials or avatar image.

### `<UserProfile />` — full account settings (Clerk-style)

Two-tab account panel — Profile and Security. Renders as a centered modal by default; pass `modal={false}` for inline use.

```tsx
import { UserProfile } from '@slyxup/ui';
import { useState } from 'react';

const [open, setOpen] = useState(false);

{open && (
  <UserProfile
    modal                          // default true — overlay + centered card, Esc/click-outside closes
    onClose={() => setOpen(false)}
    onDeleted={() => (window.location.href = '/')}  // after account deletion
  />
)}
```

**Profile tab** — avatar preview from URL, first/last name editing plus an optional **username** field (unique per project, usable for password sign-in), all with save confirmation, and an email row with a verified/unverified badge and one-click resend verification.

**Security tab** — change password (validates current password server-side, min 8 chars, confirm-match check), **two-factor authentication (TOTP)** setup flow (QR + manual secret, verify-before-enable, one-time recovery codes shown once on enable, and disable via current code), **connected OAuth accounts** list with per-account unlink, active sessions list parsed into `Browser · OS` device labels showing IP, created and expiry dates with **pagination**, per-session revoke buttons, "sign out other devices", and a type-`DELETE`-to-confirm danger zone for permanent account deletion.

| Prop | Required | Default | Purpose |
|---|---|---|---|
| `modal` | no | `true` | Overlay + centered card vs inline card |
| `onClose` | no | — | Modal close callback |
| `onDeleted` | no | — | Fired after the account is deleted |

Requires the endpoints shipped in the auth worker (`POST /v1/user/password`, `GET/DELETE /v1/sessions`, `GET/POST /v1/user/2fa/*`, `GET/DELETE /v1/user/accounts`) and `@slyxup/react >= auth hooks`.

### Password flows

```tsx
<ForgotPassword onBackToSignIn={...} />
<ResetPassword token={searchParams.token} onSuccess={...} />
<EmailVerification token={searchParams.token} />
```

`ForgotPassword` always shows a neutral success state (never reveals whether an account exists). `EmailVerification` auto-verifies from the emailed token and offers a resend form otherwise.

### `<SocialButtons />`

```tsx
<SocialButtons providers={['google', 'github']} />
{/* Default basePath is `${client.apiUrl}/v1/oauth` from the provider client.
    Only override if you need a custom auth URL: */}
<SocialButtons providers={['google']} basePath="https://auth.example.com/v1/oauth" />
```

Redirects to the hosted OAuth flow.

### `<PricingTable />` — billing plans grid

```tsx
import { PricingTable } from '@slyxup/ui';
import { usePlans, useCheckout } from '@slyxup/react';

const { plans, loading } = usePlans(projectId);
const { checkout } = useCheckout();

<PricingTable
  plans={plans}
  loading={loading}
  onSelect={(plan) => checkout(plan.id)}   // → Paddle hosted checkout
/>
```

Clean pricing grid with a "popular" badge driven by `plan.isPopular`.

You can also drive checkout directly without React hooks:

```ts
import { initPaddle, openPaddleCheckout } from '@slyxup/ui';

initPaddle({ environment: 'sandbox', token: 'test_...' });

// `customData` (userId/planId/projectId) is copied onto the created
// Paddle transaction and subscription so the billing webhook can attribute
// the payment to the right user/project/plan and mark the subscription active.
openPaddleCheckout(priceId, customerEmail?, { userId, planId, projectId });
```

`initPaddle` also dispatches a `window` `CustomEvent('slyxup:checkout-completed')` when Paddle's checkout finishes, so your UI can refresh the subscription.

### `<BillingPortal />` — current plan + invoices

```tsx
import { BillingPortal } from '@slyxup/ui';
import { useSubscription, useInvoices } from '@slyxup/react';

const { subscription } = useSubscription(projectId);
const { invoices } = useInvoices();

<BillingPortal
  subscription={subscription}
  invoices={invoices}
  onCancel={cancelSubscription}            // optional; omit to hide button
/>
```

Shows current plan, status, renewal date, invoice history, and an optional cancel action.

### `<AdminPanel />` — admin dashboard with sk key

A full-featured, responsive admin panel for managing users, sessions, and API keys using a **secret key** (`sk_test_xxx` / `sk_live_xxx`).

```tsx
import { AdminPanel } from '@slyxup/ui';

// Full-page admin dashboard
<AdminPanel
  secretKey="sk_test_xxx"
  apiUrl="https://auth.slyxup.online"   // optional; defaults to production
/>

// Inline (card-style, no full-page wrapper)
<AdminPanel
  secretKey="sk_test_xxx"
  fullPage={false}
/>
```

**Features:**
- **Overview tab** — user count, active sessions, API keys, verified/blocked stats
- **Users tab** — list all users with avatar, name, email, verification/block status, join date
- **Sessions tab** — active sessions with user agent, expiry, IP address
- **API Keys tab** — create (pk/sk, test/live), revoke, view key history
- **Responsive** — works on desktop and mobile
- **Self-contained** — uses SlyxUp design tokens, no external CSS needed

> Requires `@slyxup/core` as a peer dependency. The component creates its own `SlyxupClient` internally.

## Theming

Override CSS variables on any wrapper — light/dark is automatic via `prefers-color-scheme`, force dark with `slyxup-dark`, force light with `slyxup-light`.

```css
.slyxup-root {
  --slx-accent: #e8562a;        /* your brand color */
  --slx-radius: 16px;
  --slx-font: "Inter", sans-serif;
}
```

| Variable | Default (light) |
|---|---|
| `--slx-accent` | `#5b5bd6` |
| `--slx-bg` | `#ffffff` |
| `--slx-ink` | `#16161d` |
| `--slx-muted` | `#6f6f7b` |
| `--slx-border` | `#e6e6ec` |
| `--slx-danger` | `#d64550` |
| `--slx-radius` | `12px` |

Accessibility built in: labeled fields, visible focus rings, `prefers-reduced-motion` respected, semantic buttons throughout.

## License

MIT © [SlyxUp](https://github.com/slyxup/stack)
