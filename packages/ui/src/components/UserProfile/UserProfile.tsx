import type { SlyxupSessionInfo } from '@slyxup/core';
import { useAuth, useUser } from '@slyxup/react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { initPaddle, openPaddleCheckout } from '../../lib/paddle';
import { injectStyles } from '../../styles';

export interface UserProfileProps {
  /** Render as a centered modal overlay (default). Set false for inline usage. */
  modal?: boolean;
  onClose?: () => void;
  /** Called after the account is deleted — redirect or reset app state here. */
  onDeleted?: () => void;
}

type Tab = 'profile' | 'security' | 'billing';

function initials(user: {
  firstName: string | null;
  lastName?: string | null;
  email: string;
}): string {
  const f = user.firstName?.trim();
  const l = user.lastName?.trim();
  if (f && l) return (f[0] + l[0]).toUpperCase();
  if (f) return f.slice(0, 1).toUpperCase();
  if (l) return l.slice(0, 1).toUpperCase();
  return user.email.slice(0, 1).toUpperCase();
}

function displayName(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const parts = [user.firstName?.trim(), user.lastName?.trim()].filter(Boolean);
  const name = parts.join(' ');
  return name || user.email;
}

function deviceLabel(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const os = /Windows/i.test(ua)
    ? 'Windows'
    : /Mac OS X|Macintosh/i.test(ua)
      ? 'macOS'
      : /Android/i.test(ua)
        ? 'Android'
        : /iPhone|iPad|iPod/i.test(ua)
          ? 'iOS'
          : /CrOS/i.test(ua)
            ? 'Chrome OS'
            : /Linux/i.test(ua)
              ? 'Linux'
              : 'Unknown OS';
  // Order matters: check Edge before Chrome (Edg/ appears in Chrome UA)
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /OPR|Opera/i.test(ua)
      ? 'Opera'
      : /Vivaldi/i.test(ua)
        ? 'Vivaldi'
        : /Brave/i.test(ua)
          ? 'Brave'
          : /Chrome\//i.test(ua) && !/CriOS/i.test(ua)
            ? 'Chrome'
            : /Safari\//i.test(ua) && !/Chrome\//i.test(ua)
              ? 'Safari'
              : /Firefox\//i.test(ua) || /FxiOS/i.test(ua)
                ? 'Firefox'
                : /SamsungBrowser/i.test(ua)
                  ? 'Samsung Browser'
                  : /Mobile/i.test(ua) || /Android/i.test(ua)
                    ? 'Mobile Browser'
                    : 'Browser';
  return `${browser} · ${os}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

interface Plan {
  id: string;
  name: string;
  paddlePriceId: string;
  amount: number;
  currency: string;
  interval: string;
  trialDays: number | null;
  features: string[] | null;
  isPopular: boolean;
}

export function UserProfile({
  modal = true,
  onClose,
  onDeleted,
}: UserProfileProps) {
  injectStyles();
  const { isLoaded, user, reload } = useUser();
  const { client } = useAuth();

  const [tab, setTab] = useState<Tab>('profile');

  // ── Profile form state ──
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // ── Password form state ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);

  // ── Sessions state ──
  const [sessions, setSessions] = useState<SlyxupSessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [othersRevoking, setOthersRevoking] = useState(false);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [sessionsPage, setSessionsPage] = useState(0);
  const SESSIONS_PER_PAGE = 10;

  // ── Billing state ──
  const [billingLoading, setBillingLoading] = useState(true);
  const [subscription, setSubscription] = useState<{
    id: string;
    status: string;
    planId?: string | null;
    planName: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null>(null);
  const [invoices, setInvoices] = useState<
    {
      id: string;
      amount: number;
      currency: string;
      status: string;
      billedAt: string | null;
    }[]
  >([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [checkoutDone, setCheckoutDone] = useState(false);

  // ── Danger zone state ──
  const [confirmText, setConfirmText] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Sync form fields when user loads/updates. Use individual primitives as
  // deps so the effect fires even when the user object reference stays the
  // same (e.g. after a silent reload that returns identical data).
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — see comment above
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
      setAvatarUrl(user.avatarUrl ?? '');
    }
  }, [user?.firstName, user?.lastName, user?.avatarUrl, user?.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && modal) onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal, onClose]);

  const loadSessions = useCallback(
    async (page = 0) => {
      setSessionsLoading(true);
      try {
        const res = await client.sessions.list({
          limit: SESSIONS_PER_PAGE,
          offset: page * SESSIONS_PER_PAGE,
        });
        setSessions(res.sessions);
        setSessionsTotal(res.total);
        setSessionsPage(page);
      } catch {
        setSessions([]);
        setSessionsTotal(0);
      } finally {
        setSessionsLoading(false);
      }
    },
    [client]
  );

  const loadBilling = useCallback(async () => {
    setBillingLoading(true);
    setPlansLoading(true);
    try {
      const rawApiUrl =
        (client as unknown as { apiUrl: string }).apiUrl ??
        'https://auth.slyxup.online';
      const billingUrl = (() => {
        // Localhost: swap port 8787 → 8788 (auth → billing)
        if (/^https?:\/\/localhost(:\d+)?$/.test(rawApiUrl)) {
          return rawApiUrl.replace(/:(\d+)$/, ':8788');
        }
        return rawApiUrl.replace('auth.slyxup.online', 'billing.slyxup.online');
      })();
      const token =
        (
          client as unknown as {
            _token?: string;
            getToken?: () => string | undefined;
          }
        )?._token ??
        (
          client as unknown as { getToken?: () => string | undefined }
        )?.getToken?.();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      // Also forward publishable key if available (helps billing resolve project)
      const pubKey = (client as unknown as { publishableKey?: string })
        ?.publishableKey;
      if (pubKey && pubKey !== 'pk_test_missing')
        headers['X-Publishable-Key'] = pubKey;

      // Derive projectId for plans: prefer user.projectId, then try to resolve from publishableKey's project (for examples)
      // For the example apps, the publishableKey is for the example project, not the user's projectId
      const projectId: string | null =
        (user as unknown as { projectId?: string | null })?.projectId ?? null;

      // Fetch subscription + invoices (new /v1/billing/* with fallback to legacy /v1/*)
      async function fetchJson(url: string) {
        const res = await fetch(url, { headers, credentials: 'include' });
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      }

      // Subscription
      let subData: unknown = null;
      for (const path of [
        `${billingUrl}/v1/billing/subscription${projectId ? `?projectId=${projectId}` : ''}`,
        `${billingUrl}/v1/subscription`,
      ]) {
        try {
          const j = (await fetchJson(path)) as Record<string, unknown>;
          if (j && (j as { ok?: boolean }).ok !== false) {
            subData = j;
            break;
          }
        } catch {
          // try next path
        }
      }
      if (subData) {
        const sd = subData as {
          ok?: boolean;
          subscription?: Record<string, unknown> | null;
          subscriptions?: Record<string, unknown>[];
        };
        let sub: Record<string, unknown> | null = null;
        if (sd.subscription !== undefined)
          sub = sd.subscription as Record<string, unknown> | null;
        else if (Array.isArray(sd.subscriptions) && sd.subscriptions.length > 0)
          sub = sd.subscriptions[0] as Record<string, unknown>;

        if (sub) {
          setSubscription({
            id: String(sub.id ?? ''),
            status: String(sub.status ?? 'active'),
            planId:
              (sub.planId as string | null) ??
              (sub.plan_id as string | null) ??
              null,
            planName:
              (sub.planName as string | null) ??
              (sub.plan_name as string | null) ??
              (sub.name as string | null) ??
              null,
            currentPeriodEnd:
              (sub.currentPeriodEnd as string | null) ??
              (sub.current_period_end as string | null) ??
              (sub.currentPeriod_end as string | null) ??
              null,
            cancelAtPeriodEnd: Boolean(
              sub.cancelAtPeriodEnd ?? sub.cancel_at_period_end ?? false
            ),
          });
        } else {
          setSubscription(null);
        }
      } else {
        setSubscription(null);
      }

      // Invoices
      for (const path of [
        `${billingUrl}/v1/billing/invoices`,
        `${billingUrl}/v1/invoices`,
      ]) {
        try {
          const invJ = (await fetchJson(path)) as {
            ok?: boolean;
            invoices?: unknown[];
          };
          if (invJ?.ok !== false && Array.isArray(invJ.invoices)) {
            setInvoices(
              (invJ.invoices as Record<string, unknown>[]).map((inv) => ({
                id: String(inv.id),
                amount: Number(inv.amount ?? 0),
                currency: String(inv.currency ?? 'USD'),
                status: String(inv.status ?? 'pending'),
                billedAt:
                  (inv.billedAt as string | null) ??
                  (inv.billed_at as string | null) ??
                  null,
              }))
            );
            break;
          }
        } catch {
          // try next
        }
      }

      // Plans (needs projectId — if missing, try with publishableKey header instead of empty projectId)
      let gotPlans = false;
      const planPaths: string[] = [];
      if (projectId) {
        planPaths.push(`${billingUrl}/v1/billing/plans?projectId=${projectId}`);
      } else if (pubKey && pubKey !== 'pk_test_missing') {
        // No projectId but have publishableKey — let billing resolve project via X-Publishable-Key header.
        // Billing plans route returns [] in test/localhost when projectId is missing, which is fine.
        planPaths.push(`${billingUrl}/v1/billing/plans`);
      } else {
        // No projectId and no publishableKey — don't make the request, just show empty
        setPlans([]);
        gotPlans = true;
      }
      for (const p of planPaths) {
        try {
          const pj = (await fetchJson(p)) as { ok?: boolean; plans?: Plan[] };
          if (pj?.ok !== false && Array.isArray(pj.plans)) {
            setPlans(pj.plans);
            gotPlans = true;
            break;
          }
        } catch {
          // continue
        }
      }
      if (!gotPlans) setPlans([]);
    } catch {
      // Billing unavailable — show empty state, keep plans empty
      setPlans([]);
    } finally {
      setBillingLoading(false);
      setPlansLoading(false);
    }
  }, [client, user]);

  useEffect(() => {
    if (tab === 'security') void loadSessions(0);
    if (tab === 'billing') void loadBilling();
  }, [tab, loadSessions, loadBilling]);

  async function onProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      await client.users.update({ firstName, lastName, avatarUrl });
      await reload();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setBusy(false);
    }
  }

  async function onResendVerification() {
    if (!user) return;
    setResending(true);
    try {
      await client.auth.resendVerification(user.email);
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } finally {
      setResending(false);
    }
  }

  async function onPasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSaved(false);
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }
    setPwBusy(true);
    try {
      await client.password.change({ currentPassword, newPassword });
      setPwSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwSaved(false), 3000);
    } catch (err) {
      setPwError(
        err instanceof Error ? err.message : 'Failed to change password'
      );
    } finally {
      setPwBusy(false);
    }
  }

  async function onRevoke(id: string) {
    setRevokingId(id);
    try {
      await client.sessions.revoke(id);
      await loadSessions(sessionsPage);
    } finally {
      setRevokingId(null);
    }
  }

  async function onRevokeOthers() {
    setOthersRevoking(true);
    try {
      await client.sessions.revokeOthers();
      await loadSessions(0);
    } finally {
      setOthersRevoking(false);
    }
  }

  async function onDeleteAccount() {
    setDeleteError(null);
    setDeleteBusy(true);
    try {
      await client.users.delete();
      await client.auth.signOut().catch(() => undefined);
      onDeleted?.();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Failed to delete account'
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleCheckout(plan: Plan) {
    setCheckoutId(plan.id);
    try {
      // Always use Paddle.js overlay checkout
      // authApiUrl is available via client apiUrl
      const rawApiUrl =
        (client as unknown as { apiUrl: string }).apiUrl ??
        'https://auth.slyxup.online';
      await initPaddle(rawApiUrl);
      openPaddleCheckout(plan.paddlePriceId, user?.email);
      setCheckoutDone(true);

      // Poll for subscription updates after checkout (webhook may take a few seconds)
      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = 3000; // 3 seconds
      const poll = async () => {
        attempts++;
        try {
          await loadBilling();
          if (subscription && attempts < maxAttempts) {
            // Found subscription, stop polling
            return;
          }
        } catch {
          // Ignore polling errors
        }
        if (attempts < maxAttempts) {
          setTimeout(poll, pollInterval);
        }
      };
      // Start polling after a short delay to allow webhook to process
      setTimeout(poll, 2000);
      return;
    } catch (err) {
      console.error('[SlyxUp] checkout failed', err);
    } finally {
      setCheckoutId(null);
    }
  }

  if (!isLoaded) return <div className="slx-card" aria-busy="true" />;
  if (!user) return null;

  const emailVerified = user.emailVerified;
  const name = displayName(
    user as { firstName: string | null; lastName: string | null; email: string }
  );

  // Resolve current plan name via plans lookup if subscription has planId but no planName
  const currentPlan = subscription
    ? (plans.find((p) => p.id === subscription.planId) ?? null)
    : null;
  const resolvedPlanName = subscription?.planName ?? currentPlan?.name ?? null;

  const bodyInner = (
    <>
      <div className="slx-profile-head">
        <h2 className="slx-profile-title">Account settings</h2>
        {modal && (
          <button
            type="button"
            className="slx-profile-close"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            aria-label="Close account settings"
          >
            ✕
          </button>
        )}
      </div>

      <div className="slx-profile-body">
        <nav className="slx-profile-nav" aria-label="Settings sections">
          <button
            type="button"
            className={`slx-profile-nav-btn${tab === 'profile' ? ' on' : ''}`}
            onClick={() => setTab('profile')}
            aria-current={tab === 'profile' ? 'page' : undefined}
          >
            <ProfileIcon /> Profile
          </button>
          <button
            type="button"
            className={`slx-profile-nav-btn${tab === 'security' ? ' on' : ''}`}
            onClick={() => setTab('security')}
            aria-current={tab === 'security' ? 'page' : undefined}
          >
            <ShieldIcon /> Security
          </button>
          <button
            type="button"
            className={`slx-profile-nav-btn${tab === 'billing' ? ' on' : ''}`}
            onClick={() => setTab('billing')}
            aria-current={tab === 'billing' ? 'page' : undefined}
          >
            <CreditCardIcon /> Billing
          </button>
        </nav>

        <div className="slx-profile-content">
          {/* ── Profile Tab ── */}
          {tab === 'profile' && (
            <>
              <section className="slx-profile-sec">
                <div className="slx-avatar-row">
                  <div className="slx-avatar-lg" aria-hidden="true">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" />
                    ) : (
                      initials(
                        user as {
                          firstName: string | null;
                          lastName: string | null;
                          email: string;
                        }
                      )
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p
                      className="slx-row-value"
                      style={{ margin: 0, wordBreak: 'break-word' }}
                    >
                      {name}
                    </p>
                    <p
                      className="slx-row-label"
                      style={{ wordBreak: 'break-all' }}
                    >
                      {user.email}
                    </p>
                  </div>
                </div>

                {saved && (
                  <p
                    className="slx-error-text"
                    style={{ color: 'var(--slx-success)' }}
                  >
                    Profile saved.
                  </p>
                )}

                <form onSubmit={onProfileSubmit}>
                  <div className="slx-field">
                    <label className="slx-label" htmlFor="slx-up-first">
                      First name
                    </label>
                    <input
                      id="slx-up-first"
                      className="slx-input"
                      type="text"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="slx-field">
                    <label className="slx-label" htmlFor="slx-up-last">
                      Last name
                    </label>
                    <input
                      id="slx-up-last"
                      className="slx-input"
                      type="text"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                  <div className="slx-field">
                    <label className="slx-label" htmlFor="slx-up-avatar">
                      Avatar URL
                    </label>
                    <input
                      id="slx-up-avatar"
                      className="slx-input"
                      type="url"
                      placeholder="https://…"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                    />
                    <p className="slx-hint">
                      Paste a public image URL for your avatar.
                    </p>
                  </div>
                  <button className="slx-btn" type="submit" disabled={busy}>
                    {busy ? 'Saving…' : 'Save changes'}
                  </button>
                </form>
              </section>

              <section className="slx-profile-sec">
                <h3 className="slx-sec-title">Email</h3>
                <div className="slx-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <p
                      className="slx-row-value"
                      style={{ wordBreak: 'break-all' }}
                    >
                      {user.email}
                    </p>
                    <p className="slx-row-label">Primary email</p>
                  </div>
                  {emailVerified ? (
                    <span className="slx-badge slx-badge-ok">Verified</span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span className="slx-badge slx-badge-warn">
                        Unverified
                      </span>
                      <button
                        type="button"
                        className="slx-link"
                        onClick={onResendVerification}
                        disabled={resending}
                      >
                        {resending ? 'Sending…' : resent ? 'Sent ✓' : 'Resend'}
                      </button>
                    </span>
                  )}
                </div>
              </section>
            </>
          )}

          {/* ── Security Tab ── */}
          {tab === 'security' && (
            <>
              <section className="slx-profile-sec">
                <h3 className="slx-sec-title">Change password</h3>
                {pwSaved && (
                  <p
                    className="slx-error-text"
                    style={{ color: 'var(--slx-success)' }}
                  >
                    Password updated.
                  </p>
                )}
                {pwError && <p className="slx-error-text">{pwError}</p>}
                <form onSubmit={onPasswordSubmit}>
                  <div className="slx-field">
                    <label className="slx-label" htmlFor="slx-pw-current">
                      Current password
                    </label>
                    <input
                      id="slx-pw-current"
                      className="slx-input"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="slx-field">
                    <label className="slx-label" htmlFor="slx-pw-new">
                      New password
                    </label>
                    <input
                      id="slx-pw-new"
                      className="slx-input"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <p className="slx-hint">At least 8 characters.</p>
                  </div>
                  <div className="slx-field">
                    <label className="slx-label" htmlFor="slx-pw-confirm">
                      Confirm new password
                    </label>
                    <input
                      id="slx-pw-confirm"
                      className="slx-input"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button className="slx-btn" type="submit" disabled={pwBusy}>
                    {pwBusy ? 'Updating…' : 'Update password'}
                  </button>
                </form>
              </section>

              <section className="slx-profile-sec">
                <h3 className="slx-sec-title">Active sessions</h3>
                {sessionsLoading ? (
                  <p className="slx-hint">Loading sessions…</p>
                ) : sessions.length === 0 ? (
                  <p className="slx-hint">No active sessions.</p>
                ) : (
                  <>
                    {sessions.map((s) => (
                      <div key={s.id} className="slx-session">
                        <div className="slx-session-meta">
                          <p className="slx-session-device">
                            {deviceLabel(s.userAgent)}
                            {s.isCurrent && (
                              <span className="slx-badge slx-badge-accent">
                                This device
                              </span>
                            )}
                          </p>
                          <p className="slx-session-sub">
                            {[
                              s.ipAddress,
                              `created ${formatDate(s.createdAt)}`,
                              `expires ${formatDate(s.expiresAt)}`,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                        {!s.isCurrent && (
                          <button
                            type="button"
                            className="slx-btn-danger-outline"
                            onClick={() => onRevoke(s.id)}
                            disabled={revokingId === s.id}
                          >
                            {revokingId === s.id ? '…' : 'Revoke'}
                          </button>
                        )}
                      </div>
                    ))}
                    {sessions.some((s) => !s.isCurrent) && (
                      <button
                        type="button"
                        className="slx-btn-danger-outline"
                        style={{ width: '100%', marginTop: 4 }}
                        onClick={onRevokeOthers}
                        disabled={othersRevoking}
                      >
                        {othersRevoking
                          ? 'Signing out…'
                          : 'Sign out other devices'}
                      </button>
                    )}
                    {sessionsTotal > SESSIONS_PER_PAGE && (
                      <div className="slx-pagination">
                        <button
                          type="button"
                          className="slx-btn-secondary"
                          disabled={sessionsPage === 0 || sessionsLoading}
                          onClick={() => void loadSessions(sessionsPage - 1)}
                        >
                          Previous
                        </button>
                        <span className="slx-pagination-info">
                          {sessionsPage * SESSIONS_PER_PAGE + 1}–
                          {Math.min(
                            (sessionsPage + 1) * SESSIONS_PER_PAGE,
                            sessionsTotal
                          )}{' '}
                          of {sessionsTotal}
                        </span>
                        <button
                          type="button"
                          className="slx-btn-secondary"
                          disabled={
                            (sessionsPage + 1) * SESSIONS_PER_PAGE >=
                              sessionsTotal || sessionsLoading
                          }
                          onClick={() => void loadSessions(sessionsPage + 1)}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>

              <section className="slx-danger-zone">
                <p className="slx-danger-title">Danger zone</p>
                <p className="slx-danger-desc">
                  Permanently deletes your account and all associated data.
                  Active sessions are revoked immediately. This cannot be
                  undone.
                </p>
                {deleteError && <p className="slx-error-text">{deleteError}</p>}
                <div className="slx-field">
                  <label className="slx-label" htmlFor="slx-del-confirm">
                    Type <strong>DELETE</strong> to confirm
                  </label>
                  <input
                    id="slx-del-confirm"
                    className="slx-input"
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE"
                  />
                </div>
                <button
                  type="button"
                  className="slx-btn"
                  style={{
                    background: 'var(--slx-danger)',
                    borderColor: 'var(--slx-danger)',
                  }}
                  onClick={onDeleteAccount}
                  disabled={confirmText !== 'DELETE' || deleteBusy}
                >
                  {deleteBusy ? 'Deleting…' : 'Delete my account forever'}
                </button>
              </section>
            </>
          )}

          {/* ── Billing Tab ── */}
          {tab === 'billing' &&
            (billingLoading ? (
              <section className="slx-profile-sec">
                <p className="slx-hint">Loading billing information…</p>
              </section>
            ) : !subscription ? (
              <>
                <section className="slx-profile-sec">
                  <h3 className="slx-sec-title">Subscription</h3>
                  {checkoutDone && (
                    <p
                      className="slx-error-text"
                      style={{ color: 'var(--slx-success)', marginBottom: 8 }}
                    >
                      Checkout opened — complete your payment in the overlay.
                    </p>
                  )}
                  <div className="slx-billing-card">
                    <p className="slx-billing-plan">No active subscription</p>
                    <p className="slx-billing-detail">
                      You don&apos;t have a subscription yet. Choose a plan to
                      get started.
                    </p>
                  </div>
                </section>

                <section className="slx-profile-sec">
                  <h3 className="slx-sec-title">Available plans</h3>
                  {plansLoading ? (
                    <p className="slx-hint">Loading plans…</p>
                  ) : plans.length === 0 ? (
                    <div
                      className="slx-billing-card"
                      style={{ textAlign: 'center' }}
                    >
                      <p className="slx-billing-detail">
                        No plans configured for this project yet.
                      </p>
                      <p className="slx-hint" style={{ marginTop: 6 }}>
                        Ask your admin to create a plan in billing.
                      </p>
                    </div>
                  ) : (
                    <div className="slx-billing-plans">
                      {plans.map((plan) => (
                        <div
                          key={plan.id}
                          className={`slx-plan-card${plan.isPopular ? ' popular' : ''}`}
                        >
                          {plan.isPopular && (
                            <span className="slx-plan-badge">POPULAR</span>
                          )}
                          <p className="slx-plan-name">{plan.name}</p>
                          <p style={{ margin: '2px 0 0' }}>
                            <span className="slx-plan-price">
                              {formatCurrency(plan.amount, plan.currency)}
                            </span>
                            <span className="slx-plan-interval">
                              /{plan.interval}
                            </span>
                          </p>
                          {plan.trialDays ? (
                            <p
                              className="slx-billing-detail"
                              style={{
                                color: 'var(--slx-accent)',
                                marginTop: 4,
                              }}
                            >
                              {plan.trialDays} day free trial
                            </p>
                          ) : (
                            <p
                              className="slx-billing-detail"
                              style={{ visibility: 'hidden', marginTop: 4 }}
                            >
                              &nbsp;
                            </p>
                          )}
                          <ul className="slx-plan-features">
                            {(plan.features ?? []).map((f) => (
                              <li key={f}>{f}</li>
                            ))}
                          </ul>
                          <button
                            type="button"
                            className="slx-btn slx-plan-cta"
                            onClick={() => handleCheckout(plan)}
                            disabled={checkoutId === plan.id}
                          >
                            {checkoutId === plan.id
                              ? 'Redirecting…'
                              : 'Choose plan'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {invoices.length > 0 && (
                  <section className="slx-profile-sec">
                    <h3 className="slx-sec-title">Invoices</h3>
                    {invoices.map((inv) => (
                      <div key={inv.id} className="slx-invoice-row">
                        <span className="slx-invoice-date">
                          {inv.billedAt ? formatDate(inv.billedAt) : '—'}
                        </span>
                        <span className="slx-invoice-amount">
                          {formatCurrency(inv.amount, inv.currency)}
                        </span>
                        <span
                          className={`slx-badge ${
                            inv.status === 'paid'
                              ? 'slx-badge-ok'
                              : inv.status === 'overdue'
                                ? 'slx-badge-warn'
                                : 'slx-badge-accent'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                    ))}
                  </section>
                )}
              </>
            ) : (
              <>
                <section className="slx-profile-sec">
                  <h3 className="slx-sec-title">Current plan</h3>
                  <div className="slx-billing-card">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p className="slx-billing-plan">
                          {resolvedPlanName ?? 'Subscription'}
                        </p>
                        <p className="slx-billing-detail">
                          Status:{' '}
                          <span
                            className={`slx-billing-status slx-billing-status-${subscription.status}`}
                          >
                            {subscription.status}
                          </span>
                        </p>
                        {subscription.currentPeriodEnd && (
                          <p className="slx-billing-detail">
                            {subscription.cancelAtPeriodEnd
                              ? `Cancels ${formatDate(subscription.currentPeriodEnd)}`
                              : `Renews ${formatDate(subscription.currentPeriodEnd)}`}
                          </p>
                        )}
                        {subscription.cancelAtPeriodEnd && (
                          <p
                            className="slx-billing-detail"
                            style={{
                              color: 'var(--slx-danger)',
                              fontWeight: 600,
                            }}
                          >
                            Scheduled to cancel at period end
                          </p>
                        )}
                      </div>
                      {currentPlan && (
                        <span
                          className="slx-badge slx-badge-accent"
                          style={{ flexShrink: 0 }}
                        >
                          {formatCurrency(
                            currentPlan.amount,
                            currentPlan.currency
                          )}
                          /{currentPlan.interval}
                        </span>
                      )}
                    </div>
                    {currentPlan?.features &&
                      currentPlan.features.length > 0 && (
                        <ul
                          className="slx-plan-features"
                          style={{ margin: '12px 0 0' }}
                        >
                          {currentPlan.features.map((f) => (
                            <li key={f}>{f}</li>
                          ))}
                        </ul>
                      )}
                    <div className="slx-billing-actions">
                      <button
                        type="button"
                        className="slx-btn-secondary"
                        onClick={() => void loadBilling()}
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                </section>

                {/* Upgrade / Downgrade plans */}
                {plansLoading ? (
                  <section className="slx-profile-sec">
                    <p className="slx-hint">Loading available plans…</p>
                  </section>
                ) : plans.length > 0 ? (
                  <section className="slx-profile-sec">
                    <h3 className="slx-sec-title">Available plans</h3>
                    <p className="slx-hint" style={{ marginBottom: 8 }}>
                      Switch plans anytime. Changes apply at the next billing
                      cycle.
                    </p>
                    <div className="slx-billing-plans">
                      {plans.map((plan) => {
                        const isCurrent = subscription.planId
                          ? subscription.planId === plan.id
                          : resolvedPlanName === plan.name;
                        const currentAmount = currentPlan?.amount ?? 0;
                        const isUpgrade = plan.amount > currentAmount;
                        const isDowngrade =
                          plan.amount < currentAmount && !isCurrent;
                        return (
                          <div
                            key={plan.id}
                            className={`slx-plan-card${plan.isPopular ? ' popular' : ''}`}
                            style={isCurrent ? { opacity: 0.92 } : undefined}
                          >
                            {plan.isPopular && !isCurrent && (
                              <span className="slx-plan-badge">POPULAR</span>
                            )}
                            {isCurrent && (
                              <span
                                className="slx-plan-badge"
                                style={{ background: 'var(--slx-success)' }}
                              >
                                CURRENT
                              </span>
                            )}
                            <p className="slx-plan-name">{plan.name}</p>
                            <p style={{ margin: '2px 0 0' }}>
                              <span className="slx-plan-price">
                                {formatCurrency(plan.amount, plan.currency)}
                              </span>
                              <span className="slx-plan-interval">
                                /{plan.interval}
                              </span>
                            </p>
                            {plan.trialDays ? (
                              <p
                                className="slx-billing-detail"
                                style={{
                                  color: 'var(--slx-accent)',
                                  marginTop: 4,
                                }}
                              >
                                {plan.trialDays} day trial
                              </p>
                            ) : (
                              <p
                                className="slx-billing-detail"
                                style={{ visibility: 'hidden', marginTop: 4 }}
                              >
                                &nbsp;
                              </p>
                            )}
                            <ul className="slx-plan-features">
                              {(plan.features ?? []).map((f) => (
                                <li key={f}>{f}</li>
                              ))}
                            </ul>
                            <button
                              type="button"
                              className={
                                isCurrent
                                  ? 'slx-btn-secondary slx-plan-cta'
                                  : 'slx-btn slx-plan-cta'
                              }
                              disabled={isCurrent || checkoutId === plan.id}
                              onClick={() => handleCheckout(plan)}
                            >
                              {isCurrent
                                ? 'Current plan'
                                : checkoutId === plan.id
                                  ? 'Redirecting…'
                                  : isUpgrade
                                    ? 'Upgrade'
                                    : isDowngrade
                                      ? 'Downgrade'
                                      : 'Switch plan'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {invoices.length > 0 && (
                  <section className="slx-profile-sec">
                    <h3 className="slx-sec-title">Invoices</h3>
                    {invoices.map((inv) => (
                      <div key={inv.id} className="slx-invoice-row">
                        <span className="slx-invoice-date">
                          {inv.billedAt ? formatDate(inv.billedAt) : '—'}
                        </span>
                        <span className="slx-invoice-amount">
                          {formatCurrency(inv.amount, inv.currency)}
                        </span>
                        <span
                          className={`slx-badge ${
                            inv.status === 'paid'
                              ? 'slx-badge-ok'
                              : inv.status === 'overdue'
                                ? 'slx-badge-warn'
                                : 'slx-badge-accent'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                    ))}
                  </section>
                )}
              </>
            ))}
        </div>
      </div>
    </>
  );

  if (!modal) {
    return (
      <div className="slx-profile-modal" style={{ maxHeight: 'none' }}>
        {bodyInner}
      </div>
    );
  }

  // Modal overlay — click on backdrop closes, click inside modal does not.
  // Use onMouseDown + onClick for desktop + mobile reliability; close button also works via stopPropagation.
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: overlay click is for mouse; keyboard Escape handled in effect
    <div
      className="slx-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="presentation"
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation only, no keyboard action needed */}
      {/* biome-ignore lint/a11y/useSemanticElements: dialog is correct for modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Account settings"
        className="slx-profile-modal"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {bodyInner}
      </div>
    </div>
  );
}

function ProfileIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}
