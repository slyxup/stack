# @slyxup/react

React bindings for SlyxUp Auth — provider, auth state, and typed hooks. Built on [`@slyxup/core`](../core).

## Install

```bash
npm install @slyxup/react @slyxup/core
```

> Peer: `react ^18 || ^19`

## Setup

Wrap your app once:

```tsx
import { SlyxUpProvider } from '@slyxup/react';

<SlyxUpProvider publishableKey="pk_test_xxx" apiUrl="https://auth.slyxup.online">
  <App />
</SlyxUpProvider>
```

| Prop | Required | Default |
|---|---|---|
| `publishableKey` | recommended | — |
| `apiUrl` | no | `https://auth.slyxup.online` |

## Hooks

### `useAuth()` — sign in / out / state

```tsx
const { isLoaded, isSignedIn, userId, client, signIn, signUp, signOut } = useAuth();
// client: SlyxupClient instance (use client.apiUrl, client.publishableKey, etc.)

if (!isLoaded) return <Spinner />;
if (!isSignedIn) return <button onClick={() => signIn({ email, password })}>Sign in</button>;

await signUp({ email, password, firstName });  // auto signs in + refreshes state
await signOut();                              // clears session, updates state
```

### `useUser()` — full profile

```tsx
const { user, isSignedIn, isSignedOut, isLoaded, reload } = useUser();
// user: { id, email, firstName, lastName, avatarUrl, emailVerified, ... }
// isSignedOut: true when loaded and not signed in (convenience boolean)
<p>{user?.firstName}</p>
```

### `useSession()` — session metadata

```tsx
const { session, isLoaded } = useSession();
// session: { id, expiresAt }
```

State **auto-refreshes** every 5 minutes and after every auth action.

## Billing hooks

Pair with [`@slyxup/billing`](../billing) for plans, subscriptions, and Paddle checkout — no extra provider needed.

```tsx
import { useBilling, usePlans, useSubscription, useInvoices, useCheckout } from '@slyxup/react';

const { client } = useBilling();                       // BillingClient instance
const { plans, loading, error } = usePlans(projectId); // Plan[] for a project
const { subscription, reload } = useSubscription(projectId); // Subscription | null
const { invoices, loading } = useInvoices();           // Invoice[]
const { checkout } = useCheckout();
await checkout(planId);                                // redirects to Paddle
```

| Hook | Returns | Notes |
|---|---|---|
| `useBilling(apiUrl?)` | `{ client }` | Raw `BillingClient` |
| `usePlans(projectId)` | `{ plans, loading, error }` | Skips fetch until `projectId` is set |
| `useSubscription(projectId)` | `{ subscription, loading, error, reload }` | `null` when no subscription |
| `useInvoices(apiUrl?)` | `{ invoices, loading }` | Newest first |
| `useCheckout(apiUrl?)` | `{ checkout, loading, error }` | `checkout(planId)` redirects to hosted Paddle |

For prebuilt billing UI, see [`<PricingTable />`](../ui) and [`<BillingPortal />`](../ui).

## Full example

```tsx
function Header() {
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  if (!isSignedIn) return <a href="/sign-in">Sign in</a>;
  return (
    <div>
      <span>Hello, {user?.firstName ?? user?.email}</span>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}
```

## Prebuilt components

Skip writing your own UI: [`@slyxup/ui`](../ui) ships `<SignIn />`, `<SignUp />`, `<UserButton />` and more, built on these hooks.

## License

MIT © [SlyxUp](https://github.com/slyxup/stack)
