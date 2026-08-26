---
'@slyxup/billing': minor
---

**BillingClient now defaults to `https://billing.slyxup.online`** — the dedicated billing Worker and single owner of billing (plans, subscriptions, invoices, Paddle webhooks). The auth Worker (`auth.slyxup.online`) no longer serves `/v1/billing/*`. Pass `apiUrl` explicitly only if you self-host billing.
