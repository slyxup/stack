# SDK Error Reference

Every API failure throws a `SlyxupError` (or subclass) with a machine `code`.
Use `code` for branching, `message` for display, and `err.hint` (or
`getErrorHint(code)`) for troubleshooting text.

```ts
import { SlyxupClient, getErrorHint, isRetryableCode } from '@slyxup/core';

try {
  await client.auth.signIn({ email, password });
} catch (err) {
  if (err instanceof SlyxupError) {
    console.log(err.code, err.message, err.hint);
    if (isRetryableCode(err.code)) scheduleRetry();
  }
}
```

## Codes

| Code | HTTP | Meaning | What to do |
|------|------|---------|------------|
| `CSRF_TOKEN_INVALID` | 403 | Missing/stale CSRF header | SDK retries automatically; manual callers: `GET /v1/health` → send `X-CSRF-Token` |
| `TOO_MANY_REQUESTS` / `rate_limited` | 429 | Budget exceeded | Honor `Retry-After`, back off |
| `EMAIL_NOT_VERIFIED` | 403 | Login before verification | Resend via `POST /v1/verification/resend` |
| `PASSWORD_CHANGE_REQUIRED` | 403 | Default password | Force-change first |
| `2FA_REQUIRED` | 403 | TOTP challenge pending | `completeSignIn({ challengeToken, code })` |
| `INVALID_2FA_CODE` | 401 | Wrong TOTP | Use latest 30s code |
| `2FA_CHALLENGE_INVALID` | 400 | Challenge expired (5 min) | Restart sign-in |
| `ACCOUNT_BLOCKED` | 403 | Admin-blocked | Contact support |
| `INVALID_PUBLISHABLE_KEY` | 401 | Wrong `pk_` | Check env key |
| `INVALID_BOOTSTRAP_TOKEN` | 403 | Wrong bootstrap token | Check worker env |
| `unauthorized` | 401 | No/expired session | Sign in again |
| `validation_error` | 400 | Bad input | Client validates first via `validateSignUp`/`validateSignIn` |
| `network_error` | 0 | Fetch failed | Check connectivity + `apiUrl` |

## Client-side validation

```ts
import { validateSignUp, validateSignIn } from '@slyxup/core';

const issues = validateSignUp({ email, password });
if (issues.length) showFieldErrors(issues); // [{ field, message }]
```

Mirrors server Zod schemas. Server remains authoritative.
