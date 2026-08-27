'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { AuthGate, useLogout } from '../../components/dashboard/AuthGate';
import { Nav, Footer } from '../../components/chrome';
import { ThemeToggle } from '../../components/ThemeToggle';
import { api, type Dev } from '../../lib/dashboard-client';
import { DASHBOARD_CSS } from '../../lib/dashboard-css';

function UniqueStyle({ css }: { css: string }) {
  const [rendered, setRendered] = useState(false);
  useEffect(() => {
    if (!document.querySelector(`style[data-css="${css.length}"]`)) {
      const el = document.createElement('style');
      el.setAttribute('data-css', String(css.length));
      el.textContent = css;
      document.head.appendChild(el);
    }
    setRendered(true);
  }, [css]);
  if (rendered) return null;
  return <style>{css}</style>;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  environment?: string;
  description?: string | null;
}
interface KeyRow {
  id: string;
  prefix: string;
  type: string;
  environment: string;
  name: string;
}

function DashboardHome({ dev }: { dev: Dev }) {
  const logout = useLogout();
  const [projects, setProjects] = useState<Project[]>([]);
  const [keys, setKeys] = useState<Record<string, KeyRow[]>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dev]);

  async function load() {
    try {
      const res = await api<{ projects: Project[] }>('/v1/projects', dev);
      setProjects(res.projects);
      setSelected((cur) => cur ?? res.projects[0]?.id ?? null);
      const map: Record<string, KeyRow[]> = {};
      await Promise.all(
        res.projects.map(async (p) => {
          try {
            const k = await api<{ keys: KeyRow[] }>(
              `/v1/keys?projectId=${p.id}`,
              dev
            );
            map[p.id] = k.keys;
          } catch {
            map[p.id] = [];
          }
        })
      );
      setKeys(map);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load projects');
    }
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const slug = newName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const res = await api<{ project: Project }>('/v1/projects', dev, {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim(), slug }),
      });
      window.location.href = `/dashboard/${res.project.id}`;
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap" style={{ padding: '40px 24px 80px', maxWidth: 980 }}>
      <div className="dash-top" style={{ position: 'static', background: 'transparent', border: 'none', padding: 0, marginBottom: 28 }}>
        <div>
          <h1 className="display" style={{ fontSize: 32, marginBottom: 4 }}>
            Projects
          </h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            Pick a project to manage its users, billing and keys — or create a
            new one.
          </p>
        </div>
        <div className="top-actions">
          <ThemeToggle />
          <span className="who">{dev.email}</span>
          <button className="btn-secondary c-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      {err && <p className="err" style={{ marginBottom: 16 }}>{err}</p>}
      {msg && <p className="msg" style={{ marginBottom: 16 }}>{msg}</p>}

      <div className="panel" style={{ marginBottom: 22 }}>
        <form onSubmit={create} style={{ display: 'flex', gap: 8 }}>
          <input
            className="cin"
            placeholder="New project name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button className="btn-primary" disabled={busy || !newName.trim()}>
            + Create project
          </button>
        </form>
      </div>

      {projects.length === 0 ? (
        <div className="empty">
          No projects yet — create your first one above.
        </div>
      ) : (
        <div className="dtable-wrap">
          <table className="dtable">
            <thead>
              <tr>
                <th>Project</th>
                <th>Environment</th>
                <th>API keys</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="cell-main">{p.name}</div>
                    <div className="cell-sub mono">{p.slug}</div>
                  </td>
                  <td>
                    <span
                      className={`pill ${
                        p.environment === 'live' ? 'good' : 'info'
                      }`}
                    >
                      {(p.environment ?? 'test').toUpperCase()}
                    </span>
                  </td>
                  <td className="cell-sub">{keys[p.id]?.length ?? 0}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Link className="btn-secondary c-btn" href={`/dashboard/${p.id}`}>
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <UniqueStyle css={DASHBOARD_CSS} />
      <Nav />
      <AuthGate>{(dev) => <DashboardHome dev={dev} />}</AuthGate>
      <Footer />
    </>
  );
}
