// Shared client for the SlyxUp dashboard (project-scoped console).
// Auth + project APIs live on auth.slyxup.online; billing on billing.slyxup.online.
// Both accept the same Bearer session token produced by /v1/auth/sign-in.

export const API =
  process.env.NEXT_PUBLIC_SLYXUP_API_URL ?? 'https://auth.slyxup.online';
export const BILLING =
  process.env.NEXT_PUBLIC_SLYXUP_BILLING_URL ?? 'https://billing.slyxup.online';

export interface Dev {
  token: string;
  email: string;
}

export function getDev(): Dev | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('slyxup_dev');
    return raw ? (JSON.parse(raw) as Dev) : null;
  } catch {
    return null;
  }
}

export function setDev(d: Dev) {
  try {
    localStorage.setItem('slyxup_dev', JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

export function clearDev() {
  try {
    localStorage.removeItem('slyxup_dev');
  } catch {
    /* ignore */
  }
}

async function req<T>(
  base: string,
  path: string,
  dev: Dev | null,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(dev ? { Authorization: `Bearer ${dev.token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    throw new Error((data.error as string) ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export async function validateSession(dev: Dev): Promise<boolean> {
  try {
    await api<{ user: { id: string } }>('/v1/auth/session', dev);
    return true;
  } catch {
    return false;
  }
}

export async function signIn(email: string, password: string): Promise<Dev> {
  const res = await api<{ ok: boolean; sessionToken: string }>(
    '/v1/auth/sign-in',
    null,
    { method: 'POST', body: JSON.stringify({ email, password }) }
  );
  const d: Dev = { token: res.sessionToken, email };
  setDev(d);
  return d;
}

export const api = <T>(path: string, dev: Dev | null, init?: RequestInit) =>
  req<T>(API, path, dev, init);

export const billingApi = <T>(path: string, dev: Dev | null, init?: RequestInit) =>
  req<T>(BILLING, path, dev, init);
