import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetPassword } from '../src/services/token.service';
import { getDb } from '../src/lib/db';

vi.mock('../src/lib/db', () => ({ getDb: vi.fn() }));
vi.mock('../src/lib/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  CURRENT_HASH_VERSION: 'pbkdf2-600k',
}));

describe('password reset single use', () => {
  const returning = vi.fn();
  const batch = vi.fn();
  const remove = vi.fn();
  const get = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    get.mockResolvedValue({ id: 'reset', userId: 'user', email: 'ada@example.com', used: false, expiresAt: new Date(Date.now() + 60000) });
    const query = { select: vi.fn(), from: vi.fn(), where: vi.fn(), get, update: vi.fn(), set: vi.fn(), returning, delete: remove, batch };
    for (const method of [query.select, query.from, query.where, query.update, query.set, remove]) method.mockReturnValue(query);
    vi.mocked(getDb).mockReturnValue(query as unknown as ReturnType<typeof getDb>);
  });
  it('rejects a token already claimed by another request', async () => {
    returning.mockResolvedValue([]);
    get
      .mockResolvedValueOnce({
        id: 'reset',
        userId: 'user',
        email: 'ada@example.com',
        used: false,
        expiresAt: new Date(Date.now() + 60000),
      })
      .mockResolvedValueOnce({ passwordHash: 'existing-password' });
    await expect(resetPassword({ DB: {} } as never, 'token', 'new-password')).rejects.toThrow('Invalid or used token');
    expect(batch).not.toHaveBeenCalled();
  });
  it('updates credentials and revokes sessions together after claiming', async () => {
    returning.mockResolvedValue([{ id: 'reset' }]);
    get.mockResolvedValueOnce({ id: 'reset', userId: 'user', email: 'ada@example.com', used: false, expiresAt: new Date(Date.now() + 60000) }).mockResolvedValueOnce({ passwordHash: 'existing-password' });
    await expect(resetPassword({ DB: {} } as never, 'token', 'new-password')).resolves.toEqual({ email: 'ada@example.com' });
    expect(remove).toHaveBeenCalledOnce();
    expect(batch).toHaveBeenCalledWith(expect.arrayContaining([expect.anything(), expect.anything()]));
  });

  it('rejects password reset for an OAuth-only account', async () => {
    returning.mockResolvedValue([{ id: 'reset' }]);
    get.mockResolvedValueOnce({ id: 'reset', userId: 'oauth-user', email: 'oauth@example.com', used: false, expiresAt: new Date(Date.now() + 60000) }).mockResolvedValueOnce({ passwordHash: null });
    await expect(resetPassword({ DB: {} } as never, 'token', 'new-password')).rejects.toThrow('Password reset is not available');
    expect(batch).not.toHaveBeenCalled();
  });
});
