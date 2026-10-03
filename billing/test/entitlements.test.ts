import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/routes/entitlements';
import { getDb } from '../src/lib/db';

vi.mock('../src/middleware/auth', () => ({ requireUser: async (c: { set: (key: string, value: string) => void }, next: () => Promise<void>) => { c.set('userId', 'user'); await next(); } }));
vi.mock('../src/lib/db', () => ({ getDb: vi.fn() }));

describe('entitlements endpoint', () => {
  const get = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    const query = { select: vi.fn(), from: vi.fn(), where: vi.fn(), orderBy: vi.fn(), limit: vi.fn(), get };
    for (const method of [query.select, query.from, query.where, query.orderBy, query.limit]) method.mockReturnValue(query);
    vi.mocked(getDb).mockReturnValue(query as unknown as ReturnType<typeof getDb>);
  });
  it('requires an explicit project', async () => {
    expect((await app.request('/')).status).toBe(400);
    expect(getDb).not.toHaveBeenCalled();
  });
  it.each(['active', 'trialing'])('grants %s subscriptions within the billing period', async (status) => {
    get.mockResolvedValueOnce({ status, planId: 'plan', currentPeriodEnd: new Date(Date.now() + 60000) }).mockResolvedValueOnce({ id: 'plan', features: ['export'] });
    const response = await app.request('/?projectId=project');
    expect(await response.json()).toMatchObject({ features: ['export'], status });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it.each(['past_due', 'paused', 'canceled'])('denies %s subscriptions', async (status) => {
    get.mockResolvedValueOnce({ status, planId: 'plan', currentPeriodEnd: new Date(Date.now() + 60000) }).mockResolvedValueOnce({ id: 'plan', features: ['export'] });
    expect(await (await app.request('/?projectId=project')).json()).toMatchObject({ features: [], status });
  });
  it.each([null, new Date(0)])('denies missing or expired periods (%s)', async (currentPeriodEnd) => {
    get.mockResolvedValueOnce({ status: 'active', planId: 'plan', currentPeriodEnd }).mockResolvedValueOnce({ id: 'plan', features: ['export'] });
    expect(await (await app.request('/?projectId=project')).json()).toMatchObject({ features: [] });
  });
});
