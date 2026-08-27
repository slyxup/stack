'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../../lib/dashboard-client';
import { useDev } from '../../../../components/dashboard/AuthGate';

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

const PAGE = 20;

function fmt(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString();
}

export default function UsersPage() {
  const dev = useDev();
  const params = useParams();
  const projectId = params.projectId as string;
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void load(dev, q, offset);
  }, [dev, projectId, offset]);

  async function load(d: typeof dev, query: string, off: number) {
    setBusy(true);
    setErr(null);
    try {
      const res = await api<{ users: UserRow[]; total: number }>(
        `/v1/projects/${projectId}/users?limit=${PAGE}&offset=${off}${
          query ? `&q=${encodeURIComponent(query)}` : ''
        }`,
        d
      );
      setUsers(res.users);
      setTotal(res.total);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setBusy(false);
    }
  }

  function search(e: FormEvent) {
    e.preventDefault();
    setOffset(0);
    void load(dev, q, 0);
  }

  const fullName = (u: UserRow) =>
    `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email;

  return (
    <>
      <h1 className="page-title">Users</h1>
      <p className="page-sub">
        {total === 0
          ? 'No users yet.'
          : `${total} user${total === 1 ? '' : 's'} in this project.`}
      </p>
      {err && <p className="err" style={{ marginBottom: 16 }}>{err}</p>}

      <div className="toolbar">
        <form onSubmit={search} style={{ display: 'flex', gap: 8, flex: 1, maxWidth: 380 }}>
          <input
            className="cin"
            placeholder="Search email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn-secondary" disabled={busy}>
            Search
          </button>
        </form>
        <div className="spacer" />
        {total > 0 && (
          <span className="cell-sub">
            {offset + 1}–{Math.min(offset + PAGE, total)} of {total}
          </span>
        )}
        <button
          className="btn-secondary c-btn"
          disabled={busy || offset === 0}
          onClick={() => setOffset((o) => Math.max(0, o - PAGE))}
        >
          ← Prev
        </button>
        <button
          className="btn-secondary c-btn"
          disabled={busy || offset + PAGE >= total}
          onClick={() => setOffset((o) => o + PAGE)}
        >
          Next →
        </button>
      </div>

      {users.length === 0 ? (
        <div className="empty">
          {q ? 'No users match your search.' : 'No users yet for this project.'}
        </div>
      ) : (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="dtable">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="cell-main">{fullName(u)}</div>
                    <div className="cell-sub mono">{u.email}</div>
                  </td>
                  <td>
                    <span className={`pill ${u.role === 'admin' ? 'info' : ''}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {u.blocked ? (
                      <span className="pill bad">blocked</span>
                    ) : u.emailVerified ? (
                      <span className="pill good">active</span>
                    ) : (
                      <span className="pill warn">unverified</span>
                    )}
                  </td>
                  <td className="cell-sub">{fmt(u.createdAt as string)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      className="btn-secondary c-btn"
                      href={`/dashboard/${projectId}/users/${u.id}`}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

