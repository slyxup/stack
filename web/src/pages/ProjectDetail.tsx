import {
  ArrowLeft,
  CreditCard,
  Globe,
  KeyRound,
  Loader2,
  Search,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { type ComponentType, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CodeBlock } from '../components/CodeBlock';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardDesc,
  CardHeader,
  CardTitle,
  Empty,
  Input,
  Skeleton,
  TableWrap,
  Td,
  Th,
} from '../components/ui';
import {
  type ApiKey,
  type BillingPlan,
  type Project,
  type ProjectUser,
  addDomain,
  blockProjectUser,
  createKey,
  deleteProject,
  deleteProjectUser,
  goLiveProject,
  listBillingPlans,
  listDomains,
  listKeys,
  listProjectUsers,
  listProjects,
  removeDomain,
  revokeKey,
  unblockProjectUser,
  updateProjectUser,
} from '../lib/api';

type Tab = 'overview' | 'users' | 'keys' | 'domains' | 'billing' | 'danger';

const TABS: Array<{
  k: Tab;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { k: 'overview', label: 'Overview', icon: ShieldCheck },
  { k: 'users', label: 'Users', icon: Users },
  { k: 'keys', label: 'Keys', icon: KeyRound },
  { k: 'domains', label: 'Domains', icon: Globe },
  { k: 'billing', label: 'Billing', icon: CreditCard },
  { k: 'danger', label: 'Settings', icon: Settings2 },
];

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [project, setProject] = useState<Project | null>(null);
  const [missing, setMissing] = useState(false);

  const [users, setUsers] = useState<ProjectUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [usersBusy, setUsersBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [keyName, setKeyName] = useState('');
  const [keyType, setKeyType] = useState<'publishable' | 'secret'>(
    'publishable'
  );
  const [revealed, setRevealed] = useState<string | null>(null);

  const [domains, setDomains] = useState<string[] | null>(null);
  const [newDomain, setNewDomain] = useState('');

  const [plans, setPlans] = useState<BillingPlan[] | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadUsers = useCallback(
    async (
      pid: string,
      opts?: { query?: string; offset?: number; append?: boolean }
    ) => {
      setUsersBusy(true);
      const r = await listProjectUsers(pid, {
        q: opts?.query || undefined,
        limit: 20,
        offset: opts?.offset ?? 0,
      });
      setUsersBusy(false);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setUsers((prev) =>
        opts?.append && prev ? [...prev, ...r.data.users] : r.data.users
      );
      setTotal(r.data.total);
      setError(null);
    },
    []
  );

  const loadRest = useCallback(async (pid: string) => {
    const [k, d, b] = await Promise.all([
      listKeys(pid),
      listDomains(pid),
      listBillingPlans(pid),
    ]);
    if (k.ok) setKeys(k.data.keys);
    else setError(k.error);
    if (d.ok) setDomains(d.data.domains);
    else setError(d.error);
    if (b.ok) setPlans(b.data.plans);
  }, []);

  useEffect(() => {
    if (!id) return;
    listProjects().then((r) => {
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const found = r.data.projects.find((p) => p.id === id);
      if (!found) {
        setMissing(true);
        return;
      }
      setProject(found);
      void loadUsers(id, { query: '' });
      void loadRest(id);
    });
  }, [id, loadUsers, loadRest]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: debounced search — intentionally keyed on debouncedQ only
  useEffect(() => {
    if (!id || users === null) return;
    setUsers(null);
    void loadUsers(id, { query: debouncedQ });
  }, [debouncedQ]);

  if (missing) {
    return (
      <Empty
        title="Project not found"
        desc="It may have been deleted, or you don't have access to it."
        action={
          <Link to="/admin">
            <Button size="sm">Back to projects</Button>
          </Link>
        }
      />
    );
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const fullName = (u: ProjectUser) =>
    `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;

  const saveName = async (u: ProjectUser) => {
    if (!id) return;
    setBusy(true);
    setError(null);
    const r = await updateProjectUser(id, u.id, {
      firstName: editName.trim() || undefined,
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setEditing(null);
    void loadUsers(id, { query: debouncedQ });
  };

  const toggleBlock = async (u: ProjectUser) => {
    if (!id) return;
    setBusy(true);
    setError(null);
    const r = u.blocked
      ? await unblockProjectUser(id, u.id)
      : await blockProjectUser(id, u.id);
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    void loadUsers(id, { query: debouncedQ });
  };

  const removeUser = async (u: ProjectUser) => {
    if (!id) return;
    if (!confirm(`Remove ${u.email} from this project?`)) return;
    const r = await deleteProjectUser(id, u.id);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    void loadUsers(id, { query: debouncedQ });
  };

  const makeKey = async () => {
    if (!id || !keyName.trim()) return;
    setBusy(true);
    setError(null);
    setRevealed(null);
    const r = await createKey(id, { name: keyName.trim(), type: keyType });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setRevealed(r.data.key);
    setKeyName('');
    const k = await listKeys(id);
    if (k.ok) setKeys(k.data.keys);
  };

  const dropKey = async (k: ApiKey) => {
    if (!id) return;
    if (
      !confirm(
        `Revoke key "${k.name}"? Requests using it will fail immediately.`
      )
    )
      return;
    const r = await revokeKey(k.id);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    const fresh = await listKeys(id);
    if (fresh.ok) setKeys(fresh.data.keys);
  };

  const pushDomain = async () => {
    if (!id || !newDomain.trim()) return;
    setBusy(true);
    setError(null);
    const r = await addDomain(id, newDomain.trim());
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setDomains(r.data.domains);
    setNewDomain('');
  };

  const pullDomain = async (d: string) => {
    if (!id) return;
    if (
      !confirm(`Remove domain ${d}? Browsers on that origin will be rejected.`)
    )
      return;
    const r = await removeDomain(id, d);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setDomains(r.data.domains);
  };

  const goLive = async () => {
    if (!id) return;
    if (!confirm('Switch this project to live environment?')) return;
    const r = await goLiveProject(id);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setProject({ ...project, environment: 'live' });
  };

  const destroy = async () => {
    if (!id) return;
    if (
      !confirm(
        `Delete project "${project.name}"? Everything under it goes too. Type to confirm is not needed — this is the last warning.`
      )
    )
      return;
    const r = await deleteProject(id);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    navigate('/admin', { replace: true });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="rounded-full p-2 hover:bg-[#eceef2]"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-[20px] font-bold tracking-tight flex items-center gap-2 flex-wrap">
            {project.name}
            <span className="font-mono text-[11px] font-medium bg-[#eceef2] px-2 py-0.5 rounded-md text-[#63666f]">
              {project.slug}
            </span>
            {project.environment && (
              <Badge tone={project.environment === 'live' ? 'green' : 'gray'}>
                {project.environment}
              </Badge>
            )}
          </h1>
          <p className="text-[13px] text-[#63666f] truncate">
            {project.description || 'No description'}
          </p>
        </div>
        <Badge tone="violet" className="ml-auto shrink-0">
          {total} users
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#e4e6eb] mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            type="button"
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[13.5px] font-semibold whitespace-nowrap border-b-2 -mb-px cursor-pointer ${tab === t.k ? 'border-[#101014] text-[#101014]' : 'border-transparent text-[#63666f] hover:text-[#101014]'}`}
          >
            <t.icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {tab === 'overview' && (
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Total users', value: String(total) },
            {
              label: 'API keys',
              value: keys === null ? '…' : String(keys.length),
            },
            {
              label: 'Domains',
              value: domains === null ? '…' : String(domains.length),
            },
          ].map((s) => (
            <Card key={s.label}>
              <CardHeader>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#63666f]">
                  {s.label}
                </div>
                <div className="text-[28px] font-extrabold tracking-tight mt-1">
                  {s.value}
                </div>
              </CardHeader>
            </Card>
          ))}
          <Card className="sm:col-span-3">
            <CardHeader>
              <CardTitle>Next steps</CardTitle>
              <CardDesc>
                Create an API key, allow your frontend domain, then follow the
                integration docs.
              </CardDesc>
            </CardHeader>
            <CardBody className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTab('keys')}
              >
                Create API key
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTab('domains')}
              >
                Add domain
              </Button>
              <Link to="/docs">
                <Button size="sm" variant="secondary">
                  Read integration docs
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'users' && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDesc>
                {users === null
                  ? 'Loading…'
                  : `${users.length} shown · ${total} total · server search, 20 per page`}
              </CardDesc>
            </div>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9da8]" />
              <Input
                placeholder="Search email"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 !rounded-full sm:w-[240px]"
              />
            </div>
          </CardHeader>
          <CardBody>
            {users === null ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <Empty
                title="No users"
                desc="Users appear here after they sign up through your integrated app (see Docs → Quickstart)."
              />
            ) : (
              <TableWrap>
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-[#e4e6eb]">
                      <Th>User</Th>
                      <Th>Role</Th>
                      <Th>Status</Th>
                      <Th right>Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-[#f0f1f4] last:border-0"
                      >
                        <Td>
                          <div className="font-semibold">{fullName(u)}</div>
                          <div className="font-mono text-[11px] text-[#63666f]">
                            {u.email}
                          </div>
                        </Td>
                        <Td>
                          <Badge>{u.role}</Badge>
                        </Td>
                        <Td>
                          <Badge tone={u.blocked ? 'red' : 'green'}>
                            {u.blocked ? 'blocked' : 'active'}
                          </Badge>
                        </Td>
                        <Td right>
                          {editing === u.id ? (
                            <span className="inline-flex items-center gap-1">
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="!h-8 !w-32"
                              />
                              <Button
                                size="sm"
                                className="!h-8"
                                disabled={busy}
                                onClick={() => void saveName(u)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="!h-8"
                                onClick={() => setEditing(null)}
                              >
                                Cancel
                              </Button>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="!h-8"
                                onClick={() => {
                                  setEditing(u.id);
                                  setEditName(fullName(u));
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="!h-8"
                                disabled={busy}
                                onClick={() => void toggleBlock(u)}
                              >
                                {u.blocked ? 'Unblock' : 'Block'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="!h-8 !text-[#dc2626] hover:!bg-red-50"
                                disabled={busy}
                                onClick={() => void removeUser(u)}
                              >
                                Delete
                              </Button>
                            </span>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
            {usersBusy && (
              <div className="py-2 text-[12px] text-[#63666f] flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" /> Searching…
              </div>
            )}
            {users && users.length < total && (
              <div className="pt-3 text-center">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={usersBusy}
                  onClick={() =>
                    id &&
                    void loadUsers(id, {
                      query: debouncedQ,
                      offset: users.length,
                      append: true,
                    })
                  }
                >
                  Load more ({users.length}/{total})
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'keys' && (
        <Card>
          <CardHeader>
            <CardTitle>API keys</CardTitle>
            <CardDesc>
              Publishable keys (<span className="font-mono">pk_…</span>) go in
              browsers. Secret keys (<span className="font-mono">sk_…</span>)
              stay on your server. Only SHA-256 hashes are stored — the full key
              is shown once.
            </CardDesc>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Key name — e.g. web-app"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="flex-1"
              />
              <div className="flex rounded-full border border-[#e4e6eb] p-1 text-[12.5px] font-semibold">
                {(['publishable', 'secret'] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setKeyType(t)}
                    className={`px-3.5 py-1.5 rounded-full cursor-pointer ${keyType === t ? 'bg-[#101014] text-white' : 'text-[#63666f]'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Button
                size="md"
                disabled={busy || !keyName.trim()}
                onClick={() => void makeKey()}
              >
                {busy ? 'Creating…' : 'Create key'}
              </Button>
            </div>
            {revealed && (
              <Alert tone="green">
                <span className="font-bold">Copy now — shown once:</span>
                <br />
                <code className="font-mono text-[12px] break-all">
                  {revealed}
                </code>
              </Alert>
            )}
            {keys === null ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : keys.length === 0 ? (
              <Empty
                title="No keys yet"
                desc="Create one above, or via CLI: slyxup keys create --project-id <id> --type publishable"
              />
            ) : (
              <div className="space-y-2">
                {keys.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[#e4e6eb] p-3.5"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-[12px] font-bold truncate">
                        {k.prefix}_… · {k.name} · {k.type} · {k.environment}
                      </div>
                      <div className="font-mono text-[11px] text-[#63666f] truncate">
                        {k.id}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge>{k.type}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="!text-[#dc2626] hover:!bg-red-50"
                        onClick={() => void dropKey(k)}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'domains' && (
        <Card>
          <CardHeader>
            <CardTitle>Allowed domains</CardTitle>
            <CardDesc>
              Browser origins allowed to use this project's publishable key
              (CORS + origin check).
            </CardDesc>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="app.example.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
              <Button
                disabled={busy || !newDomain.trim()}
                onClick={() => void pushDomain()}
              >
                Add
              </Button>
            </div>
            {domains === null ? (
              <div className="space-y-2">
                {[1].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : domains.length === 0 ? (
              <Empty
                title="No domains allowed"
                desc="Add your frontend origin, otherwise browser requests are rejected."
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {domains.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f1f4] pl-3.5 pr-2 py-1.5 font-mono text-[12px]"
                  >
                    <Globe className="size-3.5 text-[#63666f]" /> {d}
                    <button
                      type="button"
                      onClick={() => void pullDomain(d)}
                      className="rounded-full px-1.5 text-[#63666f] hover:text-[#dc2626] cursor-pointer"
                      title={`Remove ${d}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {tab === 'billing' && (
        <div className="space-y-4">
          {plans === null ? (
            <div className="grid sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[180px]" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <Empty
              title="No active plans"
              desc="Plans are created in the billing service (Paddle-backed). The public API lists active plans only."
            />
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              {plans.map((p) => (
                <Card key={p.id} className="card-hover flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{p.name}</CardTitle>
                      <Badge>Active</Badge>
                    </div>
                    <div className="mt-1.5">
                      <span className="text-[24px] font-extrabold tracking-tight">
                        $
                        {(p.amount / 100).toFixed(p.amount % 100 === 0 ? 0 : 2)}
                      </span>
                      <span className="text-[12.5px] text-[#63666f]">
                        /{p.interval}
                      </span>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <ul className="text-[12.5px] text-[#3c3f47] space-y-1.5 list-disc pl-4">
                      {p.features.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
          <Alert tone="gray">
            Plan activation is a billing-admin operation (
            <span className="font-mono text-[11.5px]">
              PATCH /v1/admin/plans/:id
            </span>{' '}
            with{' '}
            <span className="font-mono text-[11.5px]">
              BILLING_ADMIN_SECRET
            </span>
            ) — this panel lists active plans read-only.
          </Alert>
        </div>
      )}

      {tab === 'danger' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project details</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-[13px]">
              <div className="rounded-xl border border-[#e4e6eb] p-3.5">
                <div className="font-bold">Project ID</div>
                <div className="font-mono text-[12px] text-[#63666f] break-all">
                  {project.id}
                </div>
              </div>
              <div className="rounded-xl border border-[#e4e6eb] p-3.5">
                <div className="font-bold">Slug</div>
                <div className="font-mono text-[12px] text-[#63666f]">
                  {project.slug}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void goLive()}
                >
                  Switch to live
                </Button>
              </div>
            </CardBody>
          </Card>
          <Card className="!border-red-200">
            <CardHeader>
              <CardTitle>
                <span className="text-[#dc2626]">Danger zone</span>
              </CardTitle>
              <CardDesc>
                Deleting a project removes its users, keys, domains and
                memberships. This cannot be undone.
              </CardDesc>
            </CardHeader>
            <CardBody>
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => void destroy()}
              >
                Delete this project
              </Button>
            </CardBody>
          </Card>
        </div>
      )}

      {tab !== 'overview' && tab !== 'danger' && (
        <div className="mt-4">
          <CodeBlock
            title="cli"
            lang="bash"
            code={
              tab === 'users'
                ? `curl -H "Authorization: Bearer $TOKEN" ${import.meta.env.VITE_API_URL || 'https://auth.slyxup.online'}/v1/projects/${project.id}/users`
                : tab === 'keys'
                  ? `slyxup keys list --project-id ${project.id} --json`
                  : tab === 'domains'
                    ? `slyxup domains list --project-id ${project.id} --json`
                    : `curl "${'https://billing.slyxup.online'}/v1/billing/plans?projectId=${project.id}"`
            }
          />
        </div>
      )}
    </div>
  );
}
