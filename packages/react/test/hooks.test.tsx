import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';

const mockClient = vi.hoisted(() => ({
  auth: {
    signIn: vi.fn().mockResolvedValue({ ok: true, user: { id: 'u1', email: 'a@b.com' } }),
    signUp: vi.fn().mockResolvedValue({ ok: true, user: { id: 'u1', email: 'a@b.com' } }),
    signOut: vi.fn().mockResolvedValue({ ok: true }),
  },
  sessions: {
    get: vi.fn(),
  },
  users: {
    me: vi.fn(),
  },
}));

vi.mock('@slyxup/core', () => ({
  SlyxupClient: class {
    auth = mockClient.auth;
    sessions = mockClient.sessions;
    users = mockClient.users;
    publishableKey: string | undefined;
    apiUrl: string;
    constructor(opts: { publishableKey?: string; apiUrl?: string }) {
      this.publishableKey = opts.publishableKey;
      this.apiUrl = opts.apiUrl ?? '';
    }
  },
}));

import { SlyxUpProvider } from '../src/provider/SlyxUpProvider';
import { useAuth } from '../src/hooks/useAuth';
import { useUser } from '../src/hooks/useUser';
import { useSession } from '../src/hooks/useSession';

function createWrapper(sessionResponse?: unknown) {
  if (sessionResponse !== undefined) {
    mockClient.sessions.get.mockResolvedValue(sessionResponse);
  } else {
    mockClient.sessions.get.mockRejectedValue(new Error('no session'));
  }
  mockClient.users.me.mockResolvedValue({
    ok: true,
    user: { id: 'u1', email: 'a@b.com', firstName: 'Test', lastName: 'User', projectId: null, emailVerified: true, avatarUrl: null, preferences: null, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <SlyxUpProvider apiUrl="http://localhost">{children}</SlyxUpProvider>;
  };
}

describe('useAuth', () => {
  beforeEach(() => {
    mockClient.sessions.get.mockReset();
    mockClient.users.me.mockReset();
    mockClient.auth.signIn.mockReset().mockResolvedValue({ ok: true, user: { id: 'u1', email: 'a@b.com' } });
    mockClient.auth.signUp.mockReset().mockResolvedValue({ ok: true, user: { id: 'u1', email: 'a@b.com' } });
    mockClient.auth.signOut.mockReset().mockResolvedValue({ ok: true });
  });

  it('should return auth shape', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current).toHaveProperty('signIn');
    expect(result.current).toHaveProperty('signUp');
    expect(result.current).toHaveProperty('signOut');
    expect(result.current).toHaveProperty('client');
  });

  it('should show signed-in state', async () => {
    const session = { ok: true, user: { id: 'u1', email: 'a@b.com' }, session: { id: 's1', expiresAt: '2030' } };
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper(session) });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.isSignedIn).toBe(true);
    expect(result.current.userId).toBe('u1');
  });

  it('should show signed-out state when no session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.userId).toBeNull();
  });
});

describe('useUser', () => {
  beforeEach(() => {
    mockClient.sessions.get.mockReset();
    mockClient.users.me.mockReset();
  });

  it('should return user data when authenticated', async () => {
    const session = { ok: true, user: { id: 'u1', email: 'a@b.com' }, session: { id: 's1', expiresAt: '2030' } };
    mockClient.sessions.get.mockResolvedValue(session);
    mockClient.users.me.mockResolvedValue({
      ok: true,
      user: { id: 'u1', email: 'a@b.com', firstName: 'Test', lastName: 'User', projectId: null, emailVerified: true, avatarUrl: null, preferences: null, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    });
    const { result } = renderHook(() => useUser(), { wrapper: createWrapper(session) });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.isSignedIn).toBe(true);
    expect(result.current.user?.email).toBe('a@b.com');
    expect(result.current.isSignedOut).toBe(false);
  });

  it('should show isSignedOut when not authenticated', async () => {
    const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.isSignedOut).toBe(true);
    expect(result.current.user).toBeNull();
  });
});

describe('useSession', () => {
  beforeEach(() => {
    mockClient.sessions.get.mockReset();
    mockClient.users.me.mockReset();
  });

  it('should return session data when authenticated', async () => {
    const session = { ok: true, user: { id: 'u1', email: 'a@b.com' }, session: { id: 's1', expiresAt: '2030-01-01' } };
    mockClient.sessions.get.mockResolvedValue(session);
    mockClient.users.me.mockResolvedValue({
      ok: true,
      user: { id: 'u1', email: 'a@b.com', firstName: 'Test', lastName: 'User', projectId: null, emailVerified: true, avatarUrl: null, preferences: null, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    });
    const { result } = renderHook(() => useSession(), { wrapper: createWrapper(session) });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.isSignedIn).toBe(true);
    expect(result.current.session?.id).toBe('s1');
    expect(result.current.session?.expiresAt).toBe('2030-01-01');
  });

  it('should return null session when not authenticated', async () => {
    const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.session).toBeNull();
  });
});
