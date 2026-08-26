'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Nav, Footer } from '../../../components/chrome';
import { SITE_CSS } from '../../../lib/site-css';

const API =
  process.env.NEXT_PUBLIC_SLYXUP_API_URL ?? 'https://auth.slyxup.online';

interface Stats {
  users: { total: number; verified: number; blocked: number; admins: number };
  activeSessions: number;
  projects: number;
}
interface UserRow {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  emailVerified: boolean;
  blocked: boolean;
  createdAt?: string;
}

async function adminCall<T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    const err = new Error(
      (data.error as string) ?? `Request failed (${res.status})`
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('slyxup_admin_token');
    if (t) setToken(t);
  }, []);

  async function loadAll(t: string) {
    try {
      const [s, u] = await Promise.all([
        adminCall<Stats>(t, '/v1/admin/stats'),
        adminCall<{ users: UserRow[] }>(t, '/v1/admin/users?limit=100'),
      ]);
      setStats(s as unknown as Stats);
      setUsers(u.users);
    } catch (e) {
      if ((e as Error & { status?: number }).status === 403) {
        localStorage.removeItem('slyxup_admin_token');
        setToken(null);
        setErr('Admin access required. The first registered user is admin.');
      } else {
        setErr((e as Error).message);
      }
    }
  }

  useEffect(() => {
    if (token) void loadAll(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${API}/v1/auth/sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        sessionToken?: string;
        user?: { role?: string };
        error?: string;
      };
      if (!res.ok || !data.ok || !data.sessionToken)
        throw new Error(data.error ?? 'Sign in failed');
      if (data.user?.role !== 'admin')
        throw new Error('This account is not an admin.');
      localStorage.setItem('slyxup_admin_token', data.sessionToken);
      setToken(data.sessionToken);
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlock(u: UserRow) {
    if (!token) return;
    const path = u.blocked
      ? `/v1/admin/users/${u.id}/unblock`
      : `/v1/admin/users/${u.id}/block`;
    await adminCall(token, path, { method: 'POST', body: '{}' });
    void loadAll(token);
  }

  async function toggleRole(u: UserRow) {
    if (!token) return;
    await adminCall(token, `/v1/admin/users/${u.id}/role`, {
      method: 'POST',
      body: JSON.stringify({ role: u.role === 'admin' ? 'user' : 'admin' }),
    });
    void loadAll(token);
  }

  async function search(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    const u = await adminCall<{ users: UserRow[] }>(
      token,
      `/v1/admin/users?limit=100&q=${encodeURIComponent(q)}`
    );
    setUsers(u.users);
  }

  function logout() {
    localStorage.removeItem('slyxup_admin_token');
    setToken(null);
    setStats(null);
  }

  return (
    <>
      <style>{SITE_CSS + ADMIN_CSS}</style>
      <Nav />
      <div className="wrap" style={{ padding: '56px 24px 80px' }}>
        <div className="admin-head">
          <h1 className="display" style={{ fontSize: 36 }}>Admin Panel</h1>
          {token && (
            <button className="btn-secondary c-btn" onClick={logout}>Log out</button>
          )}
        </div>

        {!token ? (
          <div className="card console-auth">
            <form onSubmit={login} className="stack-form">
              <input className="cin" type="email" required placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="cin" type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              {err && <p className="c-err">{err}</p>}
              <button className="btn-primary btn-block" disabled={busy}>
                {busy ? '…' : 'Sign in as admin'}
              </button>
            </form>
            <p className="c-note">
              Only users with the <code>admin</code> role can access this panel.
              The first user who signs up on a fresh SlyxUp deployment becomes
              the admin automatically.
            </p>
          </div>
        ) : (
          <>
            {err && <p className="c-msg">{err}</p>}
            {stats && (
              <div className="stat-grid">
                <Stat label="Total users" value={stats.users.total} sub={`${stats.users.verified} verified`} />
                <Stat label="Active sessions" value={stats.activeSessions} />
                <Stat label="Projects" value={stats.projects} />
                <Stat label="Blocked / Admins" value={`${stats.users.blocked} / ${stats.users.admins}`} />
              </div>
            )}

            <section className="card atable-card">
              <div className="atable-head">
                <h3>Users</h3>
                <form onSubmit={search} style={{ display: 'flex', gap: 6 }}>
                  <input className="cin" placeholder="Search email…" value={q} onChange={(e) => setQ(e.target.value)} />
                  <button className="btn-secondary c-btn">Search</button>
                </form>
              </div>
              <table className="atable">
                <thead><tr><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.email}{!u.emailVerified && <span className="tag warn">unverified</span>}</td>
                      <td><span className={`tag ${u.role === 'admin' ? 'good' : ''}`}>{u.role}</span></td>
                      <td>{u.blocked ? <span className="tag bad">blocked</span> : <span className="tag good">active</span>}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn-secondary c-btn" onClick={() => void toggleRole(u)}>
                          {u.role === 'admin' ? 'Demote' : 'Promote'}
                        </button>{' '}
                        <button className="btn-secondary c-btn danger" onClick={() => void toggleBlock(u)}>
                          {u.blocked ? 'Unblock' : 'Block'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
      <Footer />
    </>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`card stat${accent ? ' stat-accent' : ''}`}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  );
}

const ADMIN_CSS = `
.admin-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:26px; }
.stat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px; margin-bottom:20px; }
.stat { padding:16px 18px; }
.stat-accent { border-color:rgba(52,211,153,.35); background:rgba(52,211,153,.05); }
.stat-label { font-size:11.5px; color:#5b6070; text-transform:uppercase; letter-spacing:.08em; margin-bottom:4px; }
.stat-value { font-family:"Space Grotesk",sans-serif; font-size:24px; font-weight:650; color:#fff; }
.stat-sub { font-size:11.5px; color:#7c8195; margin-top:2px; }
.atable-card { padding:20px; margin-bottom:16px; overflow-x:auto; }
.atable-head { display:flex; justify-content:space-between; align-items:center; gap:14px; margin-bottom:12px; flex-wrap:wrap; }
.atable h3 { font-family:"Space Grotesk",sans-serif; margin-bottom:10px; }
.atable { width:100%; border-collapse:collapse; font-size:13px; }
.atable th { text-align:left; color:#5b6070; font-weight:500; font-size:11.5px; text-transform:uppercase; letter-spacing:.06em; padding:8px 10px; border-bottom:1px solid rgba(255,255,255,.08); }
.atable td { padding:9px 10px; border-bottom:1px solid rgba(255,255,255,.04); vertical-align:middle; }
.tag { display:inline-block; font-size:11px; padding:2px 8px; border-radius:999px; border:1px solid rgba(255,255,255,.15); color:#a5b4fc; }
.tag.good { color:#34d399; border-color:rgba(52,211,153,.4); }
.tag.bad { color:#f0737d; border-color:rgba(240,115,125,.4); }
.tag.warn { color:#fde047; border-color:rgba(250,204,21,.4); }
.tiny { font-size:11px; color:#7c8195; }
`;
