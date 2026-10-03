/** Memory-first rate limiter (KV writes are precious — 1k/day on free).
 *
 * The isolate-local counter is authoritative for the fast path, so normal
 * traffic costs ZERO KV writes. KV is touched only twice:
 *  - one cheap GET when a new window opens (honor a block set by another isolate)
 *  - one best-effort PUT when this isolate actually blocks someone (share it)
 * Enforcement is per-isolate (documented Cloudflare caveat).
 *
 * V4 adds per-endpoint budgets: login/signup/password flows are strict
 * (credential-stuffing defense), read/list endpoints are generous.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

export interface RateLimitConfig {
  requests: number;
  window: number; // seconds
}

/** Per-endpoint budgets. Keys are logical endpoint names (see resolveEndpoint). */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth — strict (credential stuffing / enumeration defense)
  'auth:sign-in': { requests: 5, window: 60 },
  'auth:sign-up': { requests: 3, window: 300 },
  'auth:forgot-password': { requests: 3, window: 300 },
  'auth:reset-password': { requests: 5, window: 300 },
  'auth:verify-email': { requests: 10, window: 60 },
  'auth:resend-verification': { requests: 3, window: 300 },
  'auth:password-change-required': { requests: 5, window: 300 },

  // 2FA — allow human retries
  'auth:2fa-complete': { requests: 10, window: 60 },
  'auth:2fa-setup': { requests: 5, window: 300 },
  'auth:2fa-verify': { requests: 10, window: 60 },

  // OAuth — moderate (redirects are user-driven)
  'auth:oauth-start': { requests: 10, window: 60 },
  'auth:oauth-callback': { requests: 20, window: 60 },
  'auth:oauth-exchange': { requests: 10, window: 60 },

  // Sessions
  'session:get': { requests: 60, window: 60 },
  'session:create': { requests: 10, window: 60 },
  'session:list': { requests: 20, window: 60 },
  'session:revoke': { requests: 10, window: 60 },

  // Users
  'user:update': { requests: 10, window: 60 },
  'user:delete': { requests: 3, window: 300 },
  'user:password-change': { requests: 5, window: 300 },

  // Projects / keys (admin-ish, low volume)
  'project:create': { requests: 5, window: 300 },
  'project:update': { requests: 20, window: 60 },
  'project:delete': { requests: 3, window: 300 },
  'keys:create': { requests: 10, window: 60 },
  'keys:revoke': { requests: 10, window: 60 },
  'keys:resolve': { requests: 30, window: 60 },

  // Admin / setup / verification
  'admin:write': { requests: 20, window: 60 },
  'admin:read': { requests: 60, window: 60 },
  'verification:write': { requests: 10, window: 60 },
  'setup:write': { requests: 5, window: 300 },

  // Webhooks — signature-validated, effectively unlimited
  'webhook:paddle': { requests: 1000, window: 60 },

  default: { requests: 20, window: 60 },
};

/**
 * Map (method, path) → logical endpoint key in RATE_LIMITS.
 * Keep in sync with routes in src/routes/*. Longest-prefix wins via
 * ordered checks; unknown paths fall back to 'default'.
 */
export function resolveEndpoint(method: string, path: string): string {
  const m = method.toUpperCase();
  // Auth
  if (path === '/v1/auth/sign-in' && m === 'POST') return 'auth:sign-in';
  if (path === '/v1/auth/sign-up' && m === 'POST') return 'auth:sign-up';
  if (path === '/v1/auth/sign-in/2fa' && m === 'POST')
    return 'auth:2fa-complete';
  if (
    path === '/v1/auth/password-change-required' ||
    path === '/v1/auth/force-password-change'
  )
    return 'auth:password-change-required';
  if (path.startsWith('/v1/verification/password/forgot'))
    return 'auth:forgot-password';
  if (path.startsWith('/v1/verification/password/reset'))
    return 'auth:reset-password';
  if (
    path.startsWith('/v1/verification/verify') ||
    path.startsWith('/v1/verification/resend')
  ) {
    return path.includes('resend')
      ? 'auth:resend-verification'
      : 'auth:verify-email';
  }
  if (path.startsWith('/v1/verification/')) return 'verification:write';
  if (path.includes('/2fa/setup')) return 'auth:2fa-setup';
  if (path.includes('/2fa/verify')) return 'auth:2fa-verify';
  if (path.includes('/2fa/')) return 'auth:2fa-complete';
  // OAuth
  if (path === '/v1/oauth/exchange' && m === 'POST')
    return 'auth:oauth-exchange';
  if (path.startsWith('/v1/oauth/')) {
    return path.includes('/callback/')
      ? 'auth:oauth-callback'
      : 'auth:oauth-start';
  }
  // Sessions
  if (path === '/v1/session' || path === '/v1/sessions') {
    if (m === 'GET') return 'session:list';
    if (m === 'DELETE') return 'session:revoke';
    return 'session:create';
  }
  if (path.startsWith('/v1/sessions/')) return 'session:revoke';
  // Users
  if (path === '/v1/user' && (m === 'PATCH' || m === 'PUT'))
    return 'user:update';
  if (path === '/v1/user' && m === 'DELETE') return 'user:delete';
  if (path.includes('/password') && path.startsWith('/v1/user'))
    return 'user:password-change';
  if (path.startsWith('/v1/user/')) return 'user:update';
  // Keys
  if (path.startsWith('/v1/key/resolve')) return 'keys:resolve';
  if (path.startsWith('/v1/keys'))
    return m === 'GET' ? 'session:list' : 'keys:create';
  // Projects
  if (path === '/v1/projects' && m === 'POST') return 'project:create';
  if (path.startsWith('/v1/projects/') && m === 'DELETE')
    return 'project:delete';
  if (path.startsWith('/v1/projects')) return 'project:update';
  // Admin / setup
  if (path.startsWith('/v1/admin'))
    return m === 'GET' ? 'admin:read' : 'admin:write';
  if (path.startsWith('/v1/setup')) return 'setup:write';
  return 'default';
}

type Bucket = { count: number; expiresAt: number };
const memBuckets = new Map<string, Bucket>();

function gc(now: number): void {
  if (memBuckets.size > 5000) {
    for (const [k, v] of memBuckets)
      if (v.expiresAt <= now) memBuckets.delete(k);
  }
}

async function checkBucket(
  kv: KVNamespace | undefined,
  bucketKey: string,
  max: number,
  windowSec: number
): Promise<RateLimitResult> {
  const windowId = Math.floor(Date.now() / (windowSec * 1000));
  const key = `rl:${bucketKey}:${windowId}`;
  const blockKey = `rlb:${bucketKey}:${windowId}`;
  const now = Date.now();
  const windowStart = windowId * (windowSec * 1000);
  const resetIn = Math.max(
    1,
    Math.ceil((windowStart + windowSec * 1000 - now) / 1000)
  );

  // Fast path: live window in this isolate — no KV I/O at all.
  const cur = memBuckets.get(key);
  if (cur && cur.expiresAt > now) {
    cur.count += 1;
    if (cur.count > max) {
      // Share the block cross-isolate; never awaited, never blocks the request.
      try {
        void kv
          ?.put(blockKey, '1', { expirationTtl: windowSec })
          .catch(() => undefined);
      } catch {
        /* KV unavailable */
      }
      return { allowed: false, remaining: 0, resetIn };
    }
    return { allowed: true, remaining: max - cur.count, resetIn };
  }

  // New window on this isolate: honor a block set by another isolate (one GET).
  if (kv) {
    try {
      const blocked = await kv.get(blockKey);
      if (blocked) return { allowed: false, remaining: 0, resetIn };
    } catch {
      // KV unavailable — fall through to memory-only limiting.
    }
  }

  memBuckets.set(key, { count: 1, expiresAt: now + windowSec * 1000 });
  gc(now);
  return { allowed: true, remaining: max - 1, resetIn };
}

/** Legacy signature: generic bucket with explicit budget. Kept for compat. */
export async function checkRateLimit(
  kv: KVNamespace,
  identifier: string,
  max = 30,
  windowSec = 60
): Promise<RateLimitResult> {
  return checkBucket(kv, identifier, max, windowSec);
}

/** Preferred signature: per-endpoint budget looked up from RATE_LIMITS. */
export async function checkEndpointRateLimit(
  kv: KVNamespace | undefined,
  endpoint: string,
  ip: string
): Promise<RateLimitResult & { endpoint: string }> {
  const config = RATE_LIMITS[endpoint] ?? RATE_LIMITS.default;
  const r = await checkBucket(
    kv,
    `${endpoint}:${ip}`,
    config.requests,
    config.window
  );
  return { ...r, endpoint };
}
