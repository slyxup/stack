'use client';

import type {
  CompleteSignInInput,
  SignInInput,
  SignUpInput,
} from '@slyxup/core';
import { useAuthContext } from '../context/auth-context';

export function useAuth() {
  const ctx = useAuthContext();
  const { client, isLoaded, isSignedIn, userId, reload } = ctx;

  const signIn = async (input: SignInInput) => {
    const res = await client.auth.signIn(input);
    // Only reload when a session was actually created (i.e. not 2FA_REQUIRED).
    if (!res || (res as { code?: string }).code !== '2FA_REQUIRED') {
      await reload();
    }
    return res;
  };

  const completeSignIn = async (input: CompleteSignInInput) => {
    const res = await client.auth.completeSignIn(input);
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

  return {
    isLoaded,
    isSignedIn,
    userId,
    client,
    signIn,
    completeSignIn,
    signUp,
    signOut,
    resendVerification: client.auth.resendVerification,
    forgotPassword: client.auth.forgotPassword,
    resetPassword: client.auth.resetPassword,
    verifyEmail: client.auth.verifyEmail,
  };
}
