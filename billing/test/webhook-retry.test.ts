import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/routes/webhooks';
import { getDb } from '../src/lib/db';

vi.mock('../src/lib/db', () => ({ getDb: vi.fn() }));
vi.mock('../src/services/paddle.service', () => ({ verifyWebhookSignature: vi.fn().mockResolvedValue(null) }));

describe('webhook delivery retry', () => {
  const get = vi.fn();
  const values = vi.fn();
  const set = vi.fn();
  const returning = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    returning.mockResolvedValue([]);
    const query = { select: vi.fn(), from: vi.fn(), where: vi.fn(), insert: vi.fn(), update: vi.fn(), get, values, set, returning };
    for (const method of [query.select, query.from, query.where, query.insert, query.update, set]) method.mockReturnValue(query);
    vi.mocked(getDb).mockReturnValue(query as unknown as ReturnType<typeof getDb>);
  });
  const request = () => app.request('/paddle', { method: 'POST', body: JSON.stringify({ event_id: 'evt_retry', event_type: 'subscription.updated', occurred_at: '2026-09-09T00:00:00Z', data: { id: 'sub_1', items: [{ price: { id: 'pri_1' } }] } }) }, { PADDLE_WEBHOOK_SECRET: 'test', PADDLE_API_KEY: 'test' } as never);
  it('marks processing errors failed so the next delivery can retry', async () => {
    values.mockResolvedValue(undefined);
    get.mockRejectedValueOnce(new Error('temporary DB failure'));
    const response = await request();
    expect(response.status).toBe(500);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', processedAt: null }));
  });
  it('does not acknowledge a pending duplicate as completed', async () => {
    values.mockRejectedValue(new Error('UNIQUE constraint failed'));
    get.mockResolvedValueOnce({ status: 'pending' });
    expect((await request()).status).toBe(503);
  });
  it('acknowledges a completed duplicate without processing again', async () => {
    values.mockRejectedValue(new Error('UNIQUE constraint failed'));
    get.mockResolvedValueOnce({ status: 'completed' });
    const response = await request();
    expect(response.status).toBe(200);
    expect(set).not.toHaveBeenCalled();
  });
});
