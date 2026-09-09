// Billing client — import from '@slyxup/core'.
import {
  NetworkError,
  RateLimitError,
  SlyxupError,
  UnauthorizedError,
  ValidationError,
} from './errors.js';

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
  /** Explicit session source; e.g. () => authClient.getToken(). */
  getToken?: () => string | undefined;
}

function getEnvApiUrl(): string | undefined {
  try {
    const billingUrl =
      typeof process !== 'undefined'
        ? process?.env?.NEXT_PUBLIC_SLYXUP_BILLING_URL
        : undefined;
    if (billingUrl) return billingUrl;
  } catch {}
  return undefined;
}

export class BillingClient {
  readonly apiUrl: string;
  readonly publishableKey?: string;
  private readonly getToken?: () => string | undefined;

  constructor(options: BillingClientOptions = {}) {
    const raw = (
      options.apiUrl ??
      getEnvApiUrl() ??
      'https://billing.slyxup.online'
    ).replace(/\/$/, '');
    this.apiUrl = raw;
    this.publishableKey = options.publishableKey;
    this.getToken = options.getToken;
  }

  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const token = this.getToken?.();
    const authHeaders: Record<string, string> = {};
    if (token) authHeaders.Authorization = `Bearer ${token}`;
    if (this.publishableKey && this.publishableKey !== 'pk_test_missing')
      authHeaders['X-Publishable-Key'] = this.publishableKey;
    let res: Response;
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...authHeaders,
    });
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
    try {
      res = await fetch(`${this.apiUrl}${path}`, {
        ...init,
        headers,
        credentials: 'include',
      });
    } catch {
      throw new NetworkError();
    }
    if (!res.ok) {
      const body: unknown = await res.json().catch(() => null);
      const data = body && typeof body === 'object' ? body : {};
      const message =
        'error' in data && typeof data.error === 'string'
          ? data.error
          : `Request failed (${res.status})`;
      if ('code' in data && typeof data.code === 'string')
        throw new SlyxupError(message, res.status, data.code);
      if (res.status === 401) throw new UnauthorizedError(message);
      if (res.status === 429) throw new RateLimitError(message);
      if (res.status === 400) throw new ValidationError(message);
      throw new SlyxupError(message, res.status, 'api_error');
    }
    return res.json() as Promise<T>;
  }

  async listPlans(projectId: string): Promise<Plan[]> {
    const res = await this.req<{ ok: true; plans: Plan[] }>(
      `/v1/billing/plans?projectId=${encodeURIComponent(projectId)}`
    );
    return res.plans;
  }

  async getSubscription(projectId?: string): Promise<Subscription | null> {
    if (!projectId) return (await this.listSubscriptions())[0] ?? null;
    const qs = `?projectId=${encodeURIComponent(projectId)}`;
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
    }>(`/v1/billing/entitlements?projectId=${encodeURIComponent(projectId)}`);
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
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    await this.req(`/v1/billing/subscription/cancel${qs}`, { method: 'POST' });
  }

  /** Undo a scheduled cancellation so the subscription renews normally. */
  async resumeSubscription(projectId?: string): Promise<void> {
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
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
