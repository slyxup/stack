// Merged from @slyxup/cli api.ts — same project/keys/domains ops, now callable from web UI.
// This replaces the CLI: web dashboard calls these directly. Old `slyxup` CLI re-exports this.

export interface ManagedProject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface ManagedKey {
  id: string;
  name: string;
  prefix: string;
  environment: 'test' | 'live';
  type: 'publishable' | 'secret';
}

async function req<T>(
  apiUrl: string,
  token: string,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok)
    throw new Error(
      typeof data.error === 'string'
        ? data.error
        : `Request failed (${res.status})`
    );
  return data as T;
}

export function manageApi(apiUrl: string, token: string) {
  const base = apiUrl.replace(/\/$/, '');
  return {
    listProjects: () =>
      req<{ ok: true; projects: ManagedProject[] }>(
        base,
        token,
        'GET',
        '/v1/projects'
      ),
    createProject: (input: {
      name: string;
      slug: string;
      description?: string;
    }) =>
      req<{ ok: true; project: ManagedProject }>(
        base,
        token,
        'POST',
        '/v1/projects',
        input
      ),
    deleteProject: (id: string) =>
      req<{ ok: true }>(base, token, 'DELETE', `/v1/projects/${id}`),
    listKeys: (projectId: string) =>
      req<{ ok: true; keys: ManagedKey[] }>(
        base,
        token,
        'GET',
        `/v1/keys?projectId=${projectId}`
      ),
    createKey: (input: {
      projectId: string;
      name: string;
      type: 'publishable' | 'secret';
      environment: 'test' | 'live';
    }) =>
      req<{ ok: true; id: string; key: string; prefix: string }>(
        base,
        token,
        'POST',
        '/v1/keys',
        input
      ),
    revokeKey: (id: string) =>
      req<{ ok: true }>(base, token, 'DELETE', `/v1/keys/${id}`),
    listDomains: (projectId: string) =>
      req<{ ok: true; environment: string; domains: string[] }>(
        base,
        token,
        'GET',
        `/v1/projects/${projectId}/domains`
      ),
    addDomain: (projectId: string, domain: string) =>
      req<{ ok: true; domains: string[] }>(
        base,
        token,
        'PATCH',
        `/v1/projects/${projectId}/domains`,
        { action: 'add', domain }
      ),
    removeDomain: (projectId: string, domain: string) =>
      req<{ ok: true; domains: string[] }>(
        base,
        token,
        'PATCH',
        `/v1/projects/${projectId}/domains`,
        { action: 'remove', domain }
      ),
    goLive: (projectId: string) =>
      req<{ ok: true; environment: string }>(
        base,
        token,
        'POST',
        `/v1/projects/${projectId}/go-live`
      ),
    doctor: async () => {
      try {
        const r = await fetch(`${base}/v1/health`);
        return { ok: r.ok, apiUrl: base };
      } catch {
        return { ok: false, apiUrl: base };
      }
    },
  };
}
