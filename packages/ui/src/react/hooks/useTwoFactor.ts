'use client';

import { useCallback } from 'react';
import { useAuthContext } from '../context/auth-context';

/**
 * TOTP two-factor authentication helpers. Use together with `SlyxupProvider`.
 */
export function useTwoFactor() {
  const { client, isSignedIn } = useAuthContext();

  const setup = useCallback(() => client.twoFactor.setup(), [client]);
  const status = useCallback(() => client.twoFactor.status(), [client]);
  const enable = useCallback(
    (secret: string, code: string) => client.twoFactor.enable(secret, code),
    [client]
  );
  const verify = useCallback(
    (code: string) => client.twoFactor.verify(code),
    [client]
  );
  const disable = useCallback(
    (code: string) => client.twoFactor.disable(code),
    [client]
  );

  return { isSignedIn, setup, status, enable, verify, disable };
}
