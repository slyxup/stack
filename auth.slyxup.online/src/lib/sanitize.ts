import type { User } from './schema';

/** Strip sensitive fields before returning a user to the client. */
export function sanitizeUser(user: User) {
  const {
    passwordHash: _hash,
    blockedReason: _reason,
    totpSecret: _totp,
    ...safe
  } = user;
  return safe;
}
