'use client';

import { SlyxupClient } from '@slyxup/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { injectStyles } from '../../styles';

export interface AdminPanelProps {
  /** Secret key — sk_test_xxx / sk_live_xxx */
  secretKey: string;
  /** API base URL (default: https://auth.slyxup.online) */
  apiUrl?: string;
  /** Render as full-page (default) or inline */
  fullPage?: boolean;
}

type Tab = 'overview' | 'users' | 'sessions' | 'keys';

interface Project {
  id: string;
  name: string;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  blocked: boolean;
  createdAt: string;
}

interface Session {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  isExpired: boolean;
  createdAt: string;
}

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  environment: string;
  type: string;
  lastUsedAt: string | null;
  createdAt: string;
}

function displayName(u: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const parts = [u.firstName?.trim(), u.lastName?.trim()].filter(Boolean);
  return parts.join(' ') || u.email;
}

function initials(u: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const f = u.firstName?.trim();
  const l = u.lastName?.trim();
  if (f && l) return (f[0] + l[0]).toUpperCase();
  if (f) return f.slice(0, 1).toUpperCase();
  if (l) return l.slice(0, 1).toUpperCase();
  return u.email.slice(0, 1).toUpperCase();
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'users', label: 'Users', icon: '👥' },
  { key: 'sessions', label: 'Sessions', icon: '🔐' },
  { key: 'keys', label: 'API Keys', icon: '🔑' },
];

export function AdminPanel({
  secretKey,
  apiUrl,
  fullPage = true,
}: AdminPanelProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState<'publishable' | 'secret'>(
    'secret'
  );
  const [newKeyEnv, setNewKeyEnv] = useState<'test' | 'live'>('test');
  const [createdKeyValue, setCreatedKeyValue] = useState<string | null>(null);

  const client = useMemo(
    () => new SlyxupClient({ secretKey, apiUrl }),
    [secretKey, apiUrl]
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, u, s, k] = await Promise.all([
        client.admin.getProject(),
        client.admin.listUsers({ limit: 100 }),
        client.admin.listSessions(),
        client.admin.listKeys(),
      ]);
      setProject(p.project);
      setUsers(u.users);
      setSessions(s.sessions);
      setKeys(k.keys);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to load admin data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleCreateKey = useCallback(async () => {
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const res = await client.admin.createKey({
        name: newKeyName.trim(),
        type: newKeyType,
        environment: newKeyEnv,
      });
      setCreatedKeyValue(res.key);
      setNewKeyName('');
      const k = await client.admin.listKeys();
      setKeys(k.keys);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create key';
      setError(msg);
    } finally {
      setCreatingKey(false);
    }
  }, [client, newKeyName, newKeyType, newKeyEnv]);

  const handleRevokeKey = useCallback(
    async (keyId: string) => {
      try {
        await client.admin.revokeKey(keyId);
        const k = await client.admin.listKeys();
        setKeys(k.keys);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to revoke key';
        setError(msg);
      }
    },
    [client]
  );

  const activeSessions = sessions.filter((s) => !s.isExpired);
  const totalKeys = keys.length;
  const secretKeys = keys.filter((k) => k.type === 'secret');

  injectStyles();

  const scopeStyle: React.CSSProperties = fullPage
    ? {
        minHeight: '100vh',
        background: 'var(--slx-bg-page, #f4f4f5)',
        padding: '32px 24px',
      }
    : {
        background: 'var(--slx-bg, #fff)',
        borderRadius: 'var(--slx-radius-lg, 14px)',
        border: '1px solid var(--slx-border, #e4e4e7)',
        padding: 24,
      };

  return (
    <div className="slyxup-root" style={scopeStyle}>
      <style>{`
        .slx-admin-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .slx-admin-stat { background: var(--slx-bg, #fff); border: 1px solid var(--slx-border, #e4e4e7); border-radius: var(--slx-radius, 10px); padding: 20px; }
        .slx-admin-stat-value { font-size: 28px; font-weight: 700; color: var(--slx-ink, #16161d); font-family: var(--slx-display, inherit); }
        .slx-admin-stat-label { font-size: 13px; color: var(--slx-muted, #71717a); margin-top: 4px; font-weight: 500; }
        .slx-admin-tabs { display: flex; gap: 4px; background: var(--slx-bg-subtle, #f4f4f5); border-radius: var(--slx-radius, 10px); padding: 4px; margin-bottom: 24px; width: fit-content; }
        .slx-admin-tab { padding: 8px 16px; border-radius: 8px; border: none; background: transparent; color: var(--slx-muted, #71717a); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: var(--slx-font, inherit); }
        .slx-admin-tab:hover { color: var(--slx-ink, #16161d); }
        .slx-admin-tab--active { background: var(--slx-bg, #fff); color: var(--slx-ink, #16161d); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
        .slx-admin-card { background: var(--slx-bg, #fff); border: 1px solid var(--slx-border, #e4e4e7); border-radius: var(--slx-radius-lg, 14px); padding: 24px; margin-bottom: 16px; }
        .slx-admin-card-title { font-size: 16px; font-weight: 600; color: var(--slx-ink, #16161d); margin-bottom: 16px; }
        .slx-admin-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: var(--slx-radius-sm, 8px); border: 1px solid var(--slx-border, #e4e4e7); margin-bottom: 8px; transition: border-color 0.15s; }
        .slx-admin-row:hover { border-color: var(--slx-border-strong, #d1d5db); }
        .slx-admin-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
        .slx-admin-badge--green { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
        .slx-admin-badge--yellow { background: rgba(234, 179, 8, 0.12); color: #ca8a04; }
        .slx-admin-badge--red { background: rgba(239, 68, 68, 0.12); color: #dc2626; }
        .slx-admin-badge--blue { background: rgba(59, 130, 246, 0.12); color: #2563eb; }
        .slx-admin-badge--gray { background: rgba(113, 113, 122, 0.12); color: #71717a; }
        .slx-admin-avatar { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; font-weight: 700; font-size: 13px; color: #fff; flex-shrink: 0; }
        .slx-admin-empty { text-align: center; padding: 48px 24px; color: var(--slx-muted, #71717a); font-size: 14px; }
        .slx-admin-input { padding: 10px 14px; border-radius: var(--slx-radius-sm, 8px); border: 1px solid var(--slx-border, #e4e4e7); background: var(--slx-bg, #fff); color: var(--slx-ink, #16161d); font-size: 14px; font-family: var(--slx-font, inherit); outline: none; width: 100%; transition: border-color 0.15s; box-sizing: border-box; }
        .slx-admin-input:focus { border-color: var(--slx-accent, #5b5bd6); }
        .slx-admin-select { padding: 10px 14px; border-radius: var(--slx-radius-sm, 8px); border: 1px solid var(--slx-border, #e4e4e7); background: var(--slx-bg, #fff); color: var(--slx-ink, #16161d); font-size: 14px; font-family: var(--slx-font, inherit); outline: none; cursor: pointer; }
        .slx-admin-btn { padding: 10px 20px; border-radius: var(--slx-radius-sm, 8px); border: none; font-size: 14px; font-weight: 600; cursor: pointer; font-family: var(--slx-font, inherit); transition: all 0.15s; }
        .slx-admin-btn--primary { background: var(--slx-accent, #5b5bd6); color: #fff; }
        .slx-admin-btn--primary:hover { background: var(--slx-accent-hover, #4c4cc4); }
        .slx-admin-btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .slx-admin-btn--danger { background: transparent; color: var(--slx-danger, #d64550); border: 1px solid var(--slx-danger, #d64550); }
        .slx-admin-btn--danger:hover { background: rgba(214, 69, 80, 0.08); }
        .slx-admin-btn--ghost { background: transparent; color: var(--slx-muted, #71717a); border: 1px solid var(--slx-border, #e4e4e7); }
        .slx-admin-btn--ghost:hover { background: var(--slx-bg-subtle, #f4f4f5); }
        .slx-admin-create-form { display: flex; gap: 8px; align-items: end; flex-wrap: wrap; margin-bottom: 16px; }
        .slx-admin-create-field { display: flex; flex-direction: column; gap: 4px; }
        .slx-admin-create-label { font-size: 12px; font-weight: 600; color: var(--slx-muted, #71717a); text-transform: uppercase; letter-spacing: 0.5px; }
        .slx-admin-key-display { background: var(--slx-bg-subtle, #f4f4f5); border: 1px solid var(--slx-border, #e4e4e7); border-radius: var(--slx-radius-sm, 8px); padding: 12px 16px; margin-bottom: 16px; font-family: var(--slx-mono, monospace); font-size: 13px; word-break: break-all; color: var(--slx-ink, #16161d); }
        .slx-admin-loading { display: flex; justify-content: center; align-items: center; padding: 64px; }
        .slx-admin-spinner { width: 32px; height: 32px; border: 3px solid var(--slx-border, #e4e4e7); border-top-color: var(--slx-accent, #5b5bd6); border-radius: 50%; animation: slx-spin 0.6s linear infinite; }
        @keyframes slx-spin { to { transform: rotate(360deg); } }
        .slx-admin-error { background: rgba(214, 69, 80, 0.08); border: 1px solid rgba(214, 69, 80, 0.2); border-radius: var(--slx-radius-sm, 8px); padding: 12px 16px; margin-bottom: 16px; color: var(--slx-danger, #d64550); font-size: 14px; }
        @media (max-width: 640px) {
          .slx-admin-grid { grid-template-columns: 1fr 1fr; }
          .slx-admin-tabs { width: 100%; overflow-x: auto; }
          .slx-admin-create-form { flex-direction: column; align-items: stretch; }
          .slx-admin-create-field { width: 100%; }
          .slx-admin-row { flex-direction: column; align-items: flex-start; gap: 8px; }
        }
      `}</style>

      {error && (
        <div
          className="slx-admin-error"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            className="slx-admin-btn slx-admin-btn--ghost"
            style={{ padding: '4px 12px', fontSize: 12 }}
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="slx-admin-loading">
          <div className="slx-admin-spinner" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: 'var(--slx-ink, #16161d)',
                fontFamily: 'var(--slx-display, inherit)',
                margin: 0,
              }}
            >
              Admin Dashboard
            </h1>
            {project && (
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--slx-muted, #71717a)',
                  marginTop: 4,
                }}
              >
                {project.name}
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="slx-admin-tabs">
            {TABS.map((t) => (
              <button
                type="button"
                key={t.key}
                className={`slx-admin-tab ${tab === t.key ? 'slx-admin-tab--active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          {tab === 'overview' && (
            <div className="slx-admin-grid">
              <div className="slx-admin-stat">
                <div className="slx-admin-stat-value">{users.length}</div>
                <div className="slx-admin-stat-label">Total Users</div>
              </div>
              <div className="slx-admin-stat">
                <div className="slx-admin-stat-value">
                  {activeSessions.length}
                </div>
                <div className="slx-admin-stat-label">Active Sessions</div>
              </div>
              <div className="slx-admin-stat">
                <div className="slx-admin-stat-value">{totalKeys}</div>
                <div className="slx-admin-stat-label">API Keys</div>
              </div>
              <div className="slx-admin-stat">
                <div className="slx-admin-stat-value">
                  {users.filter((u) => u.emailVerified).length}
                </div>
                <div className="slx-admin-stat-label">Verified Users</div>
              </div>
              <div className="slx-admin-stat">
                <div className="slx-admin-stat-value">
                  {users.filter((u) => u.blocked).length}
                </div>
                <div className="slx-admin-stat-label">Blocked Users</div>
              </div>
              <div className="slx-admin-stat">
                <div className="slx-admin-stat-value">{secretKeys.length}</div>
                <div className="slx-admin-stat-label">Secret Keys</div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="slx-admin-card">
              <div className="slx-admin-card-title">Users ({users.length})</div>
              {users.length === 0 ? (
                <div className="slx-admin-empty">No users found.</div>
              ) : (
                users.map((u) => (
                  <div key={u.id} className="slx-admin-row">
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <div
                        className="slx-admin-avatar"
                        style={{
                          background: `hsl(${(u.email.charCodeAt(0) * 37) % 360}, 55%, 50%)`,
                        }}
                      >
                        {initials(u)}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: 'var(--slx-ink, #16161d)',
                          }}
                        >
                          {displayName(u)}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--slx-muted, #71717a)',
                          }}
                        >
                          {u.email}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                    >
                      {u.emailVerified ? (
                        <span className="slx-admin-badge slx-admin-badge--green">
                          Verified
                        </span>
                      ) : (
                        <span className="slx-admin-badge slx-admin-badge--yellow">
                          Unverified
                        </span>
                      )}
                      {u.blocked && (
                        <span className="slx-admin-badge slx-admin-badge--red">
                          Blocked
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--slx-muted, #71717a)',
                          marginLeft: 4,
                        }}
                      >
                        {timeAgo(u.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'sessions' && (
            <div className="slx-admin-card">
              <div className="slx-admin-card-title">
                Sessions ({activeSessions.length} active)
              </div>
              {activeSessions.length === 0 ? (
                <div className="slx-admin-empty">No active sessions.</div>
              ) : (
                activeSessions.map((s) => {
                  const u = users.find((u) => u.id === s.userId);
                  return (
                    <div key={s.id} className="slx-admin-row">
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: 'var(--slx-ink, #16161d)',
                          }}
                        >
                          {u ? displayName(u) : `${s.userId.slice(0, 8)}...`}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--slx-muted, #71717a)',
                          }}
                        >
                          {s.userAgent
                            ? s.userAgent.slice(0, 60) +
                              (s.userAgent.length > 60 ? '...' : '')
                            : 'No user agent'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--slx-muted, #71717a)',
                          }}
                        >
                          Expires {timeAgo(s.expiresAt)}
                        </div>
                        {s.ipAddress && (
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--slx-muted, #a1a1aa)',
                            }}
                          >
                            {s.ipAddress}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'keys' && (
            <div className="slx-admin-card">
              <div className="slx-admin-card-title">
                API Keys ({keys.length})
              </div>

              {/* Create form */}
              <div className="slx-admin-create-form">
                <div
                  className="slx-admin-create-field"
                  style={{ flex: 2, minWidth: 160 }}
                >
                  <label
                    className="slx-admin-create-label"
                    htmlFor="slx-admin-key-name"
                  >
                    Name
                  </label>
                  <input
                    id="slx-admin-key-name"
                    className="slx-admin-input"
                    placeholder="e.g. Production Key"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                  />
                </div>
                <div
                  className="slx-admin-create-field"
                  style={{ minWidth: 120 }}
                >
                  <label
                    className="slx-admin-create-label"
                    htmlFor="slx-admin-key-type"
                  >
                    Type
                  </label>
                  <select
                    id="slx-admin-key-type"
                    className="slx-admin-select"
                    value={newKeyType}
                    onChange={(e) =>
                      setNewKeyType(e.target.value as 'publishable' | 'secret')
                    }
                  >
                    <option value="secret">Secret (sk)</option>
                    <option value="publishable">Publishable (pk)</option>
                  </select>
                </div>
                <div
                  className="slx-admin-create-field"
                  style={{ minWidth: 100 }}
                >
                  <label
                    className="slx-admin-create-label"
                    htmlFor="slx-admin-key-env"
                  >
                    Env
                  </label>
                  <select
                    id="slx-admin-key-env"
                    className="slx-admin-select"
                    value={newKeyEnv}
                    onChange={(e) =>
                      setNewKeyEnv(e.target.value as 'test' | 'live')
                    }
                  >
                    <option value="test">Test</option>
                    <option value="live">Live</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="slx-admin-btn slx-admin-btn--primary"
                  onClick={handleCreateKey}
                  disabled={creatingKey || !newKeyName.trim()}
                  style={{ alignSelf: 'end' }}
                >
                  {creatingKey ? 'Creating...' : 'Create Key'}
                </button>
              </div>

              {createdKeyValue && (
                <div
                  className="slx-admin-key-display"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{createdKeyValue}</span>
                  <button
                    type="button"
                    className="slx-admin-btn slx-admin-btn--ghost"
                    style={{
                      padding: '4px 12px',
                      fontSize: 12,
                      flexShrink: 0,
                      marginLeft: 12,
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText(createdKeyValue);
                    }}
                  >
                    Copy
                  </button>
                </div>
              )}

              {keys.length === 0 ? (
                <div className="slx-admin-empty">
                  No API keys. Create one above.
                </div>
              ) : (
                keys.map((k) => (
                  <div key={k.id} className="slx-admin-row">
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: 'var(--slx-ink, #16161d)',
                        }}
                      >
                        {k.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--slx-muted, #71717a)',
                          fontFamily: 'var(--slx-mono, monospace)',
                        }}
                      >
                        {k.prefix}...
                      </div>
                    </div>
                    <div
                      style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                    >
                      <span
                        className={`slx-admin-badge ${k.type === 'secret' ? 'slx-admin-badge--red' : 'slx-admin-badge--blue'}`}
                      >
                        {k.type}
                      </span>
                      <span className="slx-admin-badge slx-admin-badge--gray">
                        {k.environment}
                      </span>
                      {k.lastUsedAt && (
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--slx-muted, #71717a)',
                          }}
                        >
                          Used {timeAgo(k.lastUsedAt)}
                        </span>
                      )}
                      <button
                        type="button"
                        className="slx-admin-btn slx-admin-btn--danger"
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => handleRevokeKey(k.id)}
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
