import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCookieStore = {
  get: vi.fn((name: string) => {
    if (name === 'slyxup_session') return { value: 'test-token-123' };
    return undefined;
  }),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}));

import { auth, currentUser, requireUser, getSessionToken, SESSION_COOKIE_NAME } from '../src/server/auth.js';

describe('SESSION_COOKIE_NAME', () => {
  it('equals slyxup_session', () => {
    expect(SESSION_COOKIE_NAME).toBe('slyxup_session');
  });
});

describe('getSessionToken', () => {
  it('should return token from cookie', async () => {
    const token = await getSessionToken();
    expect(token).toBe('test-token-123');
  });

  it('should return undefined when no cookie', async () => {
    mockCookieStore.get.mockReturnValueOnce(undefined);
    const token = await getSessionToken();
    expect(token).toBeUndefined();
  });
});

describe('auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === 'slyxup_session') return { value: 'test-token-123' };
      return undefined;
    });
  });

  it('should return session and user on valid token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        user: { id: 'u1', email: 'a@b.com' },
        session: { id: 's1', expiresAt: '2030-01-01' },
      }),
    });
    const result = await auth();
    expect(result).toEqual({
      session: { id: 's1', expiresAt: '2030-01-01' },
      user: { id: 'u1', email: 'a@b.com' },
    });
  });

  it('should return null when no cookie token', async () => {
    mockCookieStore.get.mockReturnValueOnce(undefined);
    const result = await auth();
    expect(result).toBeNull();
  });

  it('should return null when fetch returns non-ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const result = await auth();
    expect(result).toBeNull();
  });

  it('should return null when response lacks user', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session: { id: 's1', expiresAt: '2030' } }),
    });
    const result = await auth();
    expect(result).toBeNull();
  });

  it('should return null on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('fail'));
    const result = await auth();
    expect(result).toBeNull();
  });
});

describe('currentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === 'slyxup_session') return { value: 'test-token-123' };
      return undefined;
    });
  });

  it('should return full user when authenticated', async () => {
    const user = { id: 'u1', email: 'a@b.com', firstName: 'Test', lastName: 'User' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user }),
    });
    const result = await currentUser();
    expect(result).toEqual(user);
  });

  it('should return null when no token', async () => {
    mockCookieStore.get.mockReturnValueOnce(undefined);
    const result = await currentUser();
    expect(result).toBeNull();
  });

  it('should return null on fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('fail'));
    const result = await currentUser();
    expect(result).toBeNull();
  });
});

describe('requireUser', () => {
  it('should return user when authenticated', async () => {
    const user = { id: 'u1', email: 'a@b.com' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user }),
    });
    const result = await requireUser();
    expect(result).toEqual(user);
  });

  it('should throw when not authenticated', async () => {
    mockCookieStore.get.mockReturnValueOnce(undefined);
    await expect(requireUser()).rejects.toThrow('Unauthorized: no SlyxUp session');
  });
});
