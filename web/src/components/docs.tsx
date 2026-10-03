import { ArrowLeft, ArrowRight, BookOpen, Check, Copy, FileText, Sparkles } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { DOC_GROUPS, DOC_PAGES, docsInGroup, prevNext } from '../docs/manifest';
import { CodeBlock } from './CodeBlock';

/* ── Paddle-style building blocks ── */

export function Callout({ tone = 'info', title, children }: { tone?: 'info' | 'warning' | 'success'; title?: string; children: ReactNode }) {
  const styles = {
    info: 'border-sky-500/25 bg-sky-500/[0.07] text-sky-950',
    warning: 'border-amber-500/30 bg-amber-500/[0.09] text-amber-950',
    success: 'border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-950',
  } as const;
  const bar = { info: 'bg-sky-500', warning: 'bg-amber-500', success: 'bg-emerald-500' } as const;
  return (
    <div className={`relative overflow-hidden rounded-xl border px-4 py-3 text-[13px] leading-relaxed ${styles[tone]}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${bar[tone]}`} />
      {title && <div className="font-bold text-[13px] mb-0.5">{title}</div>}
      <div className="text-[#3f3f46]">{children}</div>
    </div>
  );
}

export function CodeTabs({ tabs }: { tabs: Array<{ label: string; lang: string; title: string; code: string }> }) {
  const [i, setI] = useState(0);
  const t = tabs[i];
  return (
    <div className="min-w-0">
      <div className="flex gap-1 rounded-t-xl border border-b-0 border-[#232329] bg-[#121218] px-2 pt-2">
        {tabs.map((tab, n) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setI(n)}
            className={`rounded-lg px-3 py-1.5 font-mono text-[11.5px] font-semibold cursor-pointer transition-colors ${n === i ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="[&_div]:!rounded-t-none">
        <CodeBlock title={t.title} lang={t.lang} code={t.code} />
      </div>
    </div>
  );
}

export function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  const color =
    method === 'GET' ? 'bg-sky-500/15 text-sky-700 border-sky-500/25'
    : method === 'POST' ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/25'
    : method === 'PATCH' ? 'bg-amber-500/15 text-amber-800 border-amber-500/30'
    : 'bg-red-500/10 text-red-700 border-red-500/25';
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5">
      <span className={`inline-flex w-fit shrink-0 items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold ${color}`}>{method}</span>
      <code className="font-mono text-[12px] font-semibold break-all">{path}</code>
      <span className="text-[12.5px] text-[#63666f] sm:ml-auto sm:text-right sm:pl-3">{desc}</span>
    </div>
  );
}

export function Steps({ items }: { items: Array<{ title: string; desc: string }> }) {
  return (
    <ol className="space-y-2.5">
      {items.map((s, n) => (
        <li key={s.title} className="flex gap-3 rounded-xl border border-black/[0.08] bg-white p-4">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-black font-mono text-[12px] font-bold text-white">{n + 1}</span>
          <div className="min-w-0">
            <div className="text-[13.5px] font-bold">{s.title}</div>
            <div className="mt-0.5 text-[13px] leading-relaxed text-[#52525b]">{s.desc}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function CopyMarkdown({ slug, markdown }: { slug: string; markdown: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = markdown;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e6eb] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#3f3f46] hover:border-black hover:text-black cursor-pointer transition-colors"
      >
        {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
        {copied ? 'Copied for your LLM' : 'Copy for LLM'}
      </button>
      <a
        href="/llms.txt"
        className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e6eb] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#3f3f46] hover:border-black hover:text-black transition-colors"
      >
        <Sparkles className="size-3.5" /> llms.txt
      </a>
      <span className="hidden font-mono text-[11px] text-[#9a9da8] self-center">/docs/{slug}</span>
    </div>
  );
}

/* ── Sidebar + layout (Paddle-like: grouped nav, breadcrumb, prev/next) ── */

export function DocsSidebar({ active }: { active?: string }) {
  return (
    <nav aria-label="Docs sections" className="space-y-4">
      {DOC_GROUPS.map((g) => {
        const items = docsInGroup(g);
        if (items.length === 0) return null;
        return (
          <div key={g}>
            <div className="px-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#a1a1aa]">{g}</div>
            <div className="space-y-0.5">
              {items.map((s) => (
                <Link
                  key={s.slug}
                  to={`/docs/${s.slug}`}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-[7px] text-left text-[13px] font-medium transition-colors ${active === s.slug ? 'bg-black text-white font-semibold' : 'text-[#63666f] hover:bg-black/[0.04] hover:text-black'}`}
                >
                  {s.title}
                  {active === s.slug && <ArrowRight className="size-3.5 shrink-0" />}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export function DocsShell({ slug, toc, children }: { slug?: string; toc?: Array<{ id: string; label: string }>; children: ReactNode }) {
  const meta = DOC_PAGES.find((d) => d.slug === slug);
  const { prev, next } = slug ? prevNext(slug) : {};
  return (
    <div className="min-w-0">
      {meta && (
        <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-[12px] text-[#9a9da8]">
          <Link to="/docs" className="hover:text-black">Docs</Link>
          <span>/</span>
          <span>{meta.group}</span>
          <span>/</span>
          <span className="font-semibold text-black">{meta.title}</span>
        </nav>
      )}
      <div className="flex gap-6 items-start min-w-0">
        <aside className="hidden lg:block w-[228px] shrink-0 sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto rounded-2xl border border-[#e4e6eb] bg-white p-3">
          <DocsSidebar active={slug} />
          <Link to="/ui" className="mt-3 block rounded-xl bg-black p-4 text-white">
            <div className="flex items-center gap-1.5 text-[13px] font-bold"><BookOpen className="size-3.5" /> Prefer visuals?</div>
            <div className="text-[12px] text-white/70 mt-0.5">Every component, live in the UI kit →</div>
          </Link>
        </aside>

        <article className="flex-1 min-w-0 rounded-2xl border border-[#e4e6eb] bg-white px-5 sm:px-8 py-6 sm:py-8">
          {children}
          {meta && (
            <div className="mt-10 grid gap-2 sm:grid-cols-2 border-t border-[#e4e6eb] pt-5">
              {prev ? (
                <Link to={`/docs/${prev.slug}`} className="group rounded-xl border border-[#e4e6eb] p-4 hover:border-black transition-colors">
                  <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#9a9da8]"><ArrowLeft className="size-3" /> Previous</div>
                  <div className="mt-1 text-[13.5px] font-bold group-hover:underline">{prev.title}</div>
                </Link>
              ) : <span />}
              {next && (
                <Link to={`/docs/${next.slug}`} className="group rounded-xl border border-[#e4e6eb] p-4 text-right hover:border-black transition-colors">
                  <div className="flex items-center justify-end gap-1 text-[11px] font-bold uppercase tracking-wider text-[#9a9da8]">Next <ArrowRight className="size-3" /></div>
                  <div className="mt-1 text-[13.5px] font-bold group-hover:underline">{next.title}</div>
                </Link>
              )}
            </div>
          )}
        </article>

        {toc && toc.length > 0 && (
          <aside className="hidden xl:block w-[190px] shrink-0 sticky top-6">
            <div className="rounded-2xl border border-[#e4e6eb] bg-white p-4">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#9a9da8]"><FileText className="size-3" /> On this page</div>
              <div className="mt-2 space-y-1">
                {toc.map((t) => (
                  <a key={t.id} href={`#${t.id}`} className="block rounded-md px-2 py-1 text-[12.5px] text-[#63666f] hover:bg-black/[0.04] hover:text-black">{t.label}</a>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export function DocHeader({ slug }: { slug: string }) {
  const meta = DOC_PAGES.find((d) => d.slug === slug);
  if (!meta) return null;
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-black px-2.5 py-1 text-[11px] font-bold text-white">{meta.group}</span>
        <span className="rounded-full border border-[#e4e6eb] px-2.5 py-1 text-[11px] font-semibold text-[#63666f]">{meta.level}</span>
        <span className="font-mono text-[11px] text-[#9a9da8]">{meta.readingMins} min · updated {meta.updated}</span>
      </div>
      <h1 className="mt-3 text-[26px] sm:text-[32px] font-extrabold tracking-tight text-balance">{meta.title}</h1>
      <p className="mt-2 max-w-[640px] text-[14px] leading-relaxed text-[#52525b]">{meta.excerpt}</p>
    </header>
  );
}
