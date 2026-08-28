'use client';

import { SlyxupClient } from '@slyxup/core';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AuthContext, type AuthContextValue } from '../context/auth-context';

export interface SlyxUpProviderProps {
  publishableKey?: string;
  apiUrl?: string;
  children: ReactNode;
}

function resolveEnvKey(): string | undefined {
  try {
    const env = (
      globalThis as unknown as {
        process?: { env?: Record<string, string | undefined> };
      }
    )?.process?.env;
    if (env) {
      return (
        env.NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY ??
        env.VITE_SLYXUP_PUBLISHABLE_KEY ??
        env.REACT_APP_SLYXUP_PUBLISHABLE_KEY ??
        env.EXPO_PUBLIC_SLYXUP_PUBLISHABLE_KEY ??
        env.SLYXUP_PUBLISHABLE_KEY ??
        env.PLASMO_PUBLIC_SLYXUP_PUBLISHABLE_KEY ??
        undefined
      );
    }
  } catch {}
  return undefined;
}

function resolveEnvApiUrl(): string | undefined {
  try {
    const env = (
      globalThis as unknown as {
        process?: { env?: Record<string, string | undefined> };
      }
    )?.process?.env;
    if (env) {
      return (
        env.NEXT_PUBLIC_SLYXUP_API_URL ??
        env.VITE_SLYXUP_API_URL ??
        env.REACT_APP_SLYXUP_API_URL ??
        env.EXPO_PUBLIC_SLYXUP_API_URL ??
        env.SLYXUP_API_URL ??
        undefined
      );
    }
  } catch {}
  return undefined;
}

export function SlyxUpProvider({
  publishableKey,
  apiUrl,
  children,
}: SlyxUpProviderProps) {
  const resolvedKey = publishableKey ?? resolveEnvKey();
  const resolvedApiUrl = apiUrl ?? resolveEnvApiUrl();
  const client = useMemo(() => {
    if (!resolvedKey && typeof window !== 'undefined') {
      console.warn(
        '[SlyxUp] No publishableKey provided. Tried NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY, VITE_SLYXUP_PUBLISHABLE_KEY, REACT_APP_SLYXUP_PUBLISHABLE_KEY, EXPO_PUBLIC_SLYXUP_PUBLISHABLE_KEY, SLYXUP_PUBLISHABLE_KEY. Set one in .env.local or pass publishableKey prop. Get your key: `npx @slyxup/cli keys create --project-id <id> --type publishable`'
      );
    }
    return new SlyxupClient({
      publishableKey: resolvedKey ?? 'pk_test_missing',
      apiUrl: resolvedApiUrl,
    });
  }, [resolvedKey, resolvedApiUrl]);

  const [state, setState] = useState<{
    isLoaded: boolean;
    isSignedIn: boolean;
    user: AuthContextValue['user'];
    sessionId: string | null;
    sessionExpiresAt: string | null;
  }>({
    isLoaded: false,
    isSignedIn: false,
    user: null,
    sessionId: null,
    sessionExpiresAt: null,
  });

  const reload = useCallback(async () => {
    try {
      const res = await client.sessions.get();
      const me = await client.users.me().catch(() => null);
      setState({
        isLoaded: true,
        isSignedIn: true,
        user: me?.user ?? {
          id: res.user.id,
          projectId: null,
          email: res.user.email,
          emailVerified: false,
          username: null,
          firstName: null,
          lastName: null,
          avatarUrl: null,
          twoFactorEnabled: false,
          preferences: null,
          createdAt: '',
          updatedAt: '',
        },
        sessionId: res.session.id,
        sessionExpiresAt: res.session.expiresAt,
      });
    } catch {
      setState((s) => ({
        ...s,
        isLoaded: true,
        isSignedIn: false,
        user: null,
        sessionId: null,
        sessionExpiresAt: null,
      }));
    }
  }, [client]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Auto-refresh session state every 5 minutes
  useEffect(() => {
    const t = setInterval(() => void reload(), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [reload]);

  const value: AuthContextValue = {
    client,
    ...state,
    userId: state.user?.id ?? null,
    reload,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
