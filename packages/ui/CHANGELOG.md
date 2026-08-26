# @slyxup/ui

## 0.2.6

### Patch Changes

- Updated dependencies []:
  - @slyxup/react@0.2.5

## 0.2.5

### Patch Changes

- Updated dependencies []:
  - @slyxup/react@0.2.4

## 0.2.4

### Patch Changes

- Updated dependencies []:
  - @slyxup/react@0.2.3

## 0.2.3

### Patch Changes

- [`e110c4a`](https://github.com/slyxup/stack/commit/e110c4a1f4e136167d1efaaee41387159a78a04d) - Clerk-grade design overhaul + the big one: design tokens are now applied to `<html>` automatically, so inputs/buttons/cards always render with borders, radius and fonts in any host app (previously required a manual `.slyxup-root` wrapper). Adds `<SignIn onForgotPasswordClick>` and a refined dark mode.

- Updated dependencies []:
  - @slyxup/react@0.2.2

## 0.2.2

### Patch Changes

- [`9a14a5f`](https://github.com/slyxup/stack/commit/9a14a5f1357cd3e6bafc0957b1144d5e51d552e2) - Components now self-inject styles and fonts (no more missing borders/radius/fonts if `<SlyxUpStyles />` was forgotten). OAuth buttons redirect to the correct API origin instead of a relative path that broke on deployed apps.

## 0.2.1

### Patch Changes

- [`2011599`](https://github.com/slyxup/stack/commit/2011599a9c989560e34bcea3147c18923e15962d) - UI polish: black buttons in light mode, better card vs page contrast, inline missing-key banner in SignIn/SignUp, provider warns on missing publishableKey.

- Updated dependencies [[`2011599`](https://github.com/slyxup/stack/commit/2011599a9c989560e34bcea3147c18923e15962d), [`2011599`](https://github.com/slyxup/stack/commit/2011599a9c989560e34bcea3147c18923e15962d)]:
  - @slyxup/core@0.2.1
  - @slyxup/react@0.2.1

## 0.2.0

### Minor Changes

- [`7cf24ff`](https://github.com/slyxup/stack/commit/7cf24ffe37fe6f2bca41fdc0281618c2db02b3ae) - Full V1 SDKs: SlyxupClient with cookie jar, React provider + hooks, Next.js server helpers/middleware, themed UI components, slyxup CLI

### Patch Changes

- [`44da26b`](https://github.com/slyxup/stack/commit/44da26bd8f952b6fce4b67f75ddb0ef041a984ac) - ci: verify all packages CI/CD — little change in every package + auth/stack/billing

- [`fe4f8bb`](https://github.com/slyxup/stack/commit/fe4f8bb4ab412a58303f59921548d3625b0675c9) - ci: second verify all — 14:55

- Updated dependencies [[`44da26b`](https://github.com/slyxup/stack/commit/44da26bd8f952b6fce4b67f75ddb0ef041a984ac), [`fe4f8bb`](https://github.com/slyxup/stack/commit/fe4f8bb4ab412a58303f59921548d3625b0675c9), [`7cf24ff`](https://github.com/slyxup/stack/commit/7cf24ffe37fe6f2bca41fdc0281618c2db02b3ae)]:
  - @slyxup/core@0.2.0
  - @slyxup/react@0.2.0
