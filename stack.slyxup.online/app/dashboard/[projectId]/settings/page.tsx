'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../../lib/dashboard-client';
import { useDev } from '../../../../components/dashboard/AuthGate';

interface Project {
  id: string;
  name: string;
  slug: string;
}
interface Domains {
  environment: string;
  domains: string[];
}

export default function SettingsPage() {
  const dev = useDev();
  const params = useParams();
  const projectId = params.projectId as string;
  const [data, setData] = useState<Domains | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [newDomain, setNewDomain] = useState('');
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
      const [dom, proj] = await Promise.all([
        api<Domains>(`/v1/projects/${projectId}/domains`, d),
        api<{ project: Project }>(`/v1/projects/${projectId}`, d)
          .then((r) => r.project)
          .catch(() => null),
      ]);
      setData(dom);
      setProject(proj);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load settings');
    } finally {
      setBusy(false);
    }
  }

  async function addDomain(e: FormEvent) {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await api(`/v1/projects/${projectId}/domains`, dev, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'add', domain: newDomain.trim() }),
      });
      setNewDomain('');
      const d = await api<Domains>(`/v1/projects/${projectId}/domains`, dev);
      setData(d);
      setMsg('Domain added.');
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function removeDomain(domain: string) {
    if (!window.confirm(`Remove ${domain}? This will revoke CORS access for that domain.`)) return;
    setBusy(true);
    setErr(null);
    try {
      await api(`/v1/projects/${projectId}/domains`, dev, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'remove', domain }),
      });
      const d = await api<Domains>(`/v1/projects/${projectId}/domains`, dev);
      setData(d);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function goLive() {
    if (!window.confirm('Switch this project to live mode? Custom domains will be enabled.')) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api<{ environment: string }>(
        `/v1/projects/${projectId}/go-live`,
        dev,
        { method: 'POST' }
      );
      setData((d) => (d ? { ...d, environment: res.environment } : d));
      setMsg(`Project is now ${res.environment.toUpperCase()}.`);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function deleteProject() {
    if (!project) return;
    const ok = window.confirm(`Delete project "${project.name}" permanently? This will remove all users, API keys, domains and sessions. This cannot be undone.`);
    if (!ok) return;
    const typed = window.prompt(`Type the project slug "${project.slug}" to confirm:`);
    if (typed?.trim() !== project.slug) {
      setErr(`Slug mismatch — expected "${project.slug}"`);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await api(`/v1/projects/${projectId}`, dev, { method: 'DELETE' });
      window.location.href = '/dashboard';
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Delete failed');
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="page-title">Settings</h1>
      <p className="page-sub">Environment, custom domains and project state.</p>
      {err && <p className="err" style={{ marginBottom: 16 }}>{err}</p>}
      {msg && <p className="msg" style={{ marginBottom: 16 }}>{msg}</p>}

      {project && (
        <div className="panel">
          <h3>Project</h3>
          <div className="kv">
            <span className="k">Name</span>
            <span className="v">{project.name}</span>
          </div>
          <div className="kv">
            <span className="k">Slug</span>
            <span className="v mono">{project.slug}</span>
          </div>
          <div className="kv">
            <span className="k">Project ID</span>
            <span className="v mono" style={{ fontSize: 12 }}>{project.id}</span>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <h3>Environment</h3>
          {data?.environment !== 'live' && (
            <button className="btn-primary c-btn" disabled={busy} onClick={() => void goLive()}>
              Go live
            </button>
          )}
        </div>
        <div className="kv">
          <span className="k">Current mode</span>
          <span className="v">
            <span className={`pill ${data?.environment === 'live' ? 'good' : 'info'}`}>
              {(data?.environment ?? '…').toUpperCase()}
            </span>
          </span>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          Test mode works on localhost. Going live enables custom domains (CORS)
          for your production app.
        </p>
      </div>

      <div className="panel">
        <h3>Custom domains (CORS)</h3>
        <form onSubmit={addDomain} style={{ display: 'flex', gap: 8, margin: '10px 0 14px' }}>
          <input
            className="cin"
            placeholder="app.yourdomain.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
          />
          <button className="btn-primary c-btn" disabled={busy || !newDomain.trim()}>
            Add
          </button>
        </form>
        {(data?.domains?.length ?? 0) === 0 ? (
          <p className="hint">No custom domains. Test mode works on localhost only.</p>
        ) : (
          <ul className="klist" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data!.domains.map((d) => (
              <li key={d} className="krow" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', background: 'var(--primary-weak)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', fontSize: 13 }}>
                <span className="mono">{d}</span>
                <button className="btn-secondary c-btn danger" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} disabled={busy} onClick={() => void removeDomain(d)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel" style={{ borderColor: 'rgba(239,68,68,.35)' }}>
        <h3 style={{ color: '#fecaca' }}>Danger zone — delete project</h3>
        <p className="hint" style={{ lineHeight: 1.65, marginBottom: 12 }}>
          Permanently delete this project and all its users, keys, domains and audit logs. Also deletes the project in billing if you use{' '}
          <code className="inl">SlyxUp Billing</code>. This cannot be undone. CLI alternative:{' '}
          <code className="inl">npx @slyxup/cli project delete {projectId}</code>
        </p>
        <button
          className="btn-secondary c-btn"
          style={{ background: '#ef4444', color: 'white', borderColor: '#ef4444' }}
          disabled={busy}
          onClick={() => void deleteProject()}
        >
          Delete project permanently
        </button>
      </div>
    </>
  );
}

