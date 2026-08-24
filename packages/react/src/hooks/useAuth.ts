'use client';

import type { SignInInput, SignUpInput } from '@slyxup/core';
import { useAuthContext } from '../context/auth-context';

export function useAuth() {
  const ctx = useAuthContext();
  const { client, isLoaded, isSignedIn, userId, reload } = ctx;

  const signIn = async (input: SignInInput) => {
    const res = await client.auth.signIn(input);
    await reload();
    return res;
  };

  const signUp = async (input: SignUpInput) => {
    const res = await client.auth.signUp(input);
    await reload();
    return res;
  };

  const signOut = async () => {
    const res = await client.auth.signOut();
    await reload();
    return res;
  };

  return { isLoaded, isSignedIn, userId, signIn, signUp, signOut };
}
