'use client';

import { useAuthContext } from '../context/auth-context';

export function useSession() {
  const { isLoaded, isSignedIn, sessionId, sessionExpiresAt, reload } =
    useAuthContext();
  return {
    isLoaded,
    isSignedIn,
    session: sessionId ? { id: sessionId, expiresAt: sessionExpiresAt } : null,
    reload,
  };
}
