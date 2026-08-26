import type { SlyxupClient } from '@slyxup/core';

// ── Types ──
export interface Plan {
  id: string;
  name: string;
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
  // Next.js (process.env) + Vite (import.meta.env) + generic window check
  try {
    // @ts-ignore — process may not exist in browser
    if (
      typeof process !== 'undefined' &&
      process.env?.NEXT_PUBLIC_SLYXUP_API_URL
    )
      return process.env.NEXT_PUBLIC_SLYXUP_API_URL;
  } catch {}
  try {
    // @ts-ignore — import.meta may not exist in Node
    if (
      typeof import.meta !== 'undefined' &&
      (import.meta as unknown as { env?: Record<string, string> }).env
        ?.VITE_SLYXUP_API_URL
    ) {
      return (import.meta as unknown as { env: Record<string, string> }).env
        .VITE_SLYXUP_API_URL;
    }
  } catch {}
  return undefined;
}

export class BillingClient {
  readonly apiUrl: string;
  readonly publishableKey?: string;

  constructor(options: BillingClientOptions = {}) {
    this.apiUrl = (
      options.apiUrl ??
      getEnvApiUrl() ??
      'https://auth.slyxup.online'
    ).replace(/\/$/, '');
    this.publishableKey = options.publishableKey;
  }

  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.apiUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
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

  /** List plans — public endpoint, no auth needed */
  async listPlans(projectId: string): Promise<Plan[]> {
    const res = await this.req<{ ok: true; plans: Plan[] }>(
      `/v1/billing/plans?projectId=${projectId}`
    );
    return res.plans;
  }

  /** Get current subscription (requires session cookie) */
  async getSubscription(): Promise<Subscription | null> {
    const res = await this.req<{ ok: true; subscription: Subscription | null }>(
      '/v1/billing/subscription'
    );
    return res.subscription;
  }

  /** Create checkout URL and redirect (requires session cookie) */
  async checkout(planId: string): Promise<void> {
    const res = await this.req<{ ok: true; checkoutUrl?: string }>(
      '/v1/billing/checkout',
      {
        method: 'POST',
        body: JSON.stringify({ planId }),
      }
    );
    if (res.checkoutUrl) window.location.href = res.checkoutUrl;
  }

  /** Cancel subscription at end of period */
  async cancelSubscription(): Promise<void> {
    await this.req('/v1/billing/subscription/cancel', { method: 'POST' });
  }

  /** List invoices */
  async listInvoices(): Promise<Invoice[]> {
    const res = await this.req<{ ok: true; invoices: Invoice[] }>(
      '/v1/billing/invoices'
    );
    return res.invoices;
  }
}
