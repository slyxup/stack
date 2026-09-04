'use client';

import { useAuthContext } from '../context/auth-context';

export function useUser() {
  const { isLoaded, isSignedIn, user, reload } = useAuthContext();
  return {
    isLoaded,
    isSignedIn,
    user,
    isSignedOut: isLoaded && !isSignedIn,
    reload,
  };
}
