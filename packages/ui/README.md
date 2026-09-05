# @slyxup/ui

Prebuilt, themeable auth + billing components — sign-in cards, user button, password flows, pricing table. Built on [`@slyxup/core`](../core). **Zero CSS dependencies** — styles are self-contained and injected once.

## Install

```bash
npm install @slyxup/ui @slyxup/core
```

> Peer: `react ^18 || ^19`

## Setup

Inject the stylesheet once at your app root:

```tsx
import { SlyxupClient } from '@slyxup/core';
import { SlyxUpStyles } from '@slyxup/ui';

const client = new SlyxupClient({ publishableKey: 'pk_test_xxx', apiUrl: '...' });

<SlyxUpStyles />
<App />
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

Requires the endpoints shipped in the auth worker (`POST /v1/user/password`, `GET/DELETE /v1/sessions`, `GET/POST /v1/user/2fa/*`, `GET/DELETE /v1/user/accounts`).

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
import { SlyxupClient } from '@slyxup/core';

const client = new SlyxupClient({ publishableKey: 'pk_test_xxx', apiUrl: '...' });

// Fetch plans via client API and handle checkout with Paddle
<PricingTable
  plans={plans}
  loading={loading}
  currentPlanId={subscription?.planId ?? (isFreeTier ? freePlanId : null)}
  onSelect={(plan) => checkout(plan.id)}
/>
```

Clean pricing grid with a "popular" badge driven by `plan.isPopular`.

Pass `currentPlanId` to render that plan's button as a disabled "Current plan"
(`currentLabel` overrides the text) — e.g. the active subscription's plan, or
the `$0` plan's id while on the free tier.

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
import { SlyxupClient } from '@slyxup/core';

const client = new SlyxupClient({ publishableKey: 'pk_test_xxx', apiUrl: '...' });

<BillingPortal
  subscription={subscription}
  invoices={invoices}
  onCancel={cancelSubscription}
/>
```

Shows current plan, status, renewal date, invoice history, and an optional cancel action.

### Granular billing parts — compose your own layouts

Don't need the whole portal? Use the parts directly (same props style on each:
`theme?`, `style?`, `className?`):

```tsx
import {
  PlanCard,            // single pricing card (PricingTable renders these)
  CurrentPlanCard,     // "your plan" card, incl. free-tier empty state
  InvoicesTable,       // invoice history (renders null when empty)
  SubscriptionStatus,  // tiny status pill
} from '@slyxup/ui';

// Settings page with only the current plan:
<CurrentPlanCard
  subscription={subscription}   // null = free tier empty state
  onCancel={cancelSubscription}
  theme={{ accent: 'emerald' }}
/>

// Fully custom pricing section:
{plans.map((p) => (
  <PlanCard
    key={p.id}
    plan={p}
    current={p.id === currentPlanId}
    onSelect={(plan) => checkout(plan.id)}
  />
))}
```

### Theming every component

Three levels, weakest first:

1. **Global** — `applyTheme({ accent: 'violet', mode: 'dark', radius: 12 })`
   (or raw `--slx-*` CSS variables on `:root`).
2. **Per-component** — `theme={{ accent: '#7c3aed', mode: 'dark' }}` on any
   billing component. Scoped to that subtree via `slyxup-root`; siblings and
   the host app are untouched. `accent` accepts a preset name (`mono`,
   `violet`, `blue`, `emerald`, `amber`, `rose`, `cyan`) or any CSS color.
3. **Escape hatches** — every component also takes `style?` and `className?`
   (e.g. `style={{ background: '#0a0a0f' }}` for full background control).

```tsx
// Dark dashboard card matching your brand:
<CurrentPlanCard
  subscription={subscription}
  theme={{ accent: '#7c3aed', mode: 'dark', radius: 14 }}
  style={{ background: '#0a0a0f', border: '1px solid #1f1f2a' }}
/>
```

Shared utility classes (auto-injected stylesheet, theme-aware):
`slx-card-hover` (lift on hover) · `slx-card-featured` (accent ring glow) ·
`slx-badge-float` / `slx-badge-current` (floating pills) · `slx-skeleton`
(shimmer loading block) · `slx-dot` + `slx-dot-live` (pulsing status dot) ·
`slx-spinner` · `slx-rise-1/2/3` (staggered entrances) · `slx-row-hover` ·
`slx-price` (gradient display price). Honor `prefers-reduced-motion`.

### Headless billing hooks — real data for custom designs

Build your own UI on live data (no components required):

```tsx
import {
  usePlans,         // plans for a project
  useSubscription,  // active subscription (pass YOUR projectId!)
  useSubscriptions, // all subscriptions when projectId is unknown
  useInvoices,      // invoice history
  useCheckout,      // checkout(planId, { origin }) → opens Paddle
  useTransaction,   // verify a transaction: { paid, status }
} from '@slyxup/ui';

const { plans } = usePlans(projectId);
const { subscription, reload } = useSubscription(projectId);
const { checkout } = useCheckout();
await checkout(plan.id, { origin: 'https://your-app.com/billing/done' });
```

> Always pass your own `projectId` to `useSubscription` — subscriptions are
> scoped per project, and omitting it returns `null`. No single projectId?
> Use `useSubscriptions()` and pick the active one.

### `<CheckoutButton />` — one-line subscribe

```tsx
import { CheckoutButton } from '@slyxup/ui';

<CheckoutButton
  planId={plan.id}
  origin="https://your-app.com/billing/done"
  theme={{ accent: '#7c3aed' }}
  onSuccess={({ transactionId }) => verify(transactionId)}
>
  Upgrade to Pro
</CheckoutButton>
```

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

## Auth page variants

`<SignIn />` and `<SignUp />` render 3 professional layouts with the same logic — pick per page, no CSS needed:

```tsx
// 1. centered (default) — classic card
<SignIn />

// 2. split — brand panel + form (stacks on mobile)
<SignIn
  layout="split"
  brandTitle="Acme Inc"
  brandSubtitle="Team workspace — sign in to continue."
  brandPoints={["SSO ready", "Audit log included", "99.99% uptime"]}
/>

// 3. minimal — chromeless, embeds into your own page design
<SignUp layout="minimal" />
```

Feature flags on both:

```tsx
<SignIn
  social={false}    // hide Google/GitHub buttons (default true)
  username          // "Username or email" identity field (default false)
/>
<SignUp
  social={false}
  username={false}  // hide the username field (default true, passed to signUp when filled)
/>
```

| Prop | Components | Default |
|---|---|---|
| `layout` | SignIn, SignUp | `"centered"` |
| `social` | SignIn, SignUp | `true` |
| `username` | SignIn (`false`), SignUp (`true`) | see left |
| `brandTitle` / `brandSubtitle` / `brandPoints` | SignIn, SignUp (`split` only) | sensible defaults |

Primary buttons follow the theme: `applyTheme({ primary: "accent" })` renders them in your brand gradient instead of ink.

Density for tight spaces: `applyTheme({ density: "compact" })` shrinks card padding, fields and buttons — ideal for modals and sidebars.

Every password field has a reveal toggle built in (hide it per-field with `showToggle={false}`). The standalone `<PasswordField />` is exported for custom forms:

```tsx
import { PasswordField } from "@slyxup/ui"

<PasswordField id="pw" value={pw} onChange={setPw} required minLength={8} />
```

## Theming

Three ways to theme, in order of precedence: `applyTheme()` → data attributes → raw CSS variables (always win).

```tsx
import { applyTheme } from "@slyxup/ui"

// Mode: "light" | "dark" | "auto" (follows OS, default)
applyTheme({ mode: "dark" })

// Accent: preset name or any custom color
applyTheme({ accent: "emerald" })
applyTheme({ accent: "#e8562a" })

// Font: preset or custom stack (default inherits your app font — best for embeds)
applyTheme({ font: "inter" })
applyTheme({ font: { body: "'Plus Jakarta Sans', sans-serif", display: "'Plus Jakarta Sans', sans-serif" } })

// Radius: base corner radius in px (sm/lg scale from it)
applyTheme({ radius: 16 })

// Everything at once, scoped to one panel instead of the whole page:
const cleanup = applyTheme(
  { mode: "dark", accent: "cyan", font: "dm", radius: 14 },
  document.getElementById("preview")!
)
cleanup() // restore previous values
```

Accent presets: `violet` (default), `blue`, `emerald`, `amber`, `rose`, `cyan` — every gradient, badge, avatar and focus ring follows the accent.
Font presets: `default` (inherit host — recommended), `system`, `dm` (DM Sans + Space Grotesk), `inter`.

Prefer markup? Set attributes directly (works without JS):

```html
<div class="slyxup-root" data-slyxup-theme="dark" data-slyxup-accent="blue">
  <!-- components here -->
</div>
```

Or go fully manual with CSS variables on any wrapper — light/dark is automatic via `prefers-color-scheme`:

```css
.slyxup-root {
  --slx-accent: #e8562a;        /* your brand color */
  --slx-accent-2: #ff8a5c;      /* gradient end */
  --slx-radius: 16px;
  --slx-font: "Inter", sans-serif;
  --slx-display: "Inter", sans-serif;
  --slx-mono: ui-monospace, monospace;
}
```

| Variable | Default (light) |
|---|---|
| `--slx-accent` | `#5b5bd6` |
| `--slx-accent-2` | `#8b5cf6` |
| `--slx-bg` | `#ffffff` |
| `--slx-ink` | `#16161d` |
| `--slx-muted` | `#6f6f7b` |
| `--slx-border` | `#e6e6ec` |
| `--slx-danger` | `#d64550` |
| `--slx-radius` | `10px` |

Extra classes: `.slx-btn-accent` renders the primary button in your accent instead of ink — `<button className="slx-btn slx-btn-accent">`.

## Form primitives

Small building blocks for custom auth screens — same tokens, same theme:

```tsx
import { OtpInput, PasswordStrength, CopyField, EmptyState, passwordScore } from "@slyxup/ui"

// 6-box authenticator / verification code (paste + arrow-key support)
<OtpInput length={6} onComplete={(code) => verify(code)} />

// Strength meter — pair with any password field
<PasswordStrength password={pw} />
if (passwordScore(pw) < 2) return "Pick something stronger"

// Masked value + copy button (API keys, secrets)
<CopyField label="Secret key" value="sk_live_abc..." />

// Friendly placeholder for empty lists
<EmptyState title="No keys yet" desc="Create one to get started." action={<button>Create key</button>} />
```

Responsive + accessible by default: auth cards reflow under 460px, UserProfile nav collapses to a horizontal strip under 680px, labeled fields, visible focus rings, `prefers-reduced-motion` respected, semantic buttons throughout.

Contrast is engineered, not eyeballed: body/secondary/link/error/success text pass WCAG AA (≥4.5) in both modes, and every gradient surface (avatars, marks, badges, split panels, accent buttons) deepens automatically so white text stays readable under **any** accent — including custom hex colors.

## License

MIT © [SlyxUp](https://github.com/slyxup/stack)
