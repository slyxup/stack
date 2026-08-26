---
'@slyxup/cli': minor
'@slyxup/core': patch
---

CLI: new `slyxup auth` command group using @slyxup/core SDK — `auth signup`, `auth signin`, `auth verify` (email verification), `auth oauth` (opens Google/GitHub in browser). Browser open is non-blocking. CLI now depends on @slyxup/core.
