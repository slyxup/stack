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
  PageHeader,
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
    <div>
      <PageHeader
        title="Projects"
        desc="Every project is isolated: its own users, API keys, domains and billing plans."
        actions={
          <>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9da8]" />
              <Input
                placeholder="Search projects"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 w-[200px] !rounded-full"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="size-3.5" /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowNew(true);
                setMutError(null);
              }}
            >
              <Plus className="size-3.5" /> New project
            </Button>
          </>
        }
      />

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
          {filtered.map((p) => (
            <Card key={p.id} className="card-hover flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="size-9 rounded-xl bg-[#101014] text-white flex items-center justify-center text-[13px] font-extrabold">
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <Badge tone="violet">{counts[p.id] ?? '…'} users</Badge>
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
                  className="!text-[#dc2626] hover:!bg-red-50"
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
