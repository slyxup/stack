'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { billingApi } from '../../../../lib/dashboard-client';
import { useDev } from '../../../../components/dashboard/AuthGate';

interface Plan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  interval: string;
  trialDays: number | null;
  features: string[];
  isPopular?: boolean;
}
interface Subscription {
  id: string;
  projectId: string;
  planId: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}
interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  invoiceNumber: string | null;
  billedAt: string | null;
}

const money = (n: number, c: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);

export default function BillingPage() {
  const dev = useDev();
  const params = useParams();
  const projectId = params.projectId as string;

  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void load(dev);
  }, [dev, projectId]);

  async function load(d: typeof dev) {
    setBusy(true);
    setErr(null);
    try {
      const [p, s, iv] = await Promise.all([
        billingApi<{ plans: Plan[] }>(
          `/v1/billing/plans?projectId=${projectId}`,
          d
        ),
        billingApi<{ subscription: Subscription | null }>(
          `/v1/billing/subscription?projectId=${projectId}`,
          d
        ),
        billingApi<{ invoices: Invoice[] }>(
          `/v1/billing/invoices?projectId=${projectId}`,
          d
        ),
      ]);
      setPlans(p.plans);
      setSub(s.subscription);
      setInvoices(iv.invoices);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load billing');
    } finally {
      setBusy(false);
    }
  }

  async function checkout(planId: string) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await billingApi<{ checkoutUrl: string }>(
        `/v1/billing/checkout`,
        dev,
        {
          method: 'POST',
          body: JSON.stringify({
            planId,
            projectId,
            successUrl: window.location.href,
          }),
        }
      );
      window.open(res.checkoutUrl, '_blank', 'noopener');
      setMsg('Redirecting to checkout in a new tab…');
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Checkout failed');
    } finally {
      setBusy(false);
    }
  }

  async function cancelToggle() {
    if (!sub) return;
    const action = sub.cancelAtPeriodEnd ? 'resume' : 'cancel';
    if (!window.confirm(`Are you sure you want to ${action} your subscription?`)) return;
    setBusy(true);
    setErr(null);
    try {
      const path = sub.cancelAtPeriodEnd
        ? `/v1/billing/subscription/resume`
        : `/v1/billing/subscription/cancel`;
      await billingApi(path, dev, { method: 'POST', body: JSON.stringify({ projectId }) });
      await load(dev);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  const subPlan = plans.find((p) => p.id === sub?.planId);

  return (
    <>
      <h1 className="page-title">Billing</h1>
      <p className="page-sub">
        Plans and subscription for this project, powered by SlyxUp Billing.
      </p>
      {err && <p className="err" style={{ marginBottom: 16 }}>{err}</p>}
      {msg && <p className="msg" style={{ marginBottom: 16 }}>{msg}</p>}

      {/* Current subscription */}
      <div className="panel">
        <div className="panel-head">
          <h3>Current subscription</h3>
          {sub && (
            <button className="btn-secondary c-btn" disabled={busy} onClick={() => void cancelToggle()}>
              {sub.cancelAtPeriodEnd ? 'Resume' : 'Cancel at period end'}
            </button>
          )}
        </div>
        {!sub ? (
          <p className="hint">No active subscription. Pick a plan below to get started.</p>
        ) : (
          <>
            <div className="kv">
              <span className="k">Plan</span>
              <span className="v">{subPlan?.name ?? sub.planId}</span>
            </div>
            <div className="kv">
              <span className="k">Status</span>
              <span className="v">
                <span className={`pill ${sub.status === 'active' ? 'good' : 'warn'}`}>
                  {sub.status}
                </span>{' '}
                {sub.cancelAtPeriodEnd && (
                  <span className="pill bad">cancels at period end</span>
                )}
              </span>
            </div>
            <div className="kv">
              <span className="k">Current period</span>
              <span className="v">
                {sub.currentPeriodStart ? new Date(sub.currentPeriodStart).toLocaleDateString() : '—'}{' '}
                →{' '}
                {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '—'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Plans */}
      <h3 style={{ margin: '8px 0 14px' }}>Plans</h3>
      {plans.length === 0 ? (
        <div className="empty">No plans configured for this project yet.</div>
      ) : (
        <div className="billing-grid">
          {plans.map((p) => (
            <div key={p.id} className={`billing-plan${p.isPopular ? ' hot' : ''}`}>
              <div className="pname">{p.name}</div>
              <div className="pamt">
                {money(p.amount, p.currency)}
                <small> / {p.interval}</small>
              </div>
              {p.trialDays ? (
                <span className="paid-badge">{p.trialDays}-day trial</span>
              ) : null}
              <ul className="pfeat">
                {p.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              <button
                className="btn-primary"
                disabled={busy || !!sub}
                onClick={() => void checkout(p.id)}
              >
                {sub ? 'Subscribed' : 'Subscribe'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Invoices */}
      <div className="panel" style={{ marginTop: 22 }}>
        <h3>Invoices</h3>
        {invoices.length === 0 ? (
          <p className="hint">No invoices yet.</p>
        ) : (
          <table className="dtable">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((iv) => (
                <tr key={iv.id}>
                  <td className="cell-main mono">
                    {iv.invoiceNumber ?? iv.id.slice(0, 8)}
                  </td>
                  <td className="cell-sub">
                    {iv.billedAt ? new Date(iv.billedAt).toLocaleDateString() : '—'}
                  </td>
                  <td>{money(iv.amount, iv.currency)}</td>
                  <td>
                    <span className={`pill ${iv.status === 'paid' ? 'good' : 'warn'}`}>
                      {iv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
