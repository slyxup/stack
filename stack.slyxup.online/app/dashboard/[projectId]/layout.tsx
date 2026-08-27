'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthGate, useLogout } from '../../../components/dashboard/AuthGate';
import { ThemeToggle } from '../../../components/ThemeToggle';
import { BrandShield } from '../../../components/icons';
import { api, type Dev } from '../../../lib/dashboard-client';
import { DASHBOARD_CSS } from '../../../lib/dashboard-css';

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
}
interface MiniUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  blocked: boolean;
}

const NAV = [
  { href: '', label: 'Overview', icon: GridIcon },
  { href: '/users', label: 'Users', icon: UsersIcon },
  { href: '/billing', label: 'Billing', icon: CardIcon },
  { href: '/keys', label: 'API Keys', icon: KeyIcon },
  { href: '/settings', label: 'Settings', icon: GearIcon },
];

function initials(u: MiniUser) {
  const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
  if (name) return name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  return u.email.slice(0, 2).toUpperCase();
}

function Shell({ dev, children }: { dev: Dev; children: import('react').ReactNode }) {
  const params = useParams();
  const projectId = params.projectId as string;
  const pathname = usePathname();
  const logout = useLogout();

  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<MiniUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [plist, pdetail, ulist] = await Promise.all([
          api<{ projects: Project[] }>('/v1/projects', dev),
          api<{ project: Project }>(`/v1/projects/${projectId}`, dev),
          api<{ users: MiniUser[] }>(
            `/v1/projects/${projectId}/users?limit=8`,
            dev
          ).catch(() => ({ users: [] as MiniUser[] })),
        ]);
        if (!active) return;
        setProjects(plist.projects);
        setProject(pdetail.project);
        setUsers(ulist.users);
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : 'Failed to load project');
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dev, projectId]);

  if (ready && error) {
    return (
      <div className="wrap" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p className="err">{error}</p>
        <Link className="btn-secondary" href="/dashboard" style={{ marginTop: 16 }}>
          ← Back to projects
        </Link>
      </div>
    );
  }

  const base = `/dashboard/${projectId}`;
  const activeHref = (href: string) =>
    href === '' ? pathname === base : pathname.startsWith(base + href);

  return (
    <div className="dash">
      <aside className="dash-side">
        <Link href="/dashboard" className="dash-brand">
          <span className="brand-mark">
            <BrandShield />
          </span>
          SlyxUp
        </Link>

        <div className="side-section">
          <div className="side-kicker">Project</div>
          <select
            className="proj-switch"
            value={projectId}
            onChange={(e) => {
              if (e.target.value !== projectId)
                window.location.href = `/dashboard/${e.target.value}`;
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="side-section">
          <div className="side-kicker">Manage</div>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={base + item.href}
                className={`nav-item${activeHref(item.href) ? ' on' : ''}`}
              >
                <Icon />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="side-section" style={{ marginTop: 'auto' }}>
          <div className="side-kicker">Recent users</div>
          {users.length === 0 ? (
            <div className="mini-user">
              <span className="mini-av">–</span>
              <span className="mini-name">No users yet</span>
            </div>
          ) : (
            users.map((u) => (
              <Link
                key={u.id}
                href={`${base}/users/${u.id}`}
                className="mini-user"
              >
                <span className="mini-av">{initials(u)}</span>
                <span className="mini-name">
                  {u.firstName || u.lastName
                    ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
                    : u.email}
                </span>
                {u.blocked && <span className="mini-blocked" />}
              </Link>
            ))
          )}
        </div>

        <div className="side-section">
          <a
            href="/"
            className="nav-item"
            style={{ fontSize: 12.5, color: 'var(--text-faint)' }}
          >
            ← Back to site
          </a>
          <Link
            href="/docs"
            className="nav-item"
            style={{ fontSize: 12.5, color: 'var(--text-faint)' }}
          >
            Docs
          </Link>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-top">
          <div className="cell-sub mono">
            {project ? project.slug : '…'}
            {project?.environment && (
              <span
                className={`pill ${project.environment === 'live' ? 'good' : 'info'}`}
                style={{ marginLeft: 8 }}
              >
                {project.environment.toUpperCase()}
              </span>
            )}
          </div>
          <div className="top-actions">
            <ThemeToggle />
            <span className="who">{dev.email}</span>
            <button className="btn-secondary c-btn" onClick={logout}>
              Log out
            </button>
          </div>
        </header>
        <div className="dash-content">
          {ready ? (
            error ? null : (
              <>
                {project && <Crumb project={project.name} projectId={projectId} />}
                {children}
              </>
            )
          ) : (
            <div className="empty">Loading…</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Crumb({ project, projectId }: { project: string; projectId: string }) {
  return (
    <div className="crumb">
      <Link href="/dashboard">Projects</Link> /{' '}
      <Link href={`/dashboard/${projectId}`}>{project}</Link>
    </div>
  );
}

export default function ProjectLayout({
  children,
}: {
  children: any;
}) {
  return (
    <>
      <UniqueStyle css={DASHBOARD_CSS} />
      <AuthGate>{(dev) => <Shell dev={dev}>{children}</Shell>}</AuthGate>
    </>
  );
}

/* ── inline nav icons ── */
function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3M16 3.1a4 4 0 0 1 0 7.8" />
    </svg>
  );
}
function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}
function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M10.7 12.3 21 2m-4 0 3 3m-6.5-1.5L17 6.5" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
