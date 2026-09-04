import { ArrowRight, Plus, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
} from '../components/ui';
import {
  type Project,
  createProject,
  deleteProject,
  listProjectUsers,
  listProjects,
} from '../lib/api';

export default function Projects() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [desc, setDesc] = useState('');
  const [mutError, setMutError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const r = await listProjects();
    if (!r.ok) {
      setProjects([]);
      setError(r.error);
      return;
    }
    setProjects(r.data.projects);
    // Live user counts (cheap: limit=1, we only read `total`).
    const results = await Promise.all(
      r.data.projects.map((p) =>
        listProjectUsers(p.id, { limit: 1 }).then((u) => ({
          id: p.id,
          total: u.ok ? u.data.total : 0,
        }))
      )
    );
    setCounts(Object.fromEntries(results.map((c) => [c.id, c.total])));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const list = projects || [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (p) => p.name.toLowerCase().includes(needle) || p.slug.includes(needle)
    );
  }, [projects, q]);

  const create = async () => {
    setMutError(null);
    setBusy(true);
    const r = await createProject({
      name: name.trim(),
      slug: slug.trim(),
      description: desc.trim() || undefined,
    });
    setBusy(false);
    if (!r.ok) {
      setMutError(r.error);
      return;
    }
    setName('');
    setSlug('');
    setDesc('');
    setShowNew(false);
    void load();
  };

  const remove = async (p: Project) => {
    if (
      !confirm(
        `Delete project "${p.name}"? Users, keys and domains go with it. This cannot be undone.`
      )
    )
      return;
    const r = await deleteProject(p.id);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    void load();
  };

  return (
    <div className="min-w-0">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0b0b10] text-white p-5 sm:p-7 mb-5 min-w-0">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(560px 240px at 12% 0%, rgba(255,255,255,0.1), transparent 65%), radial-gradient(480px 240px at 92% 100%, rgba(255,255,255,0.05), transparent 60%)',
          }}
        />
        <div className="relative flex flex-col gap-4 min-w-0">
          <div className="min-w-0">
            <h1 className="font-display text-[22px] sm:text-[26px] font-extrabold tracking-tight">
              Projects
            </h1>
            <p className="mt-1 max-w-[560px] text-[13px] leading-relaxed text-white/60">
              Every project is isolated: its own users, API keys, domains and
              billing plans.{' '}
              <span className="font-mono text-[11.5px] text-white/80">
                {projects === null ? '…' : `${projects.length} total`}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
              <input
                placeholder="Search projects"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-9 w-full sm:w-[220px] rounded-full border border-white/15 bg-white/[0.07] pl-9 pr-4 text-[13px] text-white placeholder:text-white/35 focus:border-black focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-3.5 text-[12.5px] font-semibold text-white/80 hover:bg-white/[0.12] cursor-pointer"
            >
              <RefreshCw className="size-3.5" /> Refresh
            </button>
            <Button
              size="sm"
              className="btn-glow border-0! bg-black! hover:bg-[#27272a]!"
              onClick={() => {
                setShowNew(true);
                setMutError(null);
              }}
            >
              <Plus className="size-3.5" /> New project
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Alert>Could not load projects: {error}</Alert>
        </div>
      )}

      {projects === null ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[168px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty
          title={projects.length === 0 ? 'No projects yet' : 'No matches'}
          desc={
            projects.length === 0
              ? 'Create your first project — users, keys, domains and billing live under it.'
              : `Nothing matches "${q}".`
          }
          action={
            projects.length === 0 ? (
              <Button size="sm" onClick={() => setShowNew(true)}>
                <Plus className="size-3.5" /> New project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p, i) => (
            <Card
              key={p.id}
              className="card-hover flex flex-col overflow-hidden"
            >
              <div
                className="h-1.5"
                style={{
                  background: `linear-gradient(90deg, ${['#09090b,#52525b', '#27272a,#a1a1aa', '#09090b,#71717a', '#3f3f46,#d4d4d8', '#18181b,#52525b'][i % 5]})`,
                }}
              />
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="size-9 rounded-xl bg-gradient-to-br from-[#1a1a22] to-[#0b0b10] text-white flex items-center justify-center text-[13px] font-extrabold ring-1 ring-black/10">
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <Badge tone="mono">{counts[p.id] ?? '…'} users</Badge>
                </div>
                <CardTitle>{p.name}</CardTitle>
                <CardDesc>
                  <span className="font-mono text-[11px]">{p.slug}</span>
                  {p.description ? ` — ${p.description}` : ''}
                </CardDesc>
              </CardHeader>
              <CardBody className="mt-auto flex gap-2">
                <Link to={`/admin/projects/${p.id}`} className="flex-1">
                  <Button size="sm" className="w-full">
                    Open <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[#dc2626]! hover:bg-red-50!"
                  onClick={() => void remove(p)}
                >
                  Delete
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Prefer the terminal?</CardTitle>
          <CardDesc>Same operations via the CLI.</CardDesc>
        </CardHeader>
        <CardBody>
          <CodeBlock
            title="cli — projects"
            lang="bash"
            code={`slyxup project list --json\nslyxup project create "Acme" --json`}
          />
        </CardBody>
      </Card>

      <Dialog
        open={showNew}
        onClose={() => setShowNew(false)}
        title="New project"
        desc="Slug: lowercase letters, numbers and hyphens only."
      >
        <div className="space-y-3.5">
          <div>
            <Label htmlFor="np-name">Name</Label>
            <Input
              id="np-name"
              placeholder="Acme Inc"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="np-slug">Slug</Label>
            <Input
              id="np-slug"
              placeholder="acme"
              value={slug}
              onChange={(e) =>
                setSlug(
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                )
              }
            />
          </div>
          <div>
            <Label htmlFor="np-desc">Description (optional)</Label>
            <Input
              id="np-desc"
              placeholder="Production workspace"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
          {mutError && <Alert>{mutError}</Alert>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={busy || !name.trim() || !slug.trim()}
              onClick={() => void create()}
            >
              {busy ? 'Creating…' : 'Create project'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
