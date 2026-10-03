import { describe, expect, it } from 'vitest';
import {
  RATE_LIMITS,
  checkEndpointRateLimit,
  resolveEndpoint,
} from '../src/lib/rate-limit';

const memKV = () => {
  const store = new Map<string, string>();
  return {
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => {
      store.set(k, v);
    },
  } as unknown as KVNamespace;
};

describe('per-endpoint rate limiting (Week 1 Day 3)', () => {
  it('maps auth paths to strict budgets', () => {
    expect(resolveEndpoint('POST', '/v1/auth/sign-in')).toBe('auth:sign-in');
    expect(resolveEndpoint('POST', '/v1/auth/sign-up')).toBe('auth:sign-up');
    expect(resolveEndpoint('POST', '/v1/auth/sign-in/2fa')).toBe('auth:2fa-complete');
    expect(resolveEndpoint('POST', '/v1/oauth/exchange')).toBe('auth:oauth-exchange');
    expect(resolveEndpoint('GET', '/v1/session')).toBe('session:list');
    expect(resolveEndpoint('POST', '/v1/projects')).toBe('project:create');
    expect(resolveEndpoint('GET', '/v1/admin/users')).toBe('admin:read');
    expect(resolveEndpoint('GET', '/v1/unknown-thing')).toBe('default');
  });

  it('login budget is strict (5/min) while reads are generous', () => {
    expect(RATE_LIMITS['auth:sign-in']).toEqual({ requests: 5, window: 60 });
    expect(RATE_LIMITS['auth:sign-up']).toEqual({ requests: 3, window: 300 });
    expect(RATE_LIMITS['admin:read'].requests).toBeGreaterThan(
      RATE_LIMITS['auth:sign-in'].requests
    );
  });

  it('blocks the 6th sign-in attempt in a window', async () => {
    const kv = memKV();
    for (let i = 0; i < 5; i++) {
      const r = await checkEndpointRateLimit(kv, 'auth:sign-in', '1.2.3.4');
      expect(r.allowed).toBe(true);
    }
    const blocked = await checkEndpointRateLimit(kv, 'auth:sign-in', '1.2.3.4');
    expect(blocked.allowed).toBe(false);
    expect(blocked.resetIn).toBeGreaterThan(0);
  });

  it('isolates buckets per endpoint and per IP', async () => {
    const kv = memKV();
    for (let i = 0; i < 5; i++) {
      await checkEndpointRateLimit(kv, 'auth:sign-in', '9.9.9.9');
    }
    // Same IP, different endpoint → unaffected.
    const other = await checkEndpointRateLimit(kv, 'session:list', '9.9.9.9');
    expect(other.allowed).toBe(true);
    // Different IP, same endpoint → unaffected.
    const otherIp = await checkEndpointRateLimit(kv, 'auth:sign-in', '8.8.8.8');
    expect(otherIp.allowed).toBe(true);
  });

  it('error shape matches the 429 contract', async () => {
    const kv = memKV();
    for (let i = 0; i < 3; i++) {
      await checkEndpointRateLimit(kv, 'auth:sign-up', '5.5.5.5');
    }
    const r = await checkEndpointRateLimit(kv, 'auth:sign-up', '5.5.5.5');
    expect(r.allowed).toBe(false);
    expect(r.endpoint).toBe('auth:sign-up');
  });
});
