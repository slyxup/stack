/**
 * Typed client for auth.slyxup.online + billing.slyxup.online.
 * Session token (Bearer) is authoritative; cookies are sent too.
 * No mock data anywhere — every function hits the real API.
 */

export const AUTH_URL =
  import.meta.env.VITE_API_URL || 'https://auth.slyxup.online';
export const BILLING_URL =
  import.meta.env.VITE_BILLING_URL || 'https://billing.slyxup.online';

const TOKEN_KEY = 'slyxup_session_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Loose shape of every JSON envelope — narrowed per endpoint below. */
interface ApiBody {
  error?: string;
  [key: string]: unknown;
}

export interface ApiUser {
  id?: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
}

async function request<T>(
  base: string,
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const r = await fetch(`${base}${path}`, {
      credentials: 'include',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...(init?.headers || {}),
      },
    });
    const j = (await r.json().catch(() => ({}))) as ApiBody;
    if (!r.ok)
      return {
        ok: false,
        error: typeof j.error === 'string' ? j.error : `HTTP ${r.status}`,
      };
    return { ok: true, data: j as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const auth = <T>(path: string, init?: RequestInit) =>
  request<T>(AUTH_URL, path, init);

/* ── Auth ── */

export async function signIn(
  email: string,
  password: string
): Promise<ApiResult<{ token: string }>> {
  const r = await auth<{
    sessionToken?: string;
    token?: string;
    data?: { sessionToken?: string };
  }>('/v1/auth/sign-in', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) return r;
  const token =
    r.data.sessionToken || r.data.token || r.data?.data?.sessionToken;
  if (token && token !== 'cookie') localStorage.setItem(TOKEN_KEY, token);
  return { ok: true, data: { token: token || 'cookie' } };
}

export function signOut() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function currentUser(): Promise<ApiResult<{ user: ApiUser }>> {
  return auth('/v1/users');
}

/* ── Projects ── */

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  environment?: string;
  createdAt?: string;
}

export async function listProjects(): Promise<
  ApiResult<{ projects: Project[] }>
> {
  return auth('/v1/projects');
}

export async function createProject(input: {
  name: string;
  slug: string;
  description?: string;
}) {
  return auth<{ project: Project }>('/v1/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteProject(id: string) {
  return auth<{ deleted: string }>(`/v1/projects/${id}`, { method: 'DELETE' });
}

export async function goLiveProject(id: string) {
  return auth<{ environment: string }>(`/v1/projects/${id}/go-live`, {
    method: 'POST',
    body: '{}',
  });
}

export async function listDomains(projectId: string) {
  return auth<{ domains: string[]; environment: string }>(
    `/v1/projects/${projectId}/domains`
  );
}

export async function addDomain(projectId: string, domain: string) {
  return auth<{ domains: string[] }>(`/v1/projects/${projectId}/domains`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'add', domain }),
  });
}

export async function removeDomain(projectId: string, domain: string) {
  return auth<{ domains: string[] }>(`/v1/projects/${projectId}/domains`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'remove', domain }),
  });
}

/* ── Project users ── */

export interface ProjectUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  emailVerified: boolean;
  blocked: boolean;
  createdAt: string;
}

export async function listProjectUsers(
  projectId: string,
  opts?: { q?: string; limit?: number; offset?: number }
): Promise<ApiResult<{ users: ProjectUser[]; total: number }>> {
  const params = new URLSearchParams();
  if (opts?.q) params.set('q', opts.q);
  params.set('limit', String(opts?.limit ?? 20));
  params.set('offset', String(opts?.offset ?? 0));
  return auth(`/v1/projects/${projectId}/users?${params}`);
}

export async function updateProjectUser(
  projectId: string,
  userId: string,
  patch: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: 'user' | 'admin';
    blocked?: boolean;
    blockedReason?: string;
  }
) {
  return auth(`/v1/projects/${projectId}/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function blockProjectUser(
  projectId: string,
  userId: string,
  reason?: string
) {
  return auth(`/v1/projects/${projectId}/users/${userId}/block`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function unblockProjectUser(projectId: string, userId: string) {
  return auth(`/v1/projects/${projectId}/users/${userId}/unblock`, {
    method: 'POST',
    body: '{}',
  });
}

export async function deleteProjectUser(projectId: string, userId: string) {
  return auth(`/v1/projects/${projectId}/users/${userId}`, {
    method: 'DELETE',
  });
}

/* ── API keys ── */

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  environment: string;
  type: string;
  createdAt: string;
}

export async function listKeys(
  projectId: string
): Promise<ApiResult<{ keys: ApiKey[] }>> {
  return auth(`/v1/keys?projectId=${projectId}`);
}

export async function createKey(
  projectId: string,
  input: {
    name: string;
    type: 'publishable' | 'secret';
    environment?: 'test' | 'live';
  }
): Promise<ApiResult<{ id: string; key: string; prefix: string }>> {
  return auth('/v1/keys', {
    method: 'POST',
    body: JSON.stringify({ projectId, environment: 'live', ...input }),
  });
}

export async function revokeKey(keyId: string) {
  return auth(`/v1/keys/${keyId}`, { method: 'DELETE' });
}

/* ── Billing (read-only from this panel) ── */

export interface BillingPlan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  interval: string;
  trialDays: number | null;
  features: string[];
  isPopular: boolean;
}

export async function listBillingPlans(
  projectId: string
): Promise<ApiResult<{ plans: BillingPlan[] }>> {
  try {
    const r = await fetch(
      `${BILLING_URL}/v1/billing/plans?projectId=${projectId}`,
      {
        headers: { ...authHeaders() },
        credentials: 'include',
      }
    );
    const j = (await r.json().catch(() => ({}))) as ApiBody;
    if (!r.ok)
      return {
        ok: false,
        error: typeof j.error === 'string' ? j.error : `HTTP ${r.status}`,
      };
    return {
      ok: true,
      data: { plans: Array.isArray(j.plans) ? (j.plans as BillingPlan[]) : [] },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
