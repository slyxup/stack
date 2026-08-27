import type { SlyxupSessionInfo } from '@slyxup/core';
import { useAuth, useUser } from '@slyxup/react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { injectStyles } from '../../styles';

export interface UserProfileProps {
  /** Render as a centered modal overlay (default). Set false for inline usage. */
  modal?: boolean;
  onClose?: () => void;
  /** Called after the account is deleted — redirect or reset app state here. */
  onDeleted?: () => void;
}

type Tab = 'profile' | 'security' | 'billing';

function initials(user: { firstName: string | null; email: string }): string {
  const n = user.firstName?.trim();
  if (n) return n.slice(0, 1).toUpperCase();
  return user.email.slice(0, 1).toUpperCase();
}

function deviceLabel(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const os = /Windows/i.test(ua)
    ? 'Windows'
    : /Mac OS X|Macintosh/i.test(ua)
      ? 'macOS'
      : /Android/i.test(ua)
        ? 'Android'
        : /iPhone|iPad|iOS/i.test(ua)
          ? 'iOS'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Unknown OS';
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /Chrome\//i.test(ua)
      ? 'Chrome'
      : /Safari\//i.test(ua)
        ? 'Safari'
        : /Firefox\//i.test(ua)
          ? 'Firefox'
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
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
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

  // ── Billing state ──
  const [billingLoading, setBillingLoading] = useState(true);
  const [subscription, setSubscription] = useState<{
    id: string;
    status: string;
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

  // ── Danger zone state ──
  const [confirmText, setConfirmText] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
      setAvatarUrl(user.avatarUrl ?? '');
    }
  }, [user]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && modal) onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal, onClose]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await client.sessions.list();
      setSessions(res.sessions);
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [client]);

  const loadBilling = useCallback(async () => {
    setBillingLoading(true);
    try {
      const billingUrl =
        (client as unknown as { apiUrl: string }).apiUrl?.replace(
          'auth.slyxup.online',
          'billing.slyxup.online'
        ) ?? 'https://billing.slyxup.online';
      const token = (client as unknown as { _token?: string })?._token;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const [subRes, invRes] = await Promise.allSettled([
        fetch(`${billingUrl}/v1/subscription`, {
          headers,
          credentials: 'include',
        }),
        fetch(`${billingUrl}/v1/invoices`, { headers, credentials: 'include' }),
      ]);

      if (subRes.status === 'fulfilled' && subRes.value.ok) {
        const sub = await subRes.value.json();
        if (sub.ok) setSubscription(sub.subscription ?? null);
      }
      if (invRes.status === 'fulfilled' && invRes.value.ok) {
        const inv = await invRes.value.json();
        if (inv.ok) setInvoices(inv.invoices ?? []);
      }
    } catch {
      // Billing unavailable — show empty state
    } finally {
      setBillingLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (tab === 'security') void loadSessions();
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
      await loadSessions();
    } finally {
      setRevokingId(null);
    }
  }

  async function onRevokeOthers() {
    setOthersRevoking(true);
    try {
      await client.sessions.revokeOthers();
      await loadSessions();
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

  if (!isLoaded) return <div className="slx-card" aria-busy="true" />;
  if (!user) return null;

  const emailVerified = user.emailVerified;

  const body = (
    <div
      // biome-ignore lint/a11y/useSemanticElements: rendered inside a popover, not a top-level dialog
      role="dialog"
      aria-modal={modal || undefined}
      aria-label="Account settings"
    >
      <div className="slx-profile-head">
        <h2 className="slx-profile-title">Account settings</h2>
        {modal && (
          <button
            type="button"
            className="slx-profile-close"
            onClick={onClose}
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
                      initials(user)
                    )}
                  </div>
                  <div>
                    <p className="slx-row-value" style={{ margin: 0 }}>
                      {user.firstName
                        ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
                        : user.email}
                    </p>
                    <p className="slx-row-label">{user.email}</p>
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
                <div className="slx-row">
                  <div>
                    <p className="slx-row-value">{user.email}</p>
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
              <section className="slx-profile-sec">
                <h3 className="slx-sec-title">Subscription</h3>
                <div className="slx-billing-card">
                  <p className="slx-billing-plan">No active subscription</p>
                  <p className="slx-billing-detail">
                    You don&apos;t have a subscription yet. Choose a plan to get
                    started.
                  </p>
                </div>
              </section>
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
                      }}
                    >
                      <div>
                        <p className="slx-billing-plan">
                          {subscription.planName ?? 'Subscription'}
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
                      </div>
                    </div>
                  </div>
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
            ))}
        </div>
      </div>
    </div>
  );

  if (!modal) return body;

  return (
    <div
      className="slx-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {body}
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
