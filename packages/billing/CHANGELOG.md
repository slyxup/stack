# @slyxup/billing

## 0.2.0

### Minor Changes

- [`e110c4a`](https://github.com/slyxup/stack/commit/e110c4a1f4e136167d1efaaee41387159a78a04d) - **BillingClient now defaults to `https://billing.slyxup.online`** — the dedicated billing Worker and single owner of billing (plans, subscriptions, invoices, Paddle webhooks). The auth Worker (`auth.slyxup.online`) no longer serves `/v1/billing/*`. Pass `apiUrl` explicitly only if you self-host billing.

## 0.1.3

### Patch Changes

- [`2011599`](https://github.com/slyxup/stack/commit/2011599a9c989560e34bcea3147c18923e15962d) - BillingClient is browser-safe: reads API URL from process.env, import.meta.env.VITE_SLYXUP_API_URL, or fallback without crashing when `process` is undefined.

- Updated dependencies [[`2011599`](https://github.com/slyxup/stack/commit/2011599a9c989560e34bcea3147c18923e15962d)]:
  - @slyxup/core@0.2.1

## 0.1.2

### Patch Changes

- [`44da26b`](https://github.com/slyxup/stack/commit/44da26bd8f952b6fce4b67f75ddb0ef041a984ac) - ci: verify all packages CI/CD — little change in every package + auth/stack/billing

- [`fe4f8bb`](https://github.com/slyxup/stack/commit/fe4f8bb4ab412a58303f59921548d3625b0675c9) - ci: second verify all — 14:55
