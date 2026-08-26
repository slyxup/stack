# @slyxup/billing

Billing client for the SlyxUp platform — plans, subscriptions, invoices, and Paddle-hosted checkout. Framework-agnostic, talks to **billing.slyxup.online** (the dedicated billing Worker) and authenticates via the `slyxup_session` cookie issued by auth.slyxup.online. Built on [`@slyxup/core`](../core).

## Install

```bash
npm install @slyxup/billing
```

## Quick start

```ts
import { BillingClient } from '@slyxup/billing';

const billing = new BillingClient({ publishableKey: 'pk_test_xxx' });

const plans = await billing.listPlans('prj_your-project-id');
// Plan[] — amount, currency, interval ('month' | 'year'), features[], isPopular

await billing.checkout(plan.id);        // redirects browser to Paddle hosted checkout

const sub = await billing.getSubscription();  // Subscription | null
if (sub?.status === 'active') unlockProFeatures();

await billing.cancelSubscription();     // cancels at period end
const invoices = await billing.listInvoices();  // Invoice[] newest first
```

> In the browser, sign-in state rides on the `slyxup_session` cookie set by the auth API — no token handling needed.

## API surface

| Method | Returns | Purpose |
|---|---|---|
| `listPlans(projectId)` | `Plan[]` | Plans configured for a project |
| `checkout(planId)` | `void` | Redirects to Paddle hosted checkout |
| `getSubscription()` | `Subscription \| null` | Current user's subscription |
| `cancelSubscription()` | `void` | Cancels at period end |
| `listInvoices()` | `Invoice[]` | Invoice history |

Factory alternative: `createBillingClient(options?)`.

## Types

```ts
interface Plan {
  id: string;
  name: string;
  amount: number;          // minor units
  currency: string;
  interval: 'month' | 'year';
  trialDays: number | null;
  features: string[];
  isPopular: boolean;
}

interface Subscription {
  id: string;
  projectId: string;
  userId: string;
  planId: string;
  status: 'active' | 'trialing' | 'past_due' | 'paused' | 'canceled';
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue' | 'refunded';
  invoiceNumber: string | null;
  billedAt: string | null;
}
```

## React hooks (recommended in apps)

Don't call the client directly in React components — use the wrappers from [`@slyxup/react`](../react):

```tsx
import { usePlans, useSubscription, useCheckout } from '@slyxup/react';
```

And for UI, drop in [`<PricingTable />`](../ui) and [`<BillingPortal />`](../ui).

## How checkout completes

1. `checkout(planId)` → user pays on Paddle's hosted page.
2. Paddle fires a signed webhook at `https://billing.slyxup.online/v1/webhooks/paddle`.
3. Subscription row is written to D1 — `getSubscription()` reflects it immediately.

> Default API base URL is `https://billing.slyxup.online` (override with `apiUrl` or `NEXT_PUBLIC_SLYXUP_API_URL` / `VITE_SLYXUP_API_URL`).

## License

MIT © [SlyxUp](https://github.com/slyxup/stack)
