'use client';

import {
  BillingClient,
  type Invoice,
  type Plan,
  type Subscription,
} from '@slyxup/core';
import { useCallback, useEffect, useMemo, useState } from 'react';

const defaultClient = new BillingClient();

export function useBilling(apiUrl?: string) {
  const client = useMemo(
    () => (apiUrl ? new BillingClient({ apiUrl }) : defaultClient),
    [apiUrl]
  );
  return { client };
}

export function usePlans(projectId: string | undefined, apiUrl?: string) {
  const { client } = useBilling(apiUrl);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    client
      .listPlans(projectId)
      .then(setPlans)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Failed')
      )
      .finally(() => setLoading(false));
  }, [projectId, client]);

  return { plans, loading, error };
}

export function useSubscription(
  projectId: string | undefined,
  apiUrl?: string
) {
  const { client } = useBilling(apiUrl);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!projectId) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    try {
      const sub = await client.getSubscription(projectId);
      setSubscription(sub);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [client, projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { subscription, loading, error, reload };
}

export function useInvoices(apiUrl?: string) {
  const { client } = useBilling(apiUrl);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client
      .listInvoices()
      .then(setInvoices)
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [client]);

  return { invoices, loading };
}

export interface CheckoutHookOptions {
  /** Return target carried through payment → success page. */
  origin?: string;
  openIn?: '_blank' | '_self';
  manualOpen?: boolean;
}

export function useCheckout(apiUrl?: string) {
  const { client } = useBilling(apiUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = useCallback(
    async (planId: string, opts?: CheckoutHookOptions) => {
      setLoading(true);
      setError(null);
      try {
        return await client.checkout(planId, opts);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Checkout failed');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  return { checkout, loading, error };
}

export interface TransactionStatus {
  id: string;
  status: string;
  paid: boolean;
  checkoutUrl: string | null;
}

/**
 * Verify a checkout transaction with Paddle — headless building block for
 * custom success screens. `paid` is true only for completed transactions.
 */
export function useTransaction(
  transactionId: string | undefined,
  apiUrl?: string
) {
  const { client } = useBilling(apiUrl);
  const [data, setData] = useState<TransactionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!transactionId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await client.getTransaction(transactionId);
      setData(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [client, transactionId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { transaction: data, loading, error, reload };
}
