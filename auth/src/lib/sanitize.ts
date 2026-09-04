import type { User } from './schema';

type UserWithBio = User & { bio?: string | null };

/** Strip sensitive fields before returning a user to the client. */
export function sanitizeUser(user: UserWithBio) {
  const {
    passwordHash: _hash,
    blockedReason: _reason,
    totpSecret: _totp,
    ...safe
  } = user;
  return safe;
}
