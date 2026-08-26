'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Nav, Footer } from '../../components/chrome';
import { SITE_CSS } from '../../lib/site-css';

const API =
  process.env.NEXT_PUBLIC_SLYXUP_API_URL ?? 'https://auth.slyxup.online';

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
interface Domains {
  environment: string;
  domains: string[];
}

type Dev = { token: string; email: string };

async function call<T>(path: string, dev: Dev | null, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(dev ? { Authorization: `Bearer ${dev.token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false)
    throw new Error((data.error as string) ?? `Request failed (${res.status})`);
  return data as T;
}

export default function ConsolePage() {
  const [dev, setDev] = useState<Dev | null>(null);
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [domains, setDomains] = useState<Domains | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [freshKey, setFreshKey] = useState<{ prefix: string; key: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('slyxup_dev');
    if (raw) {
      try { setDev(JSON.parse(raw) as Dev); } catch { /* ignore */ }
    }
  }, []);

  async function loadAll(d: Dev) {
    try {
      const res = await call<{ projects: Project[] }>('/v1/projects', d);
      setProjects(res.projects);
      setSelected((cur) => cur ?? res.projects[0]?.id ?? null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to load projects');
    }
  }

  useEffect(() => {
    if (!dev) return;
    void loadAll(dev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dev]);

  useEffect(() => {
    if (!dev || !selected) { setKeys([]); setDomains(null); return; }
    void (async () => {
      try {
        const [k, d] = await Promise.all([
          call<{ keys: KeyRow[] }>(`/v1/keys?projectId=${selected}`, dev),
          call<Domains>(`/v1/projects/${selected}/domains`, dev),
        ]);
        setKeys(k.keys);
        setDomains({ environment: d.environment, domains: d.domains ?? [] });
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'Failed to load project');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dev, selected]);

  async function submitAuth(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setAuthErr(null);
    try {
      const path = mode === 'signin' ? '/v1/developers/lookup' : '/v1/developers/register';
      const res = await call<{ developerId: string }>(path, null, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const next: Dev = { token: res.developerId, email };
      localStorage.setItem('slyxup_dev', JSON.stringify(next));
      setDev(next);
    } catch (err) {
      setAuthErr(err instanceof Error ? err.message : 'Auth failed');
    } finally { setBusy(false); }
  }

  async function createProject(e: FormEvent) {
    e.preventDefault();
    if (!dev || !newName.trim()) return;
    setBusy(true); setMsg(null);
    try {
      const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const res = await call<{ project: Project }>('/v1/projects', dev, {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim(), slug }),
      });
      setProjects((p) => [...p, res.project]);
      setSelected(res.project.id);
      setNewName('');
      setMsg(`Project "${res.project.name}" created — now create a publishable key.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed');
    } finally { setBusy(false); }
  }

  async function createKey(type: 'publishable' | 'secret') {
    if (!dev || !selected) return;
    setBusy(true); setFreshKey(null); setMsg(null);
    try {
      const env = domains?.environment === 'live' ? 'live' : 'test';
      const res = await call<{ key: string; prefix: string }>('/v1/keys', dev, {
        method: 'POST',
        body: JSON.stringify({ projectId: selected, type, environment: env, name: 'default' }),
      });
      setFreshKey(res);
      const k = await call<{ keys: KeyRow[] }>(`/v1/keys?projectId=${selected}`, dev);
      setKeys(k.keys);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed');
    } finally { setBusy(false); }
  }

  async function revokeKey(id: string) {
    if (!dev) return;
    setBusy(true);
    try {
      await call(`/v1/keys/${id}`, dev, { method: 'DELETE' });
      setKeys((ks) => ks.filter((k) => k.id !== id));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed');
    } finally { setBusy(false); }
  }

  async function addDomain(e: FormEvent) {
    e.preventDefault();
    if (!dev || !selected || !newDomain.trim()) return;
    setBusy(true); setMsg(null);
    try {
      await call(`/v1/projects/${selected}/domains`, dev, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'add', domain: newDomain.trim() }),
      });
      setNewDomain('');
      const d = await call<Domains>(`/v1/projects/${selected}/domains`, dev);
      setDomains(d);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed');
    } finally { setBusy(false); }
  }

  async function removeDomain(domain: string) {
    if (!dev || !selected) return;
    setBusy(true);
    try {
      await call(`/v1/projects/${selected}/domains`, dev, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'remove', domain }),
      });
      const d = await call<Domains>(`/v1/projects/${selected}/domains`, dev);
      setDomains(d);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed');
    } finally { setBusy(false); }
  }

  async function goLive() {
    if (!dev || !selected) return;
    setBusy(true); setMsg(null);
    try {
      const res = await call<{ environment: string }>(`/v1/projects/${selected}/go-live`, dev, { method: 'POST' });
      setDomains((d) => (d ? { ...d, environment: res.environment } : d));
      setMsg(`Project is now ${res.environment.toUpperCase()}.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed');
    } finally { setBusy(false); }
  }

  function logout() {
    localStorage.removeItem('slyxup_dev');
    setDev(null); setProjects([]); setSelected(null); setKeys([]); setDomains(null);
  }

  const selectedProject = projects.find((p) => p.id === selected);

  return (
    <>
      <style>{SITE_CSS + CONSOLE_CSS}</style>
      <Nav />
      <div className="wrap" style={{ padding: '56px 24px 80px', maxWidth: 980 }}>
        <h1 className="display" style={{ fontSize: 38, marginBottom: 8 }}>Developer Console</h1>
        <p className="console-sub">
          Create projects, manage API keys and custom domains — everything the CLI does,
          in your browser. Same developer account.
        </p>

        {!dev ? (
          <div className="card console-auth">
            <div className="seg">
              <button type="button" className={mode === 'signin' ? 'on' : ''} onClick={() => setMode('signin')}>Sign in</button>
              <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')}>Create account</button>
            </div>
            <form onSubmit={submitAuth} className="stack-form">
              <input className="cin" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="cin" type="password" required minLength={8} placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
              {authErr && <p className="c-err">{authErr}</p>}
              <button className="btn-primary btn-block" disabled={busy}>
                {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Create developer account'}
              </button>
            </form>
            <p className="c-note">Credentials verified against auth.slyxup.online. Token stored locally.</p>
          </div>
        ) : (
          <>
            <div className="console-top">
              <span className="mono who">{dev.email}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary c-btn" onClick={() => void loadAll(dev)}>Refresh</button>
                <button className="btn-secondary c-btn" onClick={logout}>Log out</button>
              </div>
            </div>

            {msg && <p className="c-msg">{msg}</p>}

            <div className="console-grid">
              <aside className="card proj-col">
                <h3 style={{ marginBottom: 12 }}>Projects</h3>
                <form onSubmit={createProject} style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  <input className="cin" placeholder="New project name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  <button className="btn-primary c-btn" disabled={busy || !newName.trim()}>+</button>
                </form>
                {projects.length === 0 && <p className="dim">No projects yet — create your first one above.</p>}
                <ul className="plist">
                  {projects.map((p) => (
                    <li key={p.id}>
                      <button className={`pitem${p.id === selected ? ' on' : ''}`} onClick={() => { setSelected(p.id); setFreshKey(null); }}>
                        <span className="pname">{p.name}</span>
                        <span className="mono pslug">{p.slug}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>

              <section className="card detail-col">
                {!selectedProject ? (
                  <p className="dim">Select or create a project.</p>
                ) : (
                  <>
                    <div className="detail-head">
                      <h2 style={{ fontSize: 22 }}>{selectedProject.name}</h2>
                      <span className={`env-badge env-${domains?.environment === 'live' ? 'live' : 'test'}`}>
                        {domains?.environment?.toUpperCase() ?? '…'}
                      </span>
                    </div>

                    {freshKey && (
                      <div className="fresh-key">
                        <strong>{freshKey.prefix}_</strong> created — copy it now, shown once:
                        <code className="mono fk">{freshKey.key}</code>
                        <button
                          className="btn-secondary c-btn"
                          onClick={() => { void navigator.clipboard.writeText(freshKey.key); }}
                        >Copy</button>
                      </div>
                    )}

                    <h4>API Keys</h4>
                    <div style={{ display: 'flex', gap: 8, margin: '10px 0 14px' }}>
                      <button className="btn-primary c-btn" disabled={busy} onClick={() => void createKey('publishable')}>+ Publishable key</button>
                      <button className="btn-secondary c-btn" disabled={busy} onClick={() => void createKey('secret')}>+ Secret key</button>
                    </div>
                    {keys.length === 0 && <p className="dim">No keys yet.</p>}
                    <ul className="klist">
                      {keys.map((k) => (
                        <li key={k.id} className="krow">
                          <span className="mono kprefix">{k.prefix}_…</span>
                          <span className="dim">{k.type} · {k.environment} · {k.name}</span>
                          <button className="btn-secondary c-btn danger" disabled={busy} onClick={() => void revokeKey(k.id)}>Revoke</button>
                        </li>
                      ))}
                    </ul>

                    <h4 style={{ marginTop: 26 }}>Custom domains (CORS)</h4>
                    <form onSubmit={addDomain} style={{ display: 'flex', gap: 6, margin: '10px 0' }}>
                      <input className="cin" placeholder="app.yourdomain.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} />
                      <button className="btn-primary c-btn" disabled={busy || !newDomain.trim()}>Add</button>
                    </form>
                    {(domains?.domains?.length ?? 0) === 0 ? (
                      <p className="dim">No custom domains. Test mode works on localhost only.</p>
                    ) : (
                      <ul className="klist">
                        {domains!.domains.map((d) => (
                          <li key={d} className="krow">
                            <span className="mono">{d}</span>
                            <button className="btn-secondary c-btn danger" disabled={busy} onClick={() => void removeDomain(d)}>Remove</button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {domains?.environment !== 'live' && (
                      <button className="btn-primary c-btn golive" disabled={busy} onClick={() => void goLive()}>
                        Go live — enable custom domains
                      </button>
                    )}

                    <h4 style={{ marginTop: 26 }}>Use it in your app</h4>
                    <pre className="mono snippet">{`npm i @slyxup/react @slyxup/ui

<SlyxUpProvider publishableKey="${keys.find((k) => k.type === 'publishable') ? 'pk_…' : '<create a publishable key>'}">
  <SignIn />
</SlyxUpProvider>`}</pre>
                  </>
                )}
              </section>
            </div>
          </>
        )}
      </div>
      <Footer />
    </>
  );
}

const CONSOLE_CSS = `
.console-sub { color:#7c8195; font-size:15px; max-width:560px; margin-bottom:32px; }
.console-auth { max-width:400px; padding:28px; }
.seg { display:flex; gap:4px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:10px; padding:4px; margin-bottom:18px; }
.seg button { flex:1; border:none; background:none; color:#7c8195; font:inherit; font-size:13.5px; font-weight:600; padding:8px; border-radius:7px; cursor:pointer; }
.seg button.on { background:#6366f1; color:#fff; }
.stack-form { display:flex; flex-direction:column; gap:10px; }
.cin {
  width:100%; box-sizing:border-box; font:inherit; font-size:14px; color:#eceef2;
  background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.12); border-radius:10px; padding:10px 12px; outline:none;
  transition: border-color .15s, box-shadow .15s;
}
.cin:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.18); }
.c-err { color:#f0737d; font-size:13px; }
.c-note { font-size:12px; color:#5b6070; margin-top:14px; line-height:1.5; }
.console-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }
.who { color:#a5b4fc; font-size:13px; }
.c-btn { padding:8px 14px; font-size:13px; cursor:pointer; border-radius:8px; }
.c-btn.danger:hover { border-color:rgba(240,115,125,.5); color:#f0737d; }
.c-msg { background:rgba(99,102,241,.09); border:1px solid rgba(99,102,241,.25); color:#c7d2fe; font-size:13.5px; border-radius:10px; padding:10px 14px; margin-bottom:16px; }
.console-grid { display:grid; grid-template-columns: 280px 1fr; gap:18px; align-items:start; }
@media (max-width: 800px) { .console-grid { grid-template-columns: 1fr; } }
.card { background:#101120; border:1px solid rgba(255,255,255,.08); border-radius:14px; }
.proj-col { padding:20px; }
.detail-col { padding:24px; }
.dim { color:#5b6070; font-size:13.5px; }
.plist { list-style:none; display:flex; flex-direction:column; gap:6px; }
.pitem { width:100%; text-align:left; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07); border-radius:10px; padding:10px 12px; cursor:pointer; color:#eceef2; font:inherit; }
.pitem.on { border-color:#6366f1; background:rgba(99,102,241,.10); }
.pname { display:block; font-weight:600; font-size:14px; }
.pslug { display:block; font-size:11.5px; color:#5b6070; margin-top:2px; }
.detail-head { display:flex; align-items:center; gap:12px; margin-bottom:18px; }
.env-badge { font-family:"JetBrains Mono",monospace; font-size:11px; padding:3px 10px; border-radius:999px; }
.env-test { background:rgba(250,204,21,.1); color:#fde047; border:1px solid rgba(250,204,21,.3); }
.env-live { background:rgba(52,211,153,.1); color:#34d399; border:1px solid rgba(52,211,153,.3); }
.fresh-key { background:rgba(52,211,153,.07); border:1px solid rgba(52,211,153,.3); border-radius:10px; padding:12px 14px; font-size:13.5px; margin-bottom:16px; display:flex; flex-direction:column; gap:8px; word-break:break-all; }
.fk { font-size:12.5px; color:#34d399; }
.klist { list-style:none; display:flex; flex-direction:column; gap:8px; }
.krow { display:flex; align-items:center; gap:12px; justify-content:space-between; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07); border-radius:10px; padding:9px 12px; font-size:13px; }
.kprefix { color:#a5b4fc; }
.golive { margin-top:12px; }
.snippet { background:#0a0a12; border:1px solid rgba(255,255,255,.08); border-radius:10px; padding:14px; font-size:12.5px; overflow-x:auto; white-space:pre-wrap; }
.detail-col h4 { font-family:"Space Grotesk",sans-serif; font-size:15px; margin-top:8px; }
`;
