/** Memory-first rate limiter — mirrors auth worker (Workers-isolated copy).
 * TODO: Extract to @slyxup/shared/rate-limit and import in both Workers.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

export interface RateLimitConfig {
  requests: number;
  window: number;
}

/** Billing per-endpoint budgets. Refunds/cancels are strict; reads generous. */
export const BILLING_RATE_LIMITS: Record<string, RateLimitConfig> = {
  'billing:checkout': { requests: 10, window: 60 },
  'billing:subscribe': { requests: 10, window: 60 },
  'billing:cancel-subscription': { requests: 5, window: 300 },
  'billing:refund': { requests: 3, window: 300 },
  'billing:read': { requests: 60, window: 60 },
  'webhook:paddle': { requests: 1000, window: 60 },
  default: { requests: 20, window: 60 },
};

export function resolveBillingEndpoint(method: string, path: string): string {
  const m = method.toUpperCase();
  if (path.startsWith('/v1/webhooks/')) return 'webhook:paddle';
  if (path.includes('refund')) return 'billing:refund';
  if (path.includes('cancel')) return 'billing:cancel-subscription';
  if (path.includes('checkout') || path.includes('subscri')) {
    return m === 'GET' ? 'billing:read' : 'billing:checkout';
  }
  if (m === 'GET') return 'billing:read';
  return 'billing:checkout';
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
  const cur = memBuckets.get(key);
  if (cur && cur.expiresAt > now) {
    cur.count += 1;
    if (cur.count > max) {
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
  if (kv) {
    try {
      const blocked = await kv.get(blockKey);
      if (blocked) return { allowed: false, remaining: 0, resetIn };
    } catch {
      /* fall through */
    }
  }
  memBuckets.set(key, { count: 1, expiresAt: now + windowSec * 1000 });
  gc(now);
  return { allowed: true, remaining: max - 1, resetIn };
}

export async function checkRateLimit(
  kv: KVNamespace,
  identifier: string,
  max = 30,
  windowSec = 60
): Promise<RateLimitResult> {
  return checkBucket(kv, identifier, max, windowSec);
}

export async function checkBillingRateLimit(
  kv: KVNamespace | undefined,
  endpoint: string,
  ip: string
): Promise<RateLimitResult & { endpoint: string }> {
  const config =
    BILLING_RATE_LIMITS[endpoint] ?? BILLING_RATE_LIMITS.default;
  const r = await checkBucket(
    kv,
    `${endpoint}:${ip}`,
    config.requests,
    config.window
  );
  return { ...r, endpoint };
}
