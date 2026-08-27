'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../../lib/dashboard-client';
import { useDev } from '../../../../components/dashboard/AuthGate';

interface KeyRow {
  id: string;
  prefix: string;
  type: string;
  environment: string;
  name: string;
}

export default function KeysPage() {
  const dev = useDev();
  const params = useParams();
  const projectId = params.projectId as string;
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [environment, setEnvironment] = useState('test');
  const [freshKey, setFreshKey] = useState<{ prefix: string; key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [keyName, setKeyName] = useState('');

  useEffect(() => {
    void load(dev);
  }, [dev, projectId]);

  async function load(d: typeof dev) {
    setBusy(true);
    setErr(null);
    try {
      const [k, d2] = await Promise.all([
        api<{ keys: KeyRow[] }>(`/v1/keys?projectId=${projectId}`, d),
        api<{ environment: string; domains: string[] }>(
          `/v1/projects/${projectId}/domains`,
          d
        ).catch(() => ({ environment: 'test', domains: [] })),
      ]);
      setKeys(k.keys);
      setEnvironment(d2.environment);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load keys');
    } finally {
      setBusy(false);
    }
  }

  async function create(type: 'publishable' | 'secret') {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const env = environment === 'live' ? 'live' : 'test';
      const name = keyName.trim() || 'default';
      const res = await api<{ key: string; prefix: string }>(`/v1/keys`, dev, {
        method: 'POST',
        body: JSON.stringify({ projectId, type, environment: env, name }),
      });
      setFreshKey(res);
      setKeyName('');
      const k = await api<{ keys: KeyRow[] }>(`/v1/keys?projectId=${projectId}`, dev);
      setKeys(k.keys);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!window.confirm('Revoke this key? Any app using it will stop working immediately.')) return;
    setBusy(true);
    setErr(null);
    try {
      await api(`/v1/keys/${id}`, dev, { method: 'DELETE' });
      setKeys((ks) => ks.filter((k) => k.id !== id));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="page-title">API Keys</h1>
      <p className="page-sub">
        Publishable and secret keys for the{' '}
        <span className="pill info">{environment.toUpperCase()}</span> environment.
      </p>
      {err && <p className="err" style={{ marginBottom: 16 }}>{err}</p>}
      {msg && <p className="msg" style={{ marginBottom: 16 }}>{msg}</p>}

      {freshKey && (
        <div className="panel" style={{ borderColor: 'var(--success)' }}>
          <h3>New key created — copy it now</h3>
          <p className="hint" style={{ marginBottom: 10 }}>
            This is shown only once.
          </p>
          <code className="mono" style={{ display: 'block', wordBreak: 'break-all', color: 'var(--success)' }}>
            {freshKey.prefix}_{freshKey.key}
          </code>
          <button
            className="btn-secondary c-btn"
            style={{ marginTop: 10 }}
            onClick={() => void navigator.clipboard.writeText(`${freshKey.prefix}_${freshKey.key}`)}
          >
            Copy
          </button>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <h3>Keys</h3>
          <div className="row-actions">
            <button className="btn-primary c-btn" disabled={busy} onClick={() => void create('publishable')}>
              + Publishable
            </button>
            <button className="btn-secondary c-btn" disabled={busy} onClick={() => void create('secret')}>
              + Secret
            </button>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="label">Key name (optional)</label>
          <input
            className="cin"
            placeholder="e.g. production, staging, dev"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            style={{ maxWidth: 320 }}
          />
        </div>
        {keys.length === 0 ? (
          <p className="hint">No keys yet. Create one above.</p>
        ) : (
          <ul className="klist" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {keys.map((k) => (
              <li key={k.id} className="krow" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', background: 'var(--primary-weak)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', fontSize: 13 }}>
                <span className="mono kprefix" style={{ color: 'var(--accent)' }}>
                  {k.prefix}_…
                </span>
                <span className="cell-sub">
                  {k.type} · {k.environment} · {k.name}
                </span>
                <button className="btn-secondary c-btn danger" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} disabled={busy} onClick={() => void revoke(k.id)}>
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel">
        <h3>Use in your app</h3>
        <pre className="mono snippet" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, fontSize: 12.5, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
{`npm i @slyxup/react @slyxup/ui

<SlyxUpProvider publishableKey="pk_…">
  <SignIn />
</SlyxUpProvider>`}</pre>
      </div>
    </>
  );
}
