// Merged from @slyxup/billing — now part of core (2-SDK model).
// Import from '@slyxup/core'. Old '@slyxup/billing' re-exports this.
declare const process: any;

export interface Plan {
  id: string;
  name: string;
  paddlePriceId: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  trialDays: number | null;
  features: string[];
  isPopular: boolean;
}

export interface Subscription {
  id: string;
  projectId: string;
  userId: string;
  planId: string;
  status: 'active' | 'trialing' | 'past_due' | 'paused' | 'canceled';
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue' | 'refunded';
  invoiceNumber: string | null;
  billedAt: string | null;
}

export interface BillingClientOptions {
  apiUrl?: string;
  publishableKey?: string;
}

function getEnvApiUrl(): string | undefined {
  try {
    // @ts-ignore — process may not exist in browser
    if (
      typeof process !== 'undefined' &&
      (process as any).env?.NEXT_PUBLIC_SLYXUP_BILLING_URL
    )
      return (process as any).env.NEXT_PUBLIC_SLYXUP_BILLING_URL;
  } catch {}
  try {
    // @ts-ignore
    const env = (import.meta as any)?.env;
    if (env?.VITE_SLYXUP_BILLING_URL) return env.VITE_SLYXUP_BILLING_URL;
  } catch {}
  try {
    // @ts-ignore — process may not exist in browser
    const authUrl = (process as any)?.env?.NEXT_PUBLIC_SLYXUP_API_URL;
    if (authUrl)
      return (authUrl as string).replace(
        'auth.slyxup.online',
        'billing.slyxup.online'
      );
  } catch {}
  return undefined;
}

function getStoredToken(): string | undefined {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('slyxup_session_token') ?? undefined;
    }
  } catch {}
  return undefined;
}

export class BillingClient {
  readonly apiUrl: string;
  readonly publishableKey?: string;

  constructor(options: BillingClientOptions = {}) {
    const raw = (
      options.apiUrl ??
      getEnvApiUrl() ??
      'https://billing.slyxup.online'
    ).replace(/\/$/, '');
    if (/^https?:\/\/localhost:\d+$/.test(raw) && raw.includes(':8787')) {
      this.apiUrl = raw.replace(/:8787$/, ':8788');
    } else {
      this.apiUrl = raw;
    }
    this.publishableKey = options.publishableKey;
  }

  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const token = getStoredToken();
    const authHeaders: Record<string, string> = {};
    if (token) authHeaders.Authorization = `Bearer ${token}`;
    if (this.publishableKey && this.publishableKey !== 'pk_test_missing')
      authHeaders['X-Publishable-Key'] = this.publishableKey;
    const res = await fetch(`${this.apiUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...init?.headers,
      },
      credentials: 'include',
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      throw new Error(
        typeof data.error === 'string'
          ? data.error
          : `Request failed (${res.status})`
      );
    }
    return res.json() as Promise<T>;
  }

  async listPlans(projectId: string): Promise<Plan[]> {
    const res = await this.req<{ ok: true; plans: Plan[] }>(
      `/v1/billing/plans?projectId=${projectId}`
    );
    return res.plans;
  }

  async getSubscription(projectId?: string): Promise<Subscription | null> {
    const qs = projectId ? `?projectId=${projectId}` : '';
    const res = await this.req<{ ok: true; subscription: Subscription | null }>(
      `/v1/billing/subscription${qs}`
    );
    return res.subscription;
  }

  async getEntitlements(
    projectId: string
  ): Promise<{ planId: string | null; status: string; features: string[] }> {
    const res = await this.req<{
      ok: true;
      planId: string | null;
      status: string;
      features: string[];
    }>(`/v1/billing/entitlements?projectId=${projectId}`);
    return { planId: res.planId, status: res.status, features: res.features };
  }

  async checkout(planId: string, successUrl?: string): Promise<void> {
    const res = await this.req<{ ok: true; checkoutUrl?: string }>(
      '/v1/billing/checkout',
      {
        method: 'POST',
        body: JSON.stringify({ planId, ...(successUrl ? { successUrl } : {}) }),
      }
    );
    if (res.checkoutUrl)
      window.open(res.checkoutUrl, '_blank', 'noopener,noreferrer');
  }

  async cancelSubscription(projectId?: string): Promise<void> {
    const qs = projectId ? `?projectId=${projectId}` : '';
    await this.req(`/v1/billing/subscription/cancel${qs}`, { method: 'POST' });
  }

  async listInvoices(): Promise<Invoice[]> {
    const res = await this.req<{ ok: true; invoices: Invoice[] }>(
      '/v1/billing/invoices'
    );
    return res.invoices;
  }
}

export function createBillingClient(
  options?: Partial<BillingClientOptions>
): BillingClient {
  return new BillingClient(options);
}
