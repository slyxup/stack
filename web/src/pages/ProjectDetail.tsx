import {
  ArrowLeft,
  CreditCard,
  FileText,
  Globe,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
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
  Dialog,
  Empty,
  Input,
  Label,
  Skeleton,
  TableWrap,
  Td,
  Th,
} from '../components/ui';
import {
  type ApiKey,
  type AuditLog,
  type BillingPlan,
  type Invoice,
  type PlanInput,
  type Project,
  type ProjectUser,
  type SessionInfo,
  type Subscription,
  addDomain,
  blockProjectUser,
  cancelSubscription,
  createKey,
  createPlan,
  deletePlan,
  deleteProject,
  deleteProjectUser,
  getSubscription,
  goLiveProject,
  listAdminPlans,
  listAuditLogs,
  listBillingPlans,
  listDomains,
  listInvoices,
  listKeys,
  listProjectUserSessions,
  listProjectUsers,
  listProjects,
  removeDomain,
  resumeSubscription,
  revokeKey,
  revokeProjectUserSession,
  startCheckout,
  unblockProjectUser,
  updatePlan,
  updateProjectUser,
} from '../lib/api';
import { ensurePaddle, onCheckoutResult, openCheckout } from '../lib/paddle';

type Tab =
  | 'overview'
  | 'users'
  | 'keys'
  | 'domains'
  | 'billing'
  | 'audit'
  | 'danger';

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
  { k: 'audit', label: 'Audit', icon: FileText },
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
  const [subscription, setSubscription] = useState<
    Subscription | null | undefined
  >(undefined);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);

  // Admin plan manager (create/edit/deactivate)
  const [adminPlans, setAdminPlans] = useState<BillingPlan[] | null>(null);
  const [planEditor, setPlanEditor] = useState<{
    open: boolean;
    editing: BillingPlan | null;
  }>({ open: false, editing: null });
  const [planForm, setPlanForm] = useState<PlanInput>({
    name: '',
    amount: 0,
    currency: 'USD',
    interval: 'month',
    trialDays: 0,
    features: [],
    isPopular: false,
    sortOrder: 0,
  });
  const [featureText, setFeatureText] = useState('');
  const [planBusy, setPlanBusy] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLog[] | null>(null);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditBusy, setAuditBusy] = useState(false);

  const [selectedUser, setSelectedUser] = useState<ProjectUser | null>(null);
  const [userSessions, setUserSessions] = useState<SessionInfo[] | null>(null);
  const [sessionsBusy, setSessionsBusy] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editEmailValue, setEditEmailValue] = useState('');

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

  const loadPlans = async (pid: string) => {
    const b = await listBillingPlans(pid);
    if (b.ok) setPlans(b.data.plans);
    else setError(b.error);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: stable loader fns — intentionally mounted once per project
  const loadRest = useCallback(async (pid: string) => {
    const [k, d] = await Promise.all([listKeys(pid), listDomains(pid)]);
    if (k.ok) setKeys(k.data.keys);
    else setError(k.error);
    if (d.ok) setDomains(d.data.domains);
    else setError(d.error);
    void loadPlans(pid);
    void loadSubscription(pid);
  }, []);

  const loadSubscription = async (pid: string) => {
    const [s, inv] = await Promise.all([
      getSubscription(pid),
      listInvoices(pid),
    ]);
    if (s.ok) setSubscription(s.data.subscription);
    else setError(s.error);
    if (inv.ok) setInvoices(inv.data.invoices);
  };

  const loadAdminPlans = async (pid: string) => {
    const r = await listAdminPlans(pid);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setAdminPlans(r.data.plans);
  };

  const openPlanCreate = () => {
    setPlanForm({
      name: '',
      amount: 0,
      currency: 'USD',
      interval: 'month',
      trialDays: 0,
      features: [],
      isPopular: false,
      sortOrder: adminPlans?.length ?? 0,
    });
    setFeatureText('');
    setPlanEditor({ open: true, editing: null });
  };

  const openPlanEdit = (p: BillingPlan) => {
    setPlanForm({
      name: p.name,
      amount: p.amount,
      currency: p.currency || 'USD',
      interval: (p.interval as 'month' | 'year') || 'month',
      trialDays: p.trialDays ?? 0,
      features: p.features ?? [],
      isPopular: p.isPopular,
      isActive: p.isActive,
      sortOrder: p.sortOrder ?? 0,
    });
    setFeatureText((p.features ?? []).join('\n'));
    setPlanEditor({ open: true, editing: p });
  };

  const savePlan = async () => {
    if (!id || !planForm.name.trim()) return;
    setPlanBusy(true);
    setError(null);
    const features = featureText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const payload: PlanInput = {
      ...planForm,
      features,
      name: planForm.name.trim(),
    };
    const r = planEditor.editing
      ? await updatePlan(planEditor.editing.id, payload)
      : await createPlan(id, payload);
    setPlanBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setPlanEditor({ open: false, editing: null });
    await Promise.all([loadAdminPlans(id), void loadPlans(id)]);
  };

  const deactivatePlan = async (p: BillingPlan) => {
    if (!id) return;
    if (
      !confirm(
        `Deactivate "${p.name}"? Existing subscribers keep access; new checkouts stop.`
      )
    )
      return;
    setPlanBusy(true);
    setError(null);
    const r = await deletePlan(p.id);
    setPlanBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    await Promise.all([loadAdminPlans(id), void loadPlans(id)]);
  };

  const loadAudit = useCallback(async (pid: string) => {
    setAuditBusy(true);
    const r = await listAuditLogs(pid, { limit: 50 });
    setAuditBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setAuditLogs(r.data.logs);
    setAuditTotal(r.data.total);
  }, []);

  const loadSessions = useCallback(async (pid: string, userId: string) => {
    setSessionsBusy(true);
    const r = await listProjectUserSessions(pid, userId);
    setSessionsBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setUserSessions(r.data.sessions);
  }, []);

  const revokeSession = async (
    pid: string,
    userId: string,
    sessionId: string
  ) => {
    if (!confirm('Revoke this session? The user will be signed out.')) return;
    const r = await revokeProjectUserSession(pid, userId, sessionId);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    void loadSessions(pid, userId);
  };

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: lazy tab loader — intentionally keyed on tab+id only
  useEffect(() => {
    if (tab === 'audit' && id && auditLogs === null) {
      void loadAudit(id);
    }
  }, [tab, id]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: lazy tab loader — intentionally keyed on tab+id only
  useEffect(() => {
    if (tab === 'billing' && id && adminPlans === null) {
      void loadAdminPlans(id);
    }
  }, [tab, id]);

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

  const saveEmail = async (u: ProjectUser) => {
    if (!id) return;
    const email = editEmailValue.trim();
    if (!email || !email.includes('@')) {
      setError('Invalid email');
      return;
    }
    setBusy(true);
    setError(null);
    const r = await updateProjectUser(id, u.id, { email });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setEditingEmail(null);
    void loadUsers(id, { query: debouncedQ });
  };

  const changeRole = async (u: ProjectUser, role: 'user' | 'admin') => {
    if (!id) return;
    setBusy(true);
    setError(null);
    const r = await updateProjectUser(id, u.id, { role });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    void loadUsers(id, { query: debouncedQ });
  };

  const viewSessions = async (u: ProjectUser) => {
    setSelectedUser(u);
    setUserSessions(null);
    if (id) void loadSessions(id, u.id);
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
    <div className="min-w-0">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0b0b10] text-white p-5 sm:p-6 mb-5 min-w-0">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(520px 220px at 10% 0%, rgba(255,255,255,0.1), transparent 65%), radial-gradient(420px 200px at 95% 100%, rgba(255,255,255,0.05), transparent 60%)',
          }}
        />
        <div className="relative flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="rounded-full p-2 text-white/70 hover:bg-white/10 shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="size-11 rounded-2xl bg-gradient-to-br from-[#3f3f46] to-black flex items-center justify-center text-[16px] font-extrabold shrink-0">
            {project.name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-[19px] sm:text-[21px] font-extrabold tracking-tight flex items-center gap-2 flex-wrap">
              <span className="truncate">{project.name}</span>
              <span className="font-mono text-[11px] font-medium bg-white/10 px-2 py-0.5 rounded-md text-white/70">
                {project.slug}
              </span>
              {project.environment && (
                <Badge tone={project.environment === 'live' ? 'green' : 'gray'}>
                  {project.environment}
                </Badge>
              )}
            </h1>
            <p className="text-[12.5px] text-white/55 truncate">
              {project.description || 'No description'} ·{' '}
              <span className="font-mono text-[11px]">{project.id}</span>
            </p>
          </div>
          <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 rounded-full bg-black/25 border border-white/20 px-3 py-1.5 text-[12px] font-bold shrink-0">
            {total} users
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#e4e6eb] mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            type="button"
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[13.5px] font-semibold whitespace-nowrap border-b-2 -mb-px cursor-pointer ${tab === t.k ? 'border-black text-black' : 'border-transparent text-[#63666f] hover:text-black'}`}
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
                className="pl-9 rounded-full! sm:w-[240px]"
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
                          {editing === u.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="h-8! w-32!"
                                placeholder="Name"
                              />
                              <Button
                                size="sm"
                                className="h-8!"
                                disabled={busy}
                                onClick={() => void saveName(u)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8!"
                                onClick={() => setEditing(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : editingEmail === u.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editEmailValue}
                                onChange={(e) =>
                                  setEditEmailValue(e.target.value)
                                }
                                className="h-8! w-48!"
                                placeholder="Email"
                                type="email"
                              />
                              <Button
                                size="sm"
                                className="h-8!"
                                disabled={busy}
                                onClick={() => void saveEmail(u)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8!"
                                onClick={() => setEditingEmail(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div>
                              <button
                                type="button"
                                className="block text-left font-semibold cursor-pointer hover:underline"
                                onClick={() => {
                                  setEditing(u.id);
                                  setEditName(fullName(u));
                                }}
                              >
                                {fullName(u)}
                              </button>
                              <button
                                type="button"
                                className="block text-left font-mono text-[11px] text-[#63666f] cursor-pointer hover:underline"
                                onClick={() => {
                                  setEditingEmail(u.id);
                                  setEditEmailValue(u.email);
                                }}
                              >
                                {u.email}
                              </button>
                            </div>
                          )}
                        </Td>
                        <Td>
                          <select
                            value={u.role}
                            disabled={busy}
                            onChange={(e) =>
                              void changeRole(
                                u,
                                e.target.value as 'user' | 'admin'
                              )
                            }
                            className="rounded-lg border border-[#e4e6eb] bg-white px-2 py-1 text-[12.5px] font-semibold cursor-pointer disabled:opacity-50"
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        </Td>
                        <Td>
                          <Badge tone={u.blocked ? 'red' : 'green'}>
                            {u.blocked ? 'blocked' : 'active'}
                          </Badge>
                        </Td>
                        <Td right>
                          <span className="inline-flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8!"
                              onClick={() => void viewSessions(u)}
                            >
                              Sessions
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8!"
                              disabled={busy}
                              onClick={() => void toggleBlock(u)}
                            >
                              {u.blocked ? 'Unblock' : 'Block'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8! text-[#dc2626]! hover:bg-red-50!"
                              disabled={busy}
                              onClick={() => void removeUser(u)}
                            >
                              Delete
                            </Button>
                          </span>
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

      {/* Sessions modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          aria-label="Close sessions dialog"
          onClick={() => setSelectedUser(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSelectedUser(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[#e4e6eb]">
              <div>
                <h3 className="font-bold text-[15px]">
                  Sessions — {selectedUser.email}
                </h3>
                <p className="text-[12px] text-[#63666f]">
                  Active sessions for this user
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-[#63666f] hover:text-black cursor-pointer"
              >
                &times;
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {sessionsBusy ? (
                <div className="flex items-center gap-1.5 text-[12px] text-[#63666f]">
                  <Loader2 className="size-3.5 animate-spin" /> Loading
                  sessions…
                </div>
              ) : userSessions === null || userSessions.length === 0 ? (
                <div className="text-[13px] text-[#63666f]">
                  No active sessions.
                </div>
              ) : (
                <div className="space-y-2">
                  {userSessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[#e4e6eb] p-3"
                    >
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-mono truncate">
                          {s.id.slice(0, 16)}…
                        </div>
                        <div className="text-[11px] text-[#63666f]">
                          {s.ip || '—'} · {s.userAgent?.slice(0, 40) || '—'}
                          {s.userAgent && s.userAgent.length > 40 ? '…' : ''}
                        </div>
                        <div className="text-[11px] text-[#63666f]">
                          Created {new Date(s.createdAt).toLocaleDateString()}
                          {s.lastSeenAt
                            ? ` · Last seen ${new Date(s.lastSeenAt).toLocaleDateString()}`
                            : ''}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[#dc2626]! hover:bg-red-50! shrink-0"
                        disabled={busy}
                        onClick={() =>
                          id && void revokeSession(id, selectedUser.id, s.id)
                        }
                      >
                        Revoke
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[#e4e6eb] flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
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
                    className={`px-3.5 py-1.5 rounded-full cursor-pointer ${keyType === t ? 'bg-black text-white' : 'text-[#63666f]'}`}
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
              <Empty title="No keys yet" desc="Create one above" />
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
                        className="text-[#dc2626]! hover:bg-red-50!"
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
          {/* My subscription — real edit actions */}
          <Card>
            <CardHeader>
              <CardTitle>My subscription</CardTitle>
              <CardDesc>
                Your seat in this project. Cancel takes effect at period end —
                resume any time before that.
              </CardDesc>
            </CardHeader>
            <CardBody>
              {subscription === undefined ? (
                <Skeleton className="h-12" />
              ) : subscription === null ? (
                <div className="flex items-center gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold">Free Plan</span>
                      <Badge tone="gray">active</Badge>
                    </div>
                    <div className="text-[12px] text-[#63666f] mt-1">
                      You're on the free tier. Upgrade to unlock more features.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-bold">
                        {plans?.find((p) => p.id === subscription.planId)
                          ?.name || 'Plan'}
                      </span>
                      <Badge
                        tone={
                          subscription.status === 'active' &&
                          !subscription.cancelAtPeriodEnd
                            ? 'green'
                            : 'amber'
                        }
                      >
                        {subscription.cancelAtPeriodEnd
                          ? 'canceling'
                          : subscription.status}
                      </Badge>
                    </div>
                    <div className="text-[12px] text-[#63666f] mt-1 font-mono">
                      {subscription.currentPeriodEnd
                        ? `renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                        : subscription.id}
                    </div>
                  </div>
                  <div className="sm:ml-auto flex gap-2 shrink-0">
                    {subscription.cancelAtPeriodEnd ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={async () => {
                          if (!id) return;
                          setBusy(true);
                          setError(null);
                          const r = await resumeSubscription(id);
                          setBusy(false);
                          if (!r.ok) return setError(r.error);
                          void loadSubscription(id);
                        }}
                      >
                        Resume
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[#dc2626]! hover:bg-red-50!"
                        disabled={busy}
                        onClick={async () => {
                          if (!id) return;
                          if (
                            !confirm(
                              'Cancel at period end? You keep access until then.'
                            )
                          )
                            return;
                          setBusy(true);
                          setError(null);
                          const r = await cancelSubscription(id);
                          setBusy(false);
                          if (!r.ok) return setError(r.error);
                          void loadSubscription(id);
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Plan catalog (admin) — create/edit/deactivate */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Plan catalog</CardTitle>
                  <CardDesc>
                    Manage the plans customers see at checkout. Creating a plan
                    without a Paddle price auto-creates product + price.
                  </CardDesc>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={planBusy}
                  onClick={openPlanCreate}
                >
                  <Plus className="size-3.5 mr-1" /> New plan
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {adminPlans === null ? (
                <Skeleton className="h-16" />
              ) : adminPlans.length === 0 ? (
                <Empty
                  title="No plans yet"
                  desc="Create your first plan — a Paddle price is created automatically."
                />
              ) : (
                <TableWrap>
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-black/[0.06]">
                        <Th>Name</Th>
                        <Th>Price</Th>
                        <Th>Status</Th>
                        <Th right>Actions</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminPlans.map((p) => (
                        <tr key={p.id} className="border-b border-black/[0.04]">
                          <Td>
                            <span className="font-medium">{p.name}</span>
                            {p.isPopular && (
                              <Badge tone="amber" className="ml-2">
                                popular
                              </Badge>
                            )}
                          </Td>
                          <Td mono>
                            $
                            {(p.amount / 100).toFixed(
                              p.amount % 100 === 0 ? 0 : 2
                            )}
                            <span className="text-[#63666f]">
                              /{p.interval}
                            </span>
                          </Td>
                          <Td>
                            <Badge tone={p.isActive ? 'green' : 'gray'}>
                              {p.isActive ? 'active' : 'inactive'}
                            </Badge>
                          </Td>
                          <Td right>
                            <div className="inline-flex gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={planBusy}
                                onClick={() => openPlanEdit(p)}
                              >
                                <Pencil className="size-3.5" /> Edit
                              </Button>
                              {p.isActive && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-[#dc2626]! hover:bg-red-50!"
                                  disabled={planBusy}
                                  onClick={() => void deactivatePlan(p)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              )}
                            </div>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              )}
            </CardBody>
          </Card>

          {/* Plans with real checkout */}
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
              {plans.map((p) => {
                // On the free tier (no subscription), a $0 plan IS the current plan.
                const current =
                  subscription?.planId === p.id ||
                  (subscription === null && p.amount === 0);
                return (
                  <Card
                    key={p.id}
                    className={`card-hover flex flex-col ${current ? '!border-black' : ''}`}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{p.name}</CardTitle>
                        <Badge tone={current ? 'mono' : 'gray'}>
                          {current ? 'Current' : 'Active'}
                        </Badge>
                      </div>
                      <div className="mt-1.5">
                        <span className="text-[24px] font-extrabold tracking-tight">
                          $
                          {(p.amount / 100).toFixed(
                            p.amount % 100 === 0 ? 0 : 2
                          )}
                        </span>
                        <span className="text-[12.5px] text-[#63666f]">
                          /{p.interval}
                        </span>
                      </div>
                    </CardHeader>
                    <CardBody className="flex flex-col flex-1">
                      <ul className="text-[12.5px] text-[#3c3f47] space-y-1.5 list-disc pl-4 flex-1">
                        {p.features.map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                      <Button
                        size="sm"
                        variant={current ? 'outline' : 'primary'}
                        className="w-full mt-3"
                        disabled={busy || current}
                        onClick={async () => {
                          if (!id || current) return;
                          setBusy(true);
                          setError(null);
                          // Pass the full page URL as the return target so the hosted-fallback
                          // success page sends the user back to this project, not the site root.
                          const r = await startCheckout(
                            p.id,
                            id,
                            window.location.href
                          );
                          if (!r.ok) {
                            setBusy(false);
                            return setError(r.error);
                          }
                          try {
                            await ensurePaddle();
                            if (r.data.transactionId) {
                              onCheckoutResult((e) => {
                                if (e.name === 'checkout.completed') {
                                  void loadSubscription(id);
                                  void loadPlans(id);
                                }
                              });
                              openCheckout(r.data.transactionId);
                            } else if (r.data.checkoutUrl) {
                              window.location.assign(r.data.checkoutUrl);
                            }
                          } catch (err) {
                            // Fallback: open the hosted checkout URL directly
                            if (r.data.checkoutUrl) {
                              window.location.assign(r.data.checkoutUrl);
                            } else {
                              setError(
                                err instanceof Error ? err.message : String(err)
                              );
                            }
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        {current ? 'Current plan' : `Subscribe — ${p.name}`}
                      </Button>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDesc>Your billing history for this project.</CardDesc>
            </CardHeader>
            <CardBody>
              {invoices === null ? (
                <Skeleton className="h-16" />
              ) : invoices.length === 0 ? (
                <div className="text-[13px] text-[#63666f]">
                  No invoices yet.
                </div>
              ) : (
                <TableWrap>
                  <table className="w-full min-w-[480px]">
                    <thead>
                      <tr className="border-b border-[#e4e6eb]">
                        <Th>Date</Th>
                        <Th>Amount</Th>
                        <Th>Status</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr
                          key={inv.id}
                          className="border-b border-[#f0f1f4] last:border-0"
                        >
                          <Td mono>
                            {inv.billedAt
                              ? new Date(inv.billedAt).toLocaleDateString()
                              : '—'}
                          </Td>
                          <Td>
                            ${(inv.amount / 100).toFixed(2)} {inv.currency}
                          </Td>
                          <Td>
                            <Badge
                              tone={
                                inv.status === 'paid'
                                  ? 'green'
                                  : inv.status === 'overdue'
                                    ? 'red'
                                    : 'gray'
                              }
                            >
                              {inv.status}
                            </Badge>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              )}
            </CardBody>
          </Card>

          <Alert tone="gray">
            Plan catalog management is a billing-admin operation (
            <span className="font-mono text-[11.5px]">
              PATCH /v1/admin/plans/:id
            </span>{' '}
            with{' '}
            <span className="font-mono text-[11.5px]">
              BILLING_ADMIN_SECRET
            </span>
            ). Everything above — subscribe, cancel, resume, invoices — runs as
            you, live.
          </Alert>
        </div>
      )}

      {tab === 'audit' && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <CardTitle>Audit logs</CardTitle>
              <CardDesc>
                {auditLogs === null
                  ? 'Loading…'
                  : `${auditLogs.length} shown · ${auditTotal} total`}
              </CardDesc>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={auditBusy}
              onClick={() => id && void loadAudit(id)}
            >
              Refresh
            </Button>
          </CardHeader>
          <CardBody>
            {auditLogs === null ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : auditLogs.length === 0 ? (
              <Empty
                title="No audit logs"
                desc="Actions like sign-ups, role changes, and API key operations will appear here."
              />
            ) : (
              <TableWrap>
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-[#e4e6eb]">
                      <Th>Action</Th>
                      <Th>Actor</Th>
                      <Th>Target</Th>
                      <Th right>Date</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-[#f0f1f4] last:border-0"
                      >
                        <Td>
                          <Badge
                            tone={
                              log.action.includes('delete') ||
                              log.action.includes('block')
                                ? 'red'
                                : log.action.includes('create') ||
                                    log.action.includes('role')
                                  ? 'green'
                                  : 'gray'
                            }
                          >
                            {log.action}
                          </Badge>
                        </Td>
                        <Td>
                          <div className="text-[12.5px]">
                            {log.actorEmail || log.actorId}
                          </div>
                        </Td>
                        <Td>
                          <div className="text-[12.5px] font-mono text-[#63666f]">
                            {log.targetType && `${log.targetType}: `}
                            {log.targetId?.slice(0, 12) || '—'}
                          </div>
                        </Td>
                        <Td right>
                          <div className="text-[12px] text-[#63666f] font-mono">
                            {new Date(log.createdAt).toLocaleDateString()}{' '}
                            {new Date(log.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </CardBody>
        </Card>
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
          <Card className="border-red-200!">
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

      {tab !== 'overview' && tab !== 'danger' && tab !== 'audit' && (
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

      {/* Plan create/edit dialog */}
      <Dialog
        open={planEditor.open}
        onClose={() => setPlanEditor({ open: false, editing: null })}
        title={
          planEditor.editing ? `Edit ${planEditor.editing.name}` : 'New plan'
        }
        desc={
          planEditor.editing
            ? 'Update pricing or features. The Paddle price stays linked.'
            : 'Create a plan; a Paddle product + price are created automatically.'
        }
      >
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input
              placeholder="Pro"
              value={planForm.name}
              onChange={(e) =>
                setPlanForm({ ...planForm, name: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount (cents)</Label>
              <Input
                type="number"
                min={0}
                value={planForm.amount}
                onChange={(e) =>
                  setPlanForm({
                    ...planForm,
                    amount: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label>Billing interval</Label>
              <select
                value={planForm.interval}
                onChange={(e) =>
                  setPlanForm({
                    ...planForm,
                    interval: e.target.value as 'month' | 'year',
                  })
                }
                className="w-full rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 text-[13.5px] outline-none focus:border-black/20"
              >
                <option value="month">monthly</option>
                <option value="year">yearly</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Trial days</Label>
              <Input
                type="number"
                min={0}
                max={365}
                value={planForm.trialDays ?? 0}
                onChange={(e) =>
                  setPlanForm({
                    ...planForm,
                    trialDays: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label>Sort order</Label>
              <Input
                type="number"
                min={0}
                value={planForm.sortOrder ?? 0}
                onChange={(e) =>
                  setPlanForm({
                    ...planForm,
                    sortOrder: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <div>
            <Label>Features (one per line)</Label>
            <textarea
              rows={4}
              placeholder={'Unlimited projects\nPriority support'}
              value={featureText}
              onChange={(e) => setFeatureText(e.target.value)}
              className="w-full rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 text-[13.5px] outline-none focus:border-black/20 resize-y"
            />
          </div>
          <label className="flex items-center gap-2 text-[13px] font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!planForm.isPopular}
              onChange={(e) =>
                setPlanForm({ ...planForm, isPopular: e.target.checked })
              }
              className="size-4 rounded"
            />
            Highlight as popular
          </label>
          {error && <Alert tone="red">{error}</Alert>}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              disabled={planBusy}
              onClick={() => setPlanEditor({ open: false, editing: null })}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={planBusy || !planForm.name.trim()}
              onClick={() => void savePlan()}
            >
              {planBusy ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {planEditor.editing ? 'Save changes' : 'Create plan'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
