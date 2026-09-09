import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireSession } from '../src/middleware/auth';
import { getSession } from '../src/services/auth.service';
import { verifyApiKey } from '../src/services/project.service';

vi.mock('../src/services/auth.service', () => ({ getSession: vi.fn() }));
vi.mock('../src/services/project.service', () => ({ verifyApiKey: vi.fn() }));

describe('session project boundary', () => {
  const app = new Hono().use('*', requireSession).get('/', (c) => c.json({ ok: true }));
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'user-a' }, session: { projectId: 'project-a' } } as Awaited<ReturnType<typeof getSession>>);
    vi.mocked(verifyApiKey).mockResolvedValue({ projectId: 'project-a', type: 'publishable', environment: 'test' });
  });
  it('rejects a missing session without querying storage', async () => {
    expect((await app.request('/')).status).toBe(401);
    expect(getSession).not.toHaveBeenCalled();
  });
  it('accepts a session belonging to the supplied key', async () => {
    expect((await app.request('/', { headers: { Authorization: 'Bearer session', 'X-Publishable-Key': 'pk_a' } })).status).toBe(200);
  });
  it('rejects a session from a different project', async () => {
    vi.mocked(verifyApiKey).mockResolvedValue({ projectId: 'project-b', type: 'publishable', environment: 'test' });
    expect((await app.request('/', { headers: { Authorization: 'Bearer session', 'X-Publishable-Key': 'pk_b' } })).status).toBe(403);
  });
  it('rejects a revoked key even with an otherwise valid session', async () => {
    vi.mocked(verifyApiKey).mockResolvedValue(null);
    expect((await app.request('/', { headers: { Authorization: 'Bearer session', 'X-Publishable-Key': 'revoked' } })).status).toBe(403);
  });
});
