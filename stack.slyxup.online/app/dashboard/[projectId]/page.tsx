'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/dashboard-client';
import { useDev } from '../../../components/dashboard/AuthGate';

interface Stats {
  users: number;
  keys: number;
  environment: string;
  domains: number;
}

export default function OverviewPage() {
  const dev = useDev();
  const params = useParams();
  const projectId = params.projectId as string;
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [u, k, d] = await Promise.all([
          api<{ total: number }>(`/v1/projects/${projectId}/users`, dev),
          api<{ keys: unknown[] }>(`/v1/keys?projectId=${projectId}`, dev),
          api<{ environment: string; domains: string[] }>(
            `/v1/projects/${projectId}/domains`,
            dev
          ).catch(() => ({ environment: 'test', domains: [] })),
        ]);
        if (!active) return;
        setStats({
          users: u.total,
          keys: k.keys.length,
          environment: d.environment,
          domains: d.domains.length,
        });
      } catch (e) {
        if (active) setErr(e instanceof Error ? e.message : 'Failed to load');
      }
    })();
    return () => { active = false; };
  }, [dev, projectId]);

  return (
    <>
      <h1 className="page-title">Overview</h1>
      <p className="page-sub">At-a-glance stats for this project.</p>
      {err && <p className="err">{err}</p>}
      <div className="stat-row">
        <div className="stat">
          <div className="stat-label">Users</div>
          <div className="stat-value">{stats?.users ?? '…'}</div>
        </div>
        <div className="stat">
          <div className="stat-label">API Keys</div>
          <div className="stat-value">{stats?.keys ?? '…'}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Environment</div>
          <div className="stat-value" style={{ fontSize: 18, paddingTop: 6 }}>
            {(stats?.environment ?? '…').toUpperCase()}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Custom domains</div>
          <div className="stat-value">{stats?.domains ?? '…'}</div>
        </div>
      </div>

      <div className="panel">
        <h3>Quick actions</h3>
        <div className="row-actions">
          <Link className="btn-primary" href={`/dashboard/${projectId}/users`}>
            Manage users
          </Link>
          <Link className="btn-secondary" href={`/dashboard/${projectId}/billing`}>
            Billing &amp; plans
          </Link>
          <Link className="btn-secondary" href={`/dashboard/${projectId}/keys`}>
            API keys
          </Link>
          <Link className="btn-secondary" href={`/dashboard/${projectId}/settings`}>
            Project settings
          </Link>
        </div>
      </div>

      <div className="panel">
        <h3>Getting started</h3>
        <p className="hint" style={{ lineHeight: 1.7 }}>
          Install the SDK and wrap your app, then drop in{' '}
          <code className="inl">&lt;SignIn /&gt;</code> from{' '}
          <code className="inl">@slyxup/ui</code>. Create a publishable key under{' '}
          <Link href={`/dashboard/${projectId}/keys`} className="linkish">
            API Keys
          </Link>{' '}
          and you&apos;re live. User sign-ups will appear under{' '}
          <Link href={`/dashboard/${projectId}/users`} className="linkish">
            Users
          </Link>
          .
        </p>
      </div>
    </>
  );
}
