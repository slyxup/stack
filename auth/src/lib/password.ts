// Password hashing — versioned, Workers-compatible (WebCrypto PBKDF2).
//
// PLAN NOTE (Day 1 deviation): IMPLEMENTATION_PLAN.md prescribes `oslo`
// Argon2id with 19 MiB memory. That breaks Cloudflare Workers in practice:
//  - `oslo/password` is deprecated and pulls Node crypto APIs not present
//    in workerd,
//  - Argon2id m=19MiB x t=2 blows the 10–50ms Workers CPU budget per login,
//    causing timeouts under load.
// OWASP (2023+) prefers PBKDF2-HMAC-SHA-256 at 600k iterations, but workerd's
// WebCrypto hard-caps PBKDF2 at 100,000 iterations — requesting more throws
// ("iteration counts above 100000 are not supported") and broke all signups.
// So the current version is PBKDF2-HMAC-SHA-256 at exactly 100k: the strongest
// setting this runtime allows. Format stays versioned, so if Workers ever
// raises the cap we can bump CURRENT_ITERATIONS and old hashes keep verifying
// (iterations are parsed from the stored string) with opportunistic rehash:
//
//   legacy  `salt_b64:hash_b64`              → PBKDF2 100k, unversioned (pre-V4)
//   current `pbkdf2$100000$salt_b64$hash_b64` → PBKDF2 100k (V4+)
//   future  `$argon2id$...`                  → reserved; verify returns false
//                                            until an Argon2id verifier lands
//
// `passwordHashVersion` column tracks which version each row uses.
// `needsRehash()` + opportunistic rehash in signIn() gives zero-downtime
// migration: old hashes keep verifying, then upgrade on next login.

const CURRENT_ITERATIONS = 100_000;
const LEGACY_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

function b64encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function b64decode(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    KEY_BITS
  );
  return new Uint8Array(bits);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, CURRENT_ITERATIONS);
  return `pbkdf2$${CURRENT_ITERATIONS}$${b64encode(salt)}$${b64encode(hash)}`;
}

/** Hash identifier stored in `users.passwordHashVersion`. */
export type PasswordHashVersion = 'pbkdf2' | 'pbkdf2-600k' | 'argon2id';

export function getHashVersion(stored: string): PasswordHashVersion {
  if (stored.startsWith('$argon2id$')) return 'argon2id';
  if (stored.startsWith('pbkdf2$')) {
    // 'pbkdf2-600k' is retired (workerd caps PBKDF2 at 100k) but kept as a
    // label so rows written by the old hasher stay identifiable.
    const iterations = Number(stored.split('$')[1]);
    if (iterations === 600_000) return 'pbkdf2-600k';
  }
  return 'pbkdf2';
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  // Future Argon2id hashes — no verifier in Workers runtime yet.
  // Return false so callers reject; a verifier can be plugged in here.
  if (stored.startsWith('$argon2id$')) return false;

  // Current versioned format: pbkdf2$<iterations>$<salt>$<hash>
  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$');
    if (parts.length !== 4) return false;
    const iterations = Number(parts[1]);
    if (!Number.isInteger(iterations) || iterations <= 0) return false;
    try {
      const salt = b64decode(parts[2]);
      const expected = b64decode(parts[3]);
      const hash = await derive(password, salt, iterations);
      return constantTimeEqual(hash, expected);
    } catch {
      return false;
    }
  }

  // Legacy format: base64(salt):base64(hash) @ 100k iterations
  if (stored.includes(':')) {
    const [saltB64, hashB64] = stored.split(':');
    if (!saltB64 || !hashB64) return false;
    try {
      const salt = b64decode(saltB64);
      const expected = b64decode(hashB64);
      const hash = await derive(password, salt, LEGACY_ITERATIONS);
      return constantTimeEqual(hash, expected);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * True when the stored hash is not the current version and should be
 * upgraded on next successful login (opportunistic rehash).
 */
export function needsRehash(storedHash: string): boolean {
  // Anything that isn't the current `pbkdf2$100000$` format rehashes.
  // `$argon2id$` returns false here only because we can't verify it yet —
  // if a verifier lands, flip this to check its params.
  if (storedHash.startsWith('$argon2id$')) return false;
  if (!storedHash.startsWith('pbkdf2$')) return true;
  const iterations = Number(storedHash.split('$')[1]);
  return iterations !== CURRENT_ITERATIONS;
}

/** Current version label to store in `users.passwordHashVersion` on write. */
export const CURRENT_HASH_VERSION: PasswordHashVersion = 'pbkdf2';
