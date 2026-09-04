'use client';

import { useCallback } from 'react';
import { useAuthContext } from '../context/auth-context';

/**
 * OAuth-connected accounts (Google/GitHub) management.
 */
export function useConnectedAccounts() {
  const { client, isSignedIn } = useAuthContext();

  const list = useCallback(() => client.accounts.list(), [client]);
  const unlink = useCallback(
    (accountId: string, provider: 'google' | 'github') =>
      client.accounts.unlink(accountId, provider),
    [client]
  );

  return { isSignedIn, list, unlink };
}
