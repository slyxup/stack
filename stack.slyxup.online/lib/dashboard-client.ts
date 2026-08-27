// Shared client for the SlyxUp dashboard (project-scoped console).
// Now SDK-aware: uses SlyxUpProvider's cookie session when available,
// falls back to legacy localStorage Bearer for backwards compat.

import { SlyxupClient } from '@slyxup/core';

export const API = process.env.NEXT_PUBLIC_SLYXUP_API_URL ?? 'https://auth.slyxup.online';
export const BILLING = process.env.NEXT_PUBLIC_SLYXUP_BILLING_URL ?? 'https://billing.slyxup.online';

export interface Dev {
  token: string;
  email: string;
}

// Legacy localStorage helpers — kept for backwards compat, but prefer SDK
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

// Global SDK client — set by AuthGate's InnerGate so project APIs share the same session
let globalClient: SlyxupClient | null = null;
export function setGlobalClient(client: SlyxupClient) {
  globalClient = client;
}
function getGlobalClient(): SlyxupClient | null {
  if (globalClient) return globalClient;
  // Lazy singleton for non-React contexts (e.g. direct api() calls outside provider)
  try {
    const pk = typeof window !== 'undefined' ? (window as unknown as { __SLYXUP_PK?: string }).__SLYXUP_PK : undefined;
    const envPk = process.env.NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY;
    const publishableKey = (pk as string) ?? envPk ?? 'pk_test_missing';
    globalClient = new SlyxupClient({ publishableKey, apiUrl: API });
    return globalClient;
  } catch {
    return null;
  }
}

async function req<T>(base: string, path: string, dev: Dev | null, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  // 1) Try SDK client (cookie + Bearer from storedToken)
  const c = getGlobalClient();
  if (c) {
    // SlyxupClient stores token internally and also handles cookies via jar;
    // we replicate its header logic here for our custom project endpoints
    try {
      // Access private storedToken via unknown — fallback to dev token
      const maybeToken = (c as unknown as { _token?: string; apiUrl?: string })._token ?? (c as unknown as { storedToken?: string }).storedToken;
      const token: string | undefined = maybeToken ?? dev?.token ?? getDev()?.token;
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {
      if (dev?.token) headers.Authorization = `Bearer ${dev.token}`;
    }
    // Also send publishable key so server can scope correctly
    const pk = (c as unknown as { publishableKey?: string }).publishableKey;
    if (pk && pk !== 'pk_test_missing' && !pk.includes('REPLACE')) {
      headers['X-Publishable-Key'] = pk;
    }
  } else if (dev?.token) {
    headers.Authorization = `Bearer ${dev.token}`;
  } else {
    const fallback = getDev();
    if (fallback?.token) headers.Authorization = `Bearer ${fallback.token}`;
  }

  Object.assign(headers, (init?.headers as Record<string, string> | undefined) ?? {});

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers,
    credentials: 'include',
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
  const res = await api<{ ok: boolean; sessionToken: string }>('/v1/auth/sign-in', null, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const d: Dev = { token: res.sessionToken, email };
  setDev(d);
  return d;
}

export const api = <T>(path: string, dev: Dev | null, init?: RequestInit) => req<T>(API, path, dev, init);

export const billingApi = <T>(path: string, dev: Dev | null, init?: RequestInit) => req<T>(BILLING, path, dev, init);
