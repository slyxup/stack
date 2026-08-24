# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅        |

## Reporting a Vulnerability

Email `security@slyxup.online` or open a private security advisory on GitHub.

We use:
- `crypto.randomUUID()` / `crypto.subtle` — never `Math.random()`
- `wrangler secret put` — never commit secrets
- `D1 prepare().bind()` — always param-bind
- `HttpOnly + Secure + SameSite` cookies

Do not report via public issues.
