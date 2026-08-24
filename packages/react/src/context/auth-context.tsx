'use client';

import type { SlyxupClient, SlyxupUser } from '@slyxup/core';
import { createContext, useContext } from 'react';

export interface AuthContextValue {
  client: SlyxupClient;
  isLoaded: boolean;
  isSignedIn: boolean;
  user: SlyxupUser | null;
  userId: string | null;
  sessionId: string | null;
  sessionExpiresAt: string | null;
  /** Refresh session/user from API */
  reload: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error('SlyxUp hooks must be used inside <SlyxUpProvider>');
  return ctx;
}
