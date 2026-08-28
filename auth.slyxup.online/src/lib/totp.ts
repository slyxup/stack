// TOTP (RFC 6238) implementation for authenticator apps (e.g. Google Authenticator).
// Uses WebCrypto HMAC-SHA1 so it runs on Cloudflare Workers. Base32 per RFC 4648.

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Generate a random base32 TOTP secret (default 160 bits => 32 chars). */
export function generateTOTPSecret(bytes = 20): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** Decode a base32 string to bytes. Throws on invalid input. */
function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/[= ]/g, '');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const c of clean) {
    const idx = BASE32_ALPHABET.indexOf(c);
    if (idx === -1) throw new Error(`Invalid base32 character: ${c}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

async function hmacSha1(
  key: Uint8Array,
  message: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, message);
  return new Uint8Array(sig);
}

/**
 * Compute a TOTP code for a given secret + time step.
 * @param secret Base32 secret
 * @param timeStepSeconds Default 30 (same window login + verifier use)
 * @param digits 6 or 8
 */
export async function totp(
  secretBase32: string,
  { timeStepSeconds = 30, digits = 6, timestamp = Date.now() } = {}
): Promise<string> {
  const key = base32Decode(secretBase32);
  const counter = Math.floor(timestamp / 1000 / timeStepSeconds);
  const counterBuf = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = c & 0xff;
    c >>>= 8;
  }
  const hmac = await hmacSha1(key, counterBuf);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = bin % 10 ** digits;
  return String(code).padStart(digits, '0');
}

/** Verify a 6-digit code accepting a +/-1 step drift window. */
export async function verifyTOTP(
  secretBase32: string,
  code: string,
  digits = 6
): Promise<boolean> {
  const clean = code.trim();
  if (!/^\d{6,8}$/.test(clean)) return false;
  const now = Date.now();
  const step = 30 * 1000;
  for (let drift = -1; drift <= 1; drift++) {
    const candidate = await totp(secretBase32, {
      digits,
      timestamp: now + drift * step,
    });
    if (candidate === clean) return true;
  }
  return false;
}

/** Build an otpauth:// provisioning URI (for the setup QR / manual entry label). */
export function totpProvisioningUri({
  secretBase32,
  accountName,
  issuer = 'SlyxUp',
}: {
  secretBase32: string;
  accountName: string;
  issuer?: string;
}): string {
  const label = `${issuer}:${accountName}`.replace(/[&:=+]/g, '_');
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
