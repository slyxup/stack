'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../../../lib/dashboard-client';
import { useDev } from '../../../../../components/dashboard/AuthGate';

interface UserDetail {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  role: string;
  emailVerified: boolean;
  blocked: boolean;
  blockedReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
interface Profile {
  bio?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown> | null;
}
interface Detail {
  user: UserDetail;
  profile: Profile | null;
  sessionCount: number;
  oauthProviders: string[];
}

const fmt = (d?: string) => {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleString();
};

export default function UserDetailPage() {
  const dev = useDev();
  const params = useParams();
  const projectId = params.projectId as string;
  const userId = params.userId as string;

  const [data, setData] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');

  const base = `/dashboard/${projectId}`;

  useEffect(() => {
    void load(dev);
  }, [dev, projectId, userId]);

  async function load(d: typeof dev) {
    setBusy(true);
    setErr(null);
    try {
      const res = await api<Detail>(
        `/v1/projects/${projectId}/users/${userId}`,
        d
      );
      setData(res);
      setFirstName(res.user.firstName ?? '');
      setLastName(res.user.lastName ?? '');
      setEmail(res.user.email);
      setRole(res.user.role);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load user');
    } finally {
      setBusy(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await api<{ user: UserDetail }>(
        `/v1/projects/${projectId}/users/${userId}`,
        dev,
        {
          method: 'PATCH',
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            role,
          }),
        }
      );
      setData((d) => (d ? { ...d, user: res.user } : d));
      setMsg('User updated.');
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlock() {
    if (!data) return;
    const action = data.user.blocked ? 'unblock' : 'block';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    setBusy(true);
    setErr(null);
    try {
      const path = data.user.blocked
        ? `/v1/projects/${projectId}/users/${userId}/unblock`
        : `/v1/projects/${projectId}/users/${userId}/block`;
      await api(path, dev, { method: 'POST', body: '{}' });
      await load(dev);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this user from the project? This cannot be undone.'))
      return;
    setBusy(true);
    try {
      await api(`/v1/projects/${projectId}/users/${userId}`, dev, {
        method: 'DELETE',
      });
      window.location.href = `${base}/users`;
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Failed');
      setBusy(false);
    }
  }

  if (busy && !data) return <div className="empty">Loading…</div>;
  if (err && !data) return <p className="err">{err}</p>;
  if (!data) return null;

  const u = data.user;
  const fullName = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email;

  return (
    <>
      <h1 className="page-title">{fullName}</h1>
      <p className="page-sub mono">{u.email}</p>
      {err && <p className="err" style={{ marginBottom: 16 }}>{err}</p>}
      {msg && <p className="msg" style={{ marginBottom: 16 }}>{msg}</p>}

      <div className="detail-grid">
        <div className="panel">
          <h3>Details</h3>
          <div className="kv">
            <span className="k">User ID</span>
            <span className="v mono">{u.id}</span>
          </div>
          <div className="kv">
            <span className="k">Role</span>
            <span className="v">{u.role}</span>
          </div>
          <div className="kv">
            <span className="k">Email verified</span>
            <span className="v">{u.emailVerified ? 'Yes' : 'No'}</span>
          </div>
          <div className="kv">
            <span className="k">Status</span>
            <span className="v">
              {u.blocked ? 'Blocked' : u.emailVerified ? 'Active' : 'Unverified'}
            </span>
          </div>
          {u.blockedReason && (
            <div className="kv">
              <span className="k">Block reason</span>
              <span className="v">{u.blockedReason}</span>
            </div>
          )}
          <div className="kv">
            <span className="k">Sessions</span>
            <span className="v">{data.sessionCount}</span>
          </div>
          <div className="kv">
            <span className="k">OAuth</span>
            <span className="v">
              {data.oauthProviders.length
                ? data.oauthProviders.join(', ')
                : '—'}
            </span>
          </div>
          <div className="kv">
            <span className="k">Created</span>
            <span className="v">{fmt(u.createdAt as string)}</span>
          </div>
          <div className="kv">
            <span className="k">Updated</span>
            <span className="v">{fmt(u.updatedAt as string)}</span>
          </div>

          <div className="row-actions" style={{ marginTop: 16 }}>
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={() => void toggleBlock()}
            >
              {u.blocked ? 'Unblock' : 'Block'}
            </button>
            <button
              className="btn-secondary danger"
              disabled={busy}
              onClick={() => void remove()}
              style={
                u.blocked
                  ? {}
                  : { borderColor: 'var(--danger)', color: 'var(--danger)' }
              }
            >
              Delete user
            </button>
          </div>
        </div>

        <div className="panel">
          <h3>Edit</h3>
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">First name</label>
              <input
                className="input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Last name</label>
              <input
                className="input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Role</label>
              <select
                className="select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <button className="btn-primary" disabled={busy}>
              Save changes
            </button>
          </form>

          {data.profile && (
            <div style={{ marginTop: 20 }}>
              <h3>Profile</h3>
              <div className="kv">
                <span className="k">Phone</span>
                <span className="v">{data.profile.phone ?? '—'}</span>
              </div>
              <div className="kv">
                <span className="k">Bio</span>
                <span className="v">{data.profile.bio ?? '—'}</span>
              </div>
              {data.profile.metadata && (
                <div className="kv">
                  <span className="k">Metadata</span>
                  <span className="v mono" style={{ fontSize: 11 }}>
                    {JSON.stringify(data.profile.metadata)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

