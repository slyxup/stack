import { SlyxupClient } from '@slyxup/core';

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
}

// ── BillingClient ──
export class BillingClient {
  private apiUrl: string;

  constructor(options: BillingClientOptions = {}) {
    this.apiUrl = (
      options.apiUrl ??
      process.env.NEXT_PUBLIC_SLYXUP_API_URL ??
      'https://auth.slyxup.online'
    ).replace(/\/$/, '');
  }

  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const token = this.getToken();
    const res = await fetch(`${this.apiUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const data = (await res
        .json()
        .catch(() => ({ error: `Request failed (${res.status})` }))) as {
        error?: string;
      };
      throw new Error(data.error ?? `Request failed (${res.status})`);
    }
    return res.json() as Promise<T>;
  }

  private getToken(): string | undefined {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/slyxup_session=([^;]+)/);
      return match?.[1];
    }
    return undefined;
  }

  /** List all active plans for a project */
  async listPlans(projectId: string): Promise<Plan[]> {
    const res = await this.req<{ ok: true; plans: Plan[] }>(
      `/v1/billing/plans?projectId=${projectId}`
    );
    return res.plans;
  }

  /** Get current user's subscription for a project */
  async getSubscription(
    projectId: string,
    sessionToken: string
  ): Promise<Subscription | null> {
    const res = await fetch(
      `${this.apiUrl}/v1/billing/subscription?projectId=${projectId}`,
      {
        headers: { Authorization: `Bearer ${sessionToken}` },
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { subscription: Subscription | null };
    return data.subscription;
  }

  /** Get checkout URL — redirect the user to this to start a subscription */
  async getCheckoutUrl(
    planId: string,
    sessionToken: string,
    successUrl?: string
  ): Promise<string> {
    const res = await fetch(`${this.apiUrl}/v1/billing/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ planId, successUrl }),
    });
    const data = (await res.json()) as { checkoutUrl?: string; error?: string };
    if (!res.ok || !data.checkoutUrl)
      throw new Error(data.error ?? 'Checkout failed');
    return data.checkoutUrl;
  }

  /** Cancel at end of billing period */
  async cancelSubscription(sessionToken: string): Promise<void> {
    await fetch(`${this.apiUrl}/v1/billing/subscription/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
  }

  /** List invoices for current user */
  async listInvoices(sessionToken: string): Promise<Invoice[]> {
    const res = await fetch(`${this.apiUrl}/v1/billing/invoices`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { invoices: Invoice[] };
    return data.invoices;
  }
}

export * from './types.js';
