---
'auth.slyxup.online': patch
---

Console/API security rework: developers authenticate with verified-email sessions (no open registration), OAuth callbacks fully implemented (Google + GitHub code exchange, user upsert, session), sign-in requires verified email, first registered user bootstraps as admin, admin stats/users/subscriptions/invoices endpoints, Paddle webhook HMAC verification, and CORS now auto-allows custom domains of live projects (KV-cached 60s).
