import type { User } from './schema';

type UserWithBio = User & { bio?: string | null };

/** Strip `<...>` tags from a string (stored-XSS defense; React escapes the rest). */
function stripTags(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  if (!v.includes('<')) return v;
  return v.replace(/<[^>]*>/g, '').trim();
}

/**
 * Strip sensitive fields before returning a user to the client, and remove
 * HTML tags from display fields (stored-XSS defense in depth — JSON goes to
 * non-React consumers too).
 */
export function sanitizeUser(user: UserWithBio) {
  const {
    passwordHash: _hash,
    blockedReason: _reason,
    totpSecret: _totp,
    ...safe
  } = user;
  const out: Record<string, unknown> = { ...safe };
  for (const k of ['firstName', 'lastName', 'username', 'bio', 'avatarUrl'] as const) {
    if (k in out) {
      const v = stripTags(out[k]);
      // Neutralize javascript:/data: URL schemes in avatar URLs.
      if (k === 'avatarUrl' && typeof v === 'string' && /^\s*(javascript|data):/i.test(v)) {
        out[k] = null;
      } else {
        out[k] = v;
      }
    }
  }
  return out;
}
