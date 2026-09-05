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
  return auth('/v1/user');
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

/* ── Sessions (project-level) ── */

export interface SessionInfo {
  id: string;
  userId: string;
  projectId: string;
  token?: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
  lastSeenAt: string | null;
}

export async function listProjectUserSessions(
  projectId: string,
  userId: string
): Promise<ApiResult<{ sessions: SessionInfo[] }>> {
  return auth(`/v1/projects/${projectId}/users/${userId}/sessions`);
}

export async function revokeProjectUserSession(
  projectId: string,
  userId: string,
  sessionId: string
) {
  return auth(
    `/v1/projects/${projectId}/users/${userId}/sessions/${sessionId}`,
    {
      method: 'DELETE',
    }
  );
}

export async function revokeAllProjectUserSessions(
  projectId: string,
  userId: string
) {
  return auth(`/v1/projects/${projectId}/users/${userId}/sessions`, {
    method: 'DELETE',
  });
}

/* ── Audit logs ── */

export interface AuditLog {
  id: string;
  action: string;
  actorId: string;
  actorEmail?: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

export async function listAuditLogs(
  projectId: string,
  opts?: { limit?: number; offset?: number; action?: string }
): Promise<ApiResult<{ logs: AuditLog[]; total: number }>> {
  const params = new URLSearchParams();
  params.set('limit', String(opts?.limit ?? 50));
  params.set('offset', String(opts?.offset ?? 0));
  if (opts?.action) params.set('action', opts.action);
  return auth(`/v1/projects/${projectId}/audit?${params}`);
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

/* ── Billing ── */

export interface BillingPlan {
  id: string;
  name: string;
  paddlePriceId?: string;
  amount: number;
  currency: string;
  interval: string;
  trialDays: number | null;
  features: string[];
  isPopular: boolean;
  isActive?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanInput {
  name: string;
  amount: number;
  currency?: string;
  interval?: 'month' | 'year';
  trialDays?: number;
  features?: string[];
  isPopular?: boolean;
  isActive?: boolean;
  paddlePriceId?: string;
  sortOrder?: number;
}

export interface Subscription {
  id: string;
  projectId: string;
  userId: string;
  planId: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  invoiceNumber: string | null;
  billedAt: string | null;
}

async function billing<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const r = await fetch(`${BILLING_URL}${path}`, {
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

export async function listBillingPlans(
  projectId: string
): Promise<ApiResult<{ plans: BillingPlan[] }>> {
  const r = await billing<{ plans?: unknown }>(
    `/v1/billing/plans?projectId=${projectId}`
  );
  if (!r.ok) return r;
  return {
    ok: true,
    data: {
      plans: Array.isArray(r.data.plans) ? (r.data.plans as BillingPlan[]) : [],
    },
  };
}

/** My subscription for a project (session user). Null when none. */
export async function getSubscription(
  projectId: string
): Promise<ApiResult<{ subscription: Subscription | null }>> {
  return billing(`/v1/billing/subscription?projectId=${projectId}`);
}

/** Schedule cancellation at period end (Paddle-backed). */
export async function cancelSubscription(projectId: string) {
  return billing<{ ok: boolean }>(
    `/v1/billing/subscription/cancel?projectId=${projectId}`,
    { method: 'POST', body: '{}' }
  );
}

/** Undo a scheduled cancellation. */
export async function resumeSubscription(projectId: string) {
  return billing<{ ok: boolean }>(
    `/v1/billing/subscription/resume?projectId=${projectId}`,
    { method: 'POST', body: '{}' }
  );
}

/** Start a Paddle checkout — returns the transaction id (overlay) + hosted URL (fallback). */
export async function startCheckout(
  planId: string,
  projectId?: string,
  origin?: string
): Promise<ApiResult<{ transactionId?: string; checkoutUrl: string }>> {
  // Use billing domain for Paddle success redirect (approved in Paddle dashboard),
  // forwarding the origin so the success page can send the user back.
  const params = new URLSearchParams();
  if (projectId) params.set('project_id', projectId);
  if (origin) params.set('origin', origin);
  const q = params.toString();
  const successUrl = `https://billing.slyxup.online/${q ? `?${q}` : ''}`;
  return billing('/v1/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({
      planId,
      successUrl,
      origin: origin || undefined,
    }),
  });
}

/** Paddle.js overlay config (client token — safe to expose). */
export async function getBillingConfig(): Promise<
  ApiResult<{ environment: string; clientToken: string }>
> {
  return billing('/v1/billing/config');
}

/** Verify a checkout transaction with Paddle (public, capability-token auth).
 *  NEVER trust a bare ?transaction_id= URL — always consult this first. */
export async function getTransactionStatus(transactionId: string): Promise<
  ApiResult<{
    id: string;
    status: string;
    paid: boolean;
    checkoutUrl: string | null;
  }>
> {
  return billing(
    `/v1/billing/transactions/${encodeURIComponent(transactionId)}`
  );
}

/** Admin: list all plans for a project (incl. inactive). */
export async function listAdminPlans(
  projectId: string
): Promise<ApiResult<{ plans: BillingPlan[] }>> {
  const r = await billing<{ plans?: unknown }>(
    `/v1/admin/plans?projectId=${encodeURIComponent(projectId)}`
  );
  if (!r.ok) return r;
  return {
    ok: true,
    data: {
      plans: Array.isArray(r.data.plans) ? (r.data.plans as BillingPlan[]) : [],
    },
  };
}

/** Admin: create a plan (auto-creates the Paddle price when none given). */
export async function createPlan(
  projectId: string,
  input: PlanInput
): Promise<ApiResult<{ plan: BillingPlan }>> {
  return billing('/v1/admin/plans', {
    method: 'POST',
    body: JSON.stringify({ ...input, projectId }),
  });
}

/** Admin: update a plan. */
export async function updatePlan(
  planId: string,
  input: Partial<PlanInput>
): Promise<ApiResult<{ plan: BillingPlan }>> {
  return billing(`/v1/admin/plans/${planId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/** Admin: delete (deactivate) a plan. */
export async function deletePlan(
  planId: string
): Promise<ApiResult<{ plan: BillingPlan }>> {
  return billing(`/v1/admin/plans/${planId}`, { method: 'DELETE' });
}

export async function listInvoices(
  projectId: string
): Promise<ApiResult<{ invoices: Invoice[]; total: number }>> {
  const r = await billing<{ invoices?: unknown; total?: number }>(
    `/v1/billing/invoices?projectId=${projectId}&limit=20`
  );
  if (!r.ok) return r;
  return {
    ok: true,
    data: {
      invoices: Array.isArray(r.data.invoices)
        ? (r.data.invoices as Invoice[])
        : [],
      total: typeof r.data.total === 'number' ? r.data.total : 0,
    },
  };
}
