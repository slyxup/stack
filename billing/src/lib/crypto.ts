// SlyxUp Billing — WebCrypto helpers (Workers-compatible)
// NOTE: This is a deduplicated copy of auth.slyxup.online/src/lib/crypto.ts hmac/timing helpers.
// Canonical implementation lives in auth — billing keeps a lightweight copy for Workers isolation.
// If updating logic, sync both files or extract to @slyxup/shared/crypto (TODO).

/** HMAC-SHA256 -> lowercase hex string */
export async function hmacSha256Hex(
  secret: string,
  message: string
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Constant-time string compare (length-independent early exit only on length) */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
