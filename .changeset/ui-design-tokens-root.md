---
'@slyxup/ui': patch
---

Clerk-grade design overhaul + the big one: design tokens are now applied to `<html>` automatically, so inputs/buttons/cards always render with borders, radius and fonts in any host app (previously required a manual `.slyxup-root` wrapper). Adds `<SignIn onForgotPasswordClick>` and a refined dark mode.
