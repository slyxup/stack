# @slyxup/core

## 3.0.0

### Major Changes

- Add project OAuth start/callback exchange with S256 proof keys, same-tab verifier storage and second-factor challenges. Backend migrations must be deployed before enabling these methods.

- Make session transport explicit and project-scoped, validate Next.js middleware sessions, connect billing hooks to their auth provider, preserve actionable SDK errors, and complete username/recovery-code sign-in. Correct currency totals and remove automatic external font loading.

  Migration: legacy localStorage session tokens are no longer read. Sign in again; use memory sessions, explicitly opt into project-scoped tab storage, or use a same-origin HttpOnly server integration. Standalone billing clients must receive getToken. Middleware now accepts Request and returns Promise<Response>. See INTEGRATION_GUIDE.md and package READMEs before upgrading.

## 0.2.1

### Patch Changes

- [`2011599`](https://github.com/slyxup/stack/commit/2011599a9c989560e34bcea3147c18923e15962d) - CLI: new `slyxup auth` command group using @slyxup/core SDK — `auth signup`, `auth signin`, `auth verify` (email verification), `auth oauth` (opens Google/GitHub in browser). Browser open is non-blocking. CLI now depends on @slyxup/core.

## 0.2.0

### Minor Changes

- [`7cf24ff`](https://github.com/slyxup/stack/commit/7cf24ffe37fe6f2bca41fdc0281618c2db02b3ae) - Full V1 core and UI SDK release with authenticated client helpers and themed components

### Patch Changes

- [`44da26b`](https://github.com/slyxup/stack/commit/44da26bd8f952b6fce4b67f75ddb0ef041a984ac) - ci: verify all packages CI/CD — little change in every package + auth/stack/billing

- [`fe4f8bb`](https://github.com/slyxup/stack/commit/fe4f8bb4ab412a58303f59921548d3625b0675c9) - ci: second verify all — 14:55
