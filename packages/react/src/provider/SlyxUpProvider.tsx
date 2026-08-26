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

export function SlyxUpProvider({
  publishableKey,
  apiUrl,
  children,
}: SlyxUpProviderProps) {
  const client = useMemo(() => {
    if (!publishableKey && typeof window !== 'undefined') {
      console.warn(
        '[SlyxUp] No publishableKey provided. Set NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY in .env.local or pass publishableKey prop. Get your key: `npx @slyxup/cli keys create --project-id <id> --type publishable`'
      );
    }
    return new SlyxupClient({
      publishableKey: publishableKey ?? 'pk_test_missing',
      apiUrl,
    });
  }, [publishableKey, apiUrl]);

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
          firstName: null,
          lastName: null,
          avatarUrl: null,
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
