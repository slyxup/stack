import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/routes/refunds';
import { getDb } from '../src/lib/db';
import { checkRateLimit } from '../src/lib/rate-limit';

vi.mock('../src/lib/db', () => ({ getDb: vi.fn() }));
vi.mock('../src/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));
vi.mock('../src/middleware/auth', () => ({
  requireUser: async (
    c: { set: (key: string, value: string) => void },
    next: () => Promise<void>
  ) => {
    c.set('userId', 'user-1');
    c.set('userEmail', 'user@example.com');
    await next();
  },
  requireAdmin: async (
    c: { set: (key: string, value: string) => void },
    next: () => Promise<void>
  ) => {
    c.set('userId', 'admin-1');
    await next();
  },
}));

function mockDb(overrides: Record<string, unknown> = {}) {
  const get = vi.fn();
  const all = vi.fn();
  const query = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    insert: vi.fn(),
    values: vi.fn(),
    returning: vi.fn(),
    update: vi.fn(),
    set: vi.fn(),
    get,
    all,
    ...overrides,
  };
  for (const m of [
    'select',
    'from',
    'where',
    'orderBy',
    'limit',
    'offset',
    'insert',
    'values',
    'returning',
    'update',
    'set',
  ] as const) {
    (query[m] as ReturnType<typeof vi.fn>).mockReturnValue(query);
  }
  vi.mocked(getDb).mockReturnValue(query as unknown as ReturnType<typeof getDb>);
  return { get, all };
}

const paidInvoice = (billedAt: Date) => ({
  id: 'inv-1',
  userId: 'user-1',
  projectId: 'project',
  paddleTransactionId: 'txn_123',
  amount: 999,
  currency: 'USD',
  status: 'paid',
  billedAt,
});

describe('POST /v1/billing/refunds', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetIn: 600,
    });
  });

  it('rejects invoices owned by another user (404, no oracle)', async () => {
    const { get } = mockDb();
    get.mockResolvedValueOnce(null);
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: 'inv-x', reason: 'charged twice by mistake here' }),
    }, { KV: {} } as never);
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ ok: false });
  });

  it('rejects unpaid invoices', async () => {
    const { get, all } = mockDb();
    get.mockResolvedValueOnce({ ...paidInvoice(new Date()), status: 'pending' });
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: 'inv-1', reason: 'charged twice by mistake here' }),
    }, { KV: {} } as never);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: 'Only paid invoices can be refunded',
    });
    expect(all).not.toHaveBeenCalled();
  });

  it('rejects charges older than the 7-day window', async () => {
    const { get } = mockDb();
    get.mockResolvedValueOnce(
      paidInvoice(new Date(Date.now() - 10 * 86_400_000))
    );
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: 'inv-1', reason: 'charged twice by mistake here' }),
    }, { KV: {} } as never);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/within 7 days/);
  });

  it('rejects duplicate pending requests for the same invoice', async () => {
    const { get, all } = mockDb();
    get.mockResolvedValueOnce(paidInvoice(new Date()));
    all.mockResolvedValueOnce([{ id: 'r1', status: 'pending' }]);
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: 'inv-1', reason: 'charged twice by mistake here' }),
    }, { KV: {} } as never);
    expect(res.status).toBe(409);
  });

  it('enforces the rolling 90-day request cap', async () => {
    const { get, all } = mockDb();
    get.mockResolvedValueOnce(paidInvoice(new Date()));
    all
      .mockResolvedValueOnce([]) // no existing request for invoice
      .mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]); // 2 in window
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: 'inv-1', reason: 'charged twice by mistake here' }),
    }, { KV: {} } as never);
    expect(res.status).toBe(429);
  });

  it('accepts a valid request and returns the review ETA', async () => {
    const { get, all } = mockDb();
    get.mockResolvedValueOnce(paidInvoice(new Date()));
    all.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    get.mockResolvedValueOnce({
      id: 'r-new',
      userId: 'user-1',
      projectId: 'project',
      invoiceId: 'inv-1',
      amount: 999,
      currency: 'USD',
      reason: 'charged twice by mistake here',
      status: 'pending',
      adminNote: null,
      decidedBy: null,
      requestedAt: new Date(),
      decidedAt: null,
      refundedAt: null,
    });
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: 'inv-1', reason: 'charged twice by mistake here' }),
    }, { KV: {} } as never);
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      ok: true,
      reviewEta: 'within 5 business days',
    });
  });

  it('requires a meaningful reason', async () => {
    mockDb();
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: 'inv-1', reason: 'short' }),
    }, { KV: {} } as never);
    expect(res.status).toBe(400);
  });
});
