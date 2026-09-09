import { describe, expect, it, vi } from 'vitest';
import app from '../src/routes/checkout';
import { getDb } from '../src/lib/db';

vi.mock('../src/lib/db', () => ({ getDb: vi.fn() }));
vi.mock('../src/lib/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }) }));
vi.mock('../src/middleware/auth', () => ({ requireUser: async (c: { set: (key: string, value: string) => void }, next: () => Promise<void>) => { c.set('userId', 'new-user'); c.set('userEmail', 'user@example.com'); await next(); } }));

describe('checkout ownership', () => {
  it('does not reassign an existing Paddle customer to another user', async () => {
    const get = vi.fn().mockResolvedValueOnce({ id: 'plan', projectId: 'project', isActive: true }).mockResolvedValueOnce(null).mockResolvedValueOnce({ paddleCustomerId: 'ctm_shared' }).mockResolvedValueOnce({ id: 'customer', userId: 'original-user' });
    const query = { select: vi.fn(), from: vi.fn(), where: vi.fn(), get, update: vi.fn(), insert: vi.fn() };
    query.select.mockReturnValue(query); query.from.mockReturnValue(query); query.where.mockReturnValue(query);
    vi.mocked(getDb).mockReturnValue(query as unknown as ReturnType<typeof getDb>);
    const response = await app.request('/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: 'plan' }) }, { PADDLE_API_KEY: 'test-only', KV: {} } as never);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'CUSTOMER_IDENTITY_CONFLICT' });
    expect(query.update).not.toHaveBeenCalled();
    expect(query.insert).not.toHaveBeenCalled();
  });
});
