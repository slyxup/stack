# @slyxup/billing

## 0.4.0

### Minor Changes

- [`854a5b9`](https://github.com/slyxup/stack/commit/854a5b972efad4c03e3572c9ddfcf44d259afbce) - Version alignment: move to fresh minor range past registry tombstones (npm/cli#8194). No code changes.

## 0.2.4

### Patch Changes

- [`ae2df60`](https://github.com/slyxup/stack/commit/ae2df60476e24fa349738b484cb14cbdfeaae6ae) - Retry publish: 0.2.3 hit an npm registry tombstone (npm/cli#8194). No code changes since 0.1.3 except internal formatting — version alignment only.

## 0.2.3

### Patch Changes

- [`f04c62b`](https://github.com/slyxup/stack/commit/f04c62bd0234a839a2b22d825818ea0c253e18f1) - Version alignment: 0.2.0/0.2.1 hit npm's 24h republish lock after an unpublished release. No code changes.

## 0.2.1

### Patch Changes

- [`29df6c7`](https://github.com/slyxup/stack/commit/29df6c792a56f9f9d3d9bfbb85f46a5cda545468) - Republish: previous release run hit an npm registry race (E400 on unchanged artifacts). No code changes — version alignment only.

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
