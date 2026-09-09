'use client';

import {
  BillingClient,
  type Invoice,
  type Plan,
  type Subscription,
} from '@slyxup/core';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AuthContext } from '../context/auth-context';

export function useBilling(apiUrl?: string) {
  const auth = useContext(AuthContext);
  const authClient = auth?.client;
  const billingApiUrl = apiUrl ?? auth?.billingApiUrl;
  const userId = auth?.userId;
  const client = useMemo(
    () =>
      new BillingClient({
        apiUrl: billingApiUrl,
        publishableKey: authClient?.publishableKey,
        getToken: () => (userId ? authClient?.getToken() : undefined),
      }),
    [billingApiUrl, authClient, userId]
  );
  return { client };
}

export function usePlans(projectId: string | undefined, apiUrl?: string) {
  const { client } = useBilling(apiUrl);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setPlans([]);
    setError(null);
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    client
      .listPlans(projectId)
      .then((value) => {
        if (active) setPlans(value);
      })
      .catch((e: unknown) => {
        if (active)
          setError(e instanceof Error ? e.message : 'Unable to load plans');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
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
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const reload = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    setInvoices([]);
    try {
      const result = await client.listInvoices();
      if (request === generation.current) setInvoices(result);
    } catch (e) {
      if (request === generation.current)
        setError(e instanceof Error ? e.message : 'Unable to load invoices');
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);

  return { invoices, loading, error, reload };
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
 * All non-canceled subscriptions for the session user, across projects.
 * Prefer this over useSubscription when the UI doesn't know a single
 * projectId upfront (multi-project platforms).
 */
export function useSubscriptions(apiUrl?: string) {
  const { client } = useBilling(apiUrl);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const list = await client.listSubscriptions();
      setSubscriptions(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { subscriptions, loading, error, reload };
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
