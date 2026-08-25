import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

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
    update: vi.fn(),
    delete: vi.fn(),
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
import { useAuthContext } from '../src/context/auth-context';

function TestChild() {
  const ctx = useAuthContext();
  return (
    <div>
      <span data-testid="isLoaded">{String(ctx.isLoaded)}</span>
      <span data-testid="isSignedIn">{String(ctx.isSignedIn)}</span>
      <span data-testid="userId">{ctx.userId ?? 'null'}</span>
    </div>
  );
}

describe('SlyxUpProvider', () => {
  beforeEach(() => {
    mockClient.sessions.get.mockReset();
    mockClient.users.me.mockReset();
    mockClient.auth.signIn.mockReset().mockResolvedValue({ ok: true, user: { id: 'u1', email: 'a@b.com' } });
    mockClient.auth.signUp.mockReset().mockResolvedValue({ ok: true, user: { id: 'u1', email: 'a@b.com' } });
    mockClient.auth.signOut.mockReset().mockResolvedValue({ ok: true });
  });

  it('should render children', async () => {
    mockClient.sessions.get.mockResolvedValue({ ok: true, user: { id: 'u1', email: 'a@b.com' }, session: { id: 's1', expiresAt: '2030' } });
    mockClient.users.me.mockResolvedValue({ ok: true, user: { id: 'u1', email: 'a@b.com', firstName: null, lastName: null, avatarUrl: null, projectId: null, emailVerified: false, preferences: null, createdAt: '', updatedAt: '' } });
    await act(async () => {
      render(
        <SlyxUpProvider apiUrl="http://localhost">
          <div data-testid="child">Hello</div>
        </SlyxUpProvider>
      );
    });
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('should show loading state before session resolves', () => {
    mockClient.sessions.get.mockReturnValue(new Promise(() => {}));
    render(
      <SlyxUpProvider apiUrl="http://localhost">
        <TestChild />
      </SlyxUpProvider>
    );
    expect(screen.getByTestId('isLoaded').textContent).toBe('false');
  });

  it('should show authenticated state after session resolves', async () => {
    mockClient.sessions.get.mockResolvedValue({ ok: true, user: { id: 'u1', email: 'a@b.com' }, session: { id: 's1', expiresAt: '2030' } });
    mockClient.users.me.mockResolvedValue({ ok: true, user: { id: 'u1', email: 'a@b.com', firstName: null, lastName: null, avatarUrl: null, projectId: null, emailVerified: false, preferences: null, createdAt: '', updatedAt: '' } });
    render(
      <SlyxUpProvider apiUrl="http://localhost">
        <TestChild />
      </SlyxUpProvider>
    );
    await act(async () => {});
    expect(screen.getByTestId('isLoaded').textContent).toBe('true');
    expect(screen.getByTestId('isSignedIn').textContent).toBe('true');
    expect(screen.getByTestId('userId').textContent).toBe('u1');
  });

  it('should show unauthenticated when session fetch fails', async () => {
    mockClient.sessions.get.mockRejectedValue(new Error('unauthorized'));
    render(
      <SlyxUpProvider apiUrl="http://localhost">
        <TestChild />
      </SlyxUpProvider>
    );
    await act(async () => {});
    expect(screen.getByTestId('isLoaded').textContent).toBe('true');
    expect(screen.getByTestId('isSignedIn').textContent).toBe('false');
  });
});
