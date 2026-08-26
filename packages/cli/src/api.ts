import { type Credentials, bearerOf } from './config.js';

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  environment: 'test' | 'live';
  type: 'publishable' | 'secret';
}

export class CliApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function req<T>(
  creds: Credentials,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${creds.apiUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerOf(creds)}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new CliApiError(
      typeof data.error === 'string'
        ? data.error
        : `Request failed (${res.status})`,
      res.status
    );
  }
  return data as T;
}

export const api = {
  register: (
    apiUrl: string,
    input: { email: string; password: string; name?: string }
  ) =>
    fetch(`${apiUrl}/v1/auth/sign-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  createProject: (
    c: Credentials,
    input: { name: string; slug: string; description?: string }
  ) => req<{ ok: true; project: Project }>(c, 'POST', '/v1/projects', input),
  listProjects: (c: Credentials) =>
    req<{ ok: true; projects: Project[] }>(c, 'GET', '/v1/projects'),
  getProject: (c: Credentials, id: string) =>
    req<{ ok: true; project: Project }>(c, 'GET', `/v1/projects/${id}`),
  createKey: (
    c: Credentials,
    input: {
      projectId: string;
      name: string;
      type: 'publishable' | 'secret';
      environment: 'test' | 'live';
    }
  ) =>
    req<{ ok: true; id: string; key: string; prefix: string }>(
      c,
      'POST',
      '/v1/keys',
      input
    ),
  listKeys: (c: Credentials, projectId: string) =>
    req<{ ok: true; keys: ApiKey[] }>(
      c,
      'GET',
      `/v1/keys?projectId=${projectId}`
    ),
  revokeKey: (c: Credentials, id: string) =>
    req<{ ok: true }>(c, 'DELETE', `/v1/keys/${id}`),
  getDomains: (c: Credentials, projectId: string) =>
    req<{ ok: true; environment: string; domains: string[] }>(
      c,
      'GET',
      `/v1/projects/${projectId}/domains`
    ),
  addDomain: (c: Credentials, projectId: string, domain: string) =>
    req<{ ok: true; domains: string[] }>(
      c,
      'PATCH',
      `/v1/projects/${projectId}/domains`,
      { action: 'add', domain }
    ),
  removeDomain: (c: Credentials, projectId: string, domain: string) =>
    req<{ ok: true; domains: string[] }>(
      c,
      'PATCH',
      `/v1/projects/${projectId}/domains`,
      { action: 'remove', domain }
    ),
  goLive: (c: Credentials, projectId: string) =>
    req<{ ok: true; environment: string }>(
      c,
      'POST',
      `/v1/projects/${projectId}/go-live`
    ),
};
