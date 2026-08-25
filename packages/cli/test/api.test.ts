import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CliApiError, api } from '../src/api.js';
import type { Credentials } from '../src/config.js';

function mockFetch(data: unknown, ok = true, status = 200) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
  global.fetch = fn;
  return fn;
}

const creds: Credentials = { developerId: 'dev1', email: 'a@b.com', apiUrl: 'http://localhost:3000' };

describe('CliApiError', () => {
  it('should store message and status', () => {
    const err = new CliApiError('Not found', 404);
    expect(err.message).toBe('Not found');
    expect(err.status).toBe(404);
  });

  it('should be instanceof Error', () => {
    expect(new CliApiError('err', 500)).toBeInstanceOf(Error);
  });
});

describe('api.register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should POST to /v1/auth/sign-up', async () => {
    const fn = mockFetch({ ok: true });
    const res = await api.register('http://localhost:3000', { email: 'a@b.com', password: 'pass', name: 'Test' });
    expect(fn).toHaveBeenCalledWith(
      'http://localhost:3000/v1/auth/sign-up',
      expect.objectContaining({ method: 'POST' })
    );
    expect(res.ok).toBe(true);
  });
});

describe('api.createProject', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should POST with Bearer auth', async () => {
    const fn = mockFetch({ ok: true, project: { id: 'p1', name: 'test', slug: 'test', description: null } });
    const res = await api.createProject(creds, { name: 'test', slug: 'test' });
    expect(fn).toHaveBeenCalledWith(
      'http://localhost:3000/v1/projects',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer dev1' }),
      })
    );
    expect(res.ok).toBe(true);
  });
});

describe('api.listProjects', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should GET /v1/projects', async () => {
    const fn = mockFetch({ ok: true, projects: [] });
    await api.listProjects(creds);
    expect(fn).toHaveBeenCalledWith(
      'http://localhost:3000/v1/projects',
      expect.objectContaining({ method: 'GET' })
    );
  });
});

describe('api.getProject', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should GET /v1/projects/:id', async () => {
    const fn = mockFetch({ ok: true, project: { id: 'p1', name: 'test', slug: 'test', description: null } });
    await api.getProject(creds, 'p1');
    expect(fn).toHaveBeenCalledWith(
      'http://localhost:3000/v1/projects/p1',
      expect.objectContaining({ method: 'GET' })
    );
  });
});

describe('api.createKey', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should POST to /v1/keys', async () => {
    const fn = mockFetch({ ok: true, id: 'k1', key: 'sk_test_abc', prefix: 'sk_test' });
    const res = await api.createKey(creds, { projectId: 'p1', name: 'test', type: 'secret', environment: 'test' });
    expect(fn).toHaveBeenCalledWith(
      'http://localhost:3000/v1/keys',
      expect.objectContaining({ method: 'POST' })
    );
    expect(res.ok).toBe(true);
  });
});

describe('api.listKeys', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should GET /v1/keys?projectId', async () => {
    const fn = mockFetch({ ok: true, keys: [] });
    await api.listKeys(creds, 'p1');
    expect(fn).toHaveBeenCalledWith(
      'http://localhost:3000/v1/keys?projectId=p1',
      expect.objectContaining({ method: 'GET' })
    );
  });
});

describe('api.revokeKey', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should DELETE /v1/keys/:id', async () => {
    const fn = mockFetch({ ok: true });
    const res = await api.revokeKey(creds, 'k1');
    expect(fn).toHaveBeenCalledWith(
      'http://localhost:3000/v1/keys/k1',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(res.ok).toBe(true);
  });
});

describe('api error handling', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should throw CliApiError with error message', async () => {
    mockFetch({ error: 'Not found' }, false, 404);
    await expect(api.getProject(creds, 'bad')).rejects.toThrow(CliApiError);
  });

  it('should throw CliApiError with generic message when no error field', async () => {
    mockFetch({}, false, 500);
    await expect(api.listProjects(creds)).rejects.toThrow('Request failed (500)');
  });

  it('should throw CliApiError on invalid JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.reject(new Error('not json')),
    });
    await expect(api.listProjects(creds)).rejects.toThrow('Request failed (400)');
  });
});
