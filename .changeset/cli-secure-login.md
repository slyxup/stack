---
'@slyxup/cli': major
---

**Security hardening.** `slyxup login` now uses the platform auth flow (`/v1/auth/sign-in`): accounts must have a verified email, and the stored credential is a revocable 7-day session token instead of a static developer id. The old open `/v1/developers/register|lookup` endpoints are gone server-side; legacy credentials stop working — log in again.
