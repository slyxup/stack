import { afterEach, describe, expect, it, vi } from 'vitest';
import { BillingClient } from '../src/billing';
import { NetworkError, RateLimitError } from '../src/errors';

afterEach(() => vi.unstubAllGlobals());
describe('billing integration', () => {
  it('uses the current explicit session and keeps the configured URL', async () => {
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ subscriptions: [] })));
    vi.stubGlobal('fetch', fetcher);
    let token: string | undefined = 'a';
    const client = new BillingClient({ apiUrl: 'http://localhost:8787', getToken: () => token });
    expect(await client.getSubscription()).toBeNull();
    expect(new Headers(fetcher.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer a');
    token = undefined;
    await client.listSubscriptions();
    expect(new Headers(fetcher.mock.calls[1][1].headers).has('Authorization')).toBe(false);
    expect(client.apiUrl).toBe('http://localhost:8787');
  });
  it('encodes project identifiers as a single query value', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ plans: [] }));
    vi.stubGlobal('fetch', fetcher);
    await new BillingClient().listPlans('a&projectId=b');
    expect(new URL(fetcher.mock.calls[0][0]).searchParams.getAll('projectId')).toEqual(['a&projectId=b']);
  });
  it('exposes typed rate limits and network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Slow down' }, { status: 429 })));
    await expect(new BillingClient().listInvoices()).rejects.toBeInstanceOf(RateLimitError);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(new BillingClient().listInvoices()).rejects.toBeInstanceOf(NetworkError);
  });
});
