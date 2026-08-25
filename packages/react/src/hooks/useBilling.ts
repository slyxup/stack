'use client';

import { useCallback, useEffect, useState } from 'react';
import { BillingClient, type Plan, type Subscription, type Invoice } from '@slyxup/billing';

const defaultClient = new BillingClient();

export function useBilling(apiUrl?: string) {
  const client = apiUrl ? new BillingClient({ apiUrl }) : defaultClient;
  return { client };
}

export function usePlans(projectId: string | undefined, apiUrl?: string) {
  const { client } = useBilling(apiUrl);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    client.listPlans(projectId)
      .then(setPlans)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false));
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { plans, loading, error };
}

export function useSubscription(projectId: string | undefined, apiUrl?: string) {
  const { client } = useBilling(apiUrl);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const sub = await client.getSubscription();
      setSubscription(sub);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void reload(); }, [reload]);

  return { subscription, loading, error, reload };
}

export function useInvoices(apiUrl?: string) {
  const { client } = useBilling(apiUrl);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.listInvoices()
      .then(setInvoices)
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { invoices, loading };
}

export function useCheckout(apiUrl?: string) {
  const { client } = useBilling(apiUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = useCallback(async (planId: string) => {
    setLoading(true);
    setError(null);
    try {
      await client.checkout(planId); // redirects to Paddle
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { checkout, loading, error };
}
