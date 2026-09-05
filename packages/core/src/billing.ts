// Billing client — import from '@slyxup/core'.

// Minimal ambient declarations (no @types/node dependency in browsers).
declare const process: { env?: Record<string, string | undefined> } | undefined;

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

export interface CheckoutResult {
  transactionId: string;
  checkoutUrl: string;
}

export interface CheckoutOptions {
  /** Return target carried through payment → success page (e.g. your app URL).
   *  Without it the buyer lands on the SlyxUp dashboard after paying. */
  origin?: string;
  /** Open the payment page in a new tab (default) or the same tab. */
  openIn?: '_blank' | '_self';
  /** Skip auto-opening the payment page (you open checkoutUrl yourself,
   *  or use the transactionId with Paddle.js overlay). */
  manualOpen?: boolean;
}

export interface TransactionStatus {
  id: string;
  status: string;
  paid: boolean;
  checkoutUrl: string | null;
}

export interface BillingClientOptions {
  apiUrl?: string;
  publishableKey?: string;
}

function getEnvApiUrl(): string | undefined {
  try {
    const billingUrl =
      typeof process !== 'undefined'
        ? process?.env?.NEXT_PUBLIC_SLYXUP_BILLING_URL
        : undefined;
    if (billingUrl) return billingUrl;
  } catch {}
  try {
    const viteEnv = (
      import.meta as unknown as {
        env?: Record<string, string | undefined>;
      }
    )?.env;
    if (viteEnv?.VITE_SLYXUP_BILLING_URL)
      return viteEnv.VITE_SLYXUP_BILLING_URL;
  } catch {}
  try {
    const authUrl =
      typeof process !== 'undefined'
        ? process?.env?.NEXT_PUBLIC_SLYXUP_API_URL
        : undefined;
    if (authUrl)
      return authUrl.replace('auth.slyxup.online', 'billing.slyxup.online');
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

  /**
   * Create a checkout transaction and open the real Paddle payment page.
   * Returns the transaction id + payment URL. The buyer pays on the opened
   * page; the subscription activates via webhook — never trust a redirect
   * URL alone, verify with getTransaction() before gating features.
   */
  async checkout(
    planId: string,
    opts?: CheckoutOptions & { successUrl?: string }
  ): Promise<CheckoutResult> {
    const res = await this.req<CheckoutResult>('/v1/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({
        planId,
        ...(opts?.origin ? { origin: opts.origin } : {}),
        // successUrl is legacy/ignored by the server for link building.
        ...(opts?.successUrl ? { successUrl: opts.successUrl } : {}),
      }),
    });
    if (!opts?.manualOpen && res.checkoutUrl && typeof window !== 'undefined') {
      const target = opts?.openIn ?? '_blank';
      if (target === '_blank') {
        window.open(res.checkoutUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.assign(res.checkoutUrl);
      }
    }
    return res;
  }

  /**
   * Verify a checkout transaction with Paddle (public, capability-token).
   * `paid === true` only when Paddle reports the transaction `completed`.
   */
  async getTransaction(transactionId: string): Promise<TransactionStatus> {
    return this.req<TransactionStatus>(
      `/v1/billing/transactions/${encodeURIComponent(transactionId)}`
    );
  }

  async cancelSubscription(projectId?: string): Promise<void> {
    const qs = projectId ? `?projectId=${projectId}` : '';
    await this.req(`/v1/billing/subscription/cancel${qs}`, { method: 'POST' });
  }

  /** Undo a scheduled cancellation so the subscription renews normally. */
  async resumeSubscription(projectId?: string): Promise<void> {
    const qs = projectId ? `?projectId=${projectId}` : '';
    await this.req(`/v1/billing/subscription/resume${qs}`, { method: 'POST' });
  }

  /**
   * All non-canceled subscriptions for the session user, across projects.
   * Use this when the UI doesn't know a single projectId upfront.
   */
  async listSubscriptions(): Promise<Subscription[]> {
    const res = await this.req<{ ok: true; subscriptions: Subscription[] }>(
      '/v1/billing/subscription'
    );
    return res.subscriptions;
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
