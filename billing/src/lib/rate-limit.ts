/** Simple KV-based rate limiter — DEDUPLICATED: identical to auth.slyxup.online/src/lib/rate-limit.ts
 * TODO: Extract to @slyxup/shared/rate-limit and import in both Workers (single source).
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

export async function checkRateLimit(
  kv: KVNamespace,
  identifier: string,
  max = 30,
  windowSec = 60
): Promise<RateLimitResult> {
  const key = `rl:${identifier}:${Math.floor(Date.now() / (windowSec * 1000))}`;
  const countStr = await kv.get(key);
  const count = Number(countStr ?? 0) + 1;

  if (count > max) {
    const windowStart =
      Math.floor(Date.now() / (windowSec * 1000)) * (windowSec * 1000);
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil((windowStart + windowSec * 1000 - Date.now()) / 1000),
    };
  }

  await kv.put(key, String(count), { expirationTtl: windowSec });
  return { allowed: true, remaining: max - count, resetIn: windowSec };
}
