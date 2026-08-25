import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockNextResponse } = vi.hoisted(() => ({
  mockNextResponse: {
    next: vi.fn(() => ({ type: 'next' as const })),
    redirect: vi.fn((url: URL) => ({ type: 'redirect' as const, url })),
  },
}));

vi.mock('next/server', () => ({
  NextResponse: mockNextResponse,
}));

import { slyxupMiddleware, SESSION_COOKIE_NAME } from '../src/middleware.js';

function mockRequest(pathname: string, cookieValue?: string) {
  const searchParams = new URLSearchParams();
  return {
    nextUrl: {
      pathname,
      searchParams: {
        set: (key: string, val: string) => searchParams.set(key, val),
      },
      get search() { return searchParams.toString() ? `?${searchParams}` : ''; },
      clone() {
        const sp = new URLSearchParams(searchParams.toString());
        return {
          pathname,
          searchParams: { set: (key: string, val: string) => sp.set(key, val) },
          href: `${pathname}${sp.toString() ? `?${sp}` : ''}`,
        };
      },
    },
    cookies: {
      get: (name: string) => (cookieValue && name === SESSION_COOKIE_NAME ? { value: cookieValue } : undefined),
    },
  };
}

describe('slyxupMiddleware', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('public paths', () => {
    it('should allow / through', async () => {
      const mw = slyxupMiddleware();
      const result = await mw(mockRequest('/') as any);
      expect(result).toEqual({ type: 'next' });
    });

    it('should allow /sign-in through', async () => {
      const mw = slyxupMiddleware();
      const result = await mw(mockRequest('/sign-in') as any);
      expect(result).toEqual({ type: 'next' });
    });

    it('should allow /sign-up through', async () => {
      const mw = slyxupMiddleware();
      const result = await mw(mockRequest('/sign-up') as any);
      expect(result).toEqual({ type: 'next' });
    });

    it('should allow /verify through', async () => {
      const mw = slyxupMiddleware();
      const result = await mw(mockRequest('/verify') as any);
      expect(result).toEqual({ type: 'next' });
    });

    it('should allow /forgot-password through', async () => {
      const mw = slyxupMiddleware();
      const result = await mw(mockRequest('/forgot-password') as any);
      expect(result).toEqual({ type: 'next' });
    });

    it('should allow /api/auth/* through', async () => {
      const mw = slyxupMiddleware();
      const result = await mw(mockRequest('/api/auth/callback') as any);
      expect(result).toEqual({ type: 'next' });
    });
  });

  describe('protected paths without token', () => {
    it('should redirect to /sign-in with redirect_url', async () => {
      const mw = slyxupMiddleware();
      await mw(mockRequest('/dashboard') as any);
      expect(mockNextResponse.redirect).toHaveBeenCalled();
    });
  });

  describe('protected paths with valid token', () => {
    it('should allow through', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      const mw = slyxupMiddleware();
      const result = await mw(mockRequest('/dashboard', 'valid-token') as any);
      expect(result).toEqual({ type: 'next' });
    });
  });

  describe('protected paths with invalid token', () => {
    it('should redirect when fetch returns non-ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });
      const mw = slyxupMiddleware();
      await mw(mockRequest('/dashboard', 'bad-token') as any);
      expect(mockNextResponse.redirect).toHaveBeenCalled();
    });

    it('should redirect on fetch error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('fail'));
      const mw = slyxupMiddleware();
      await mw(mockRequest('/dashboard', 'tok') as any);
      expect(mockNextResponse.redirect).toHaveBeenCalled();
    });
  });

  describe('custom options', () => {
    it('should respect custom signInUrl', async () => {
      const mw = slyxupMiddleware({ signInUrl: '/login' });
      await mw(mockRequest('/dashboard') as any);
      expect(mockNextResponse.redirect).toHaveBeenCalled();
    });

    it('should respect custom publicPaths', async () => {
      const mw = slyxupMiddleware({ publicPaths: ['/settings'] });
      const result = await mw(mockRequest('/settings') as any);
      expect(result).toEqual({ type: 'next' });
    });
  });
});
