import type { User } from './schema';

/** Strip sensitive fields before returning a user to the client. */
export function sanitizeUser(user: User) {
  const { passwordHash: _, blockedReason: _r, ...safe } = user;
  return safe;
}
