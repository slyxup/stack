import { hmacSha256Hex } from './crypto';

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

/** Normalize a User-Agent so minor browser patch bumps don't rotate the fingerprint. */
export function normalizeUserAgent(ua: string): string {
  return ua.replace(/\d+\.\d+(\.\d+)?(\.\d+)?/g, 'x').substring(0, 200);
}

/**
 * Session fingerprint: HMAC-SHA256(ip + normalized UA, SESSION_SECRET).
 * HMAC (not plain hash) so fingerprints can't be forged offline even if
 * the session table leaks — the secret never leaves the Worker.
 * Returns null when no secret is configured (fingerprinting disabled).
 */
export async function generateFingerprint(
  meta: RequestMeta,
  secret: string | undefined
): Promise<string | null> {
  if (!secret) return null;
  const ip = meta.ip ?? 'unknown';
  const ua = normalizeUserAgent(meta.userAgent ?? 'unknown');
  return hmacSha256Hex(secret, `${ip}:${ua}`);
}

export function extractDeviceInfo(ua: string): {
  browser: string;
  os: string;
  device: string;
} {
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';
  if (ua.includes('Edge/') || ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Opera/') || ua.includes('OPR/')) browser = 'Opera';

  // Mobile OS first: iPhone UAs contain "like Mac OS X", Android ones "Linux".
  if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Linux')) os = 'Linux';

  if (
    ua.includes('Mobile') ||
    ua.includes('Android') ||
    ua.includes('iPhone')
  ) {
    device = 'Mobile';
  } else if (ua.includes('Tablet') || ua.includes('iPad')) {
    device = 'Tablet';
  }
  return { browser, os, device };
}
