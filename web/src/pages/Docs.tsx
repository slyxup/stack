import { ArrowRight, ArrowUpRight, BookOpen, Search, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo';
import { DOC_GROUPS, DOC_PAGES, docsInGroup } from '../docs/manifest';

/** Docs hub — Paddle-style index linking out to /docs/:slug pages. */
export default function Docs() {
  const [q, setQ] = useState('');
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return DOC_PAGES;
    return DOC_PAGES.filter(
      (s) =>
        s.title.toLowerCase().includes(needle) ||
        s.excerpt.toLowerCase().includes(needle) ||
        s.keywords.includes(needle) ||
        s.group.toLowerCase().includes(needle)
    );
  }, [q]);
  const grouped = q.trim()
    ? [{ group: `Results (${visible.length})`, items: visible }]
    : DOC_GROUPS.map((g) => ({ group: g, items: docsInGroup(g) }));

  return (
    <div className="min-w-0">
      <Seo
        title="Documentation"
        description="27 Paddle-grade guides for SlyxUp auth + billing: quickstart, React SDK, API keys, Paddle checkout, self-hosting. Every page LLM-ready with copyable Markdown."
        path="/docs"
      />
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0b0b10] text-white p-6 sm:p-8 min-w-0">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(600px 260px at 15% 0%, rgba(255,255,255,0.09), transparent 65%), radial-gradient(500px 260px at 90% 100%, rgba(255,255,255,0.05), transparent 60%)',
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
          <div className="min-w-0">
            <h1 className="font-display flex items-center gap-2.5 text-[22px] sm:text-[26px] font-extrabold tracking-tight">
              <span className="flex size-9 items-center justify-center rounded-xl bg-white/10 shrink-0">
                <BookOpen className="size-[18px]" />
              </span>
              Documentation
            </h1>
            <p className="mt-1.5 max-w-[560px] text-[13px] leading-relaxed text-white/60">
              Paddle-grade guides for auth + billing: concepts, endpoints, code in
              TypeScript + cURL, and LLM-ready Markdown on every page.{' '}
              <Link to="/admin" className="font-semibold text-white underline underline-offset-4">
                Open admin →
              </Link>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href="/llms.txt" className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[12px] font-semibold text-white/80 hover:text-white hover:border-white/30 transition-colors">
                <Sparkles className="size-3.5" /> llms.txt — every page, one file
              </a>
              <Link to="/docs/quickstart" className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-bold text-black hover:bg-white/85 transition-colors">
                Start in 5 steps <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
          <div className="sm:ml-auto w-full sm:w-[280px] shrink-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search docs… (try “paddle”)"
                className="h-10 w-full rounded-full border border-white/15 bg-white/[0.07] pl-10 pr-4 text-[13px] text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grouped cards */}
      <div className="mt-6 space-y-7">
        {grouped.map(({ group, items }) => (
          <section key={group} className="min-w-0">
            <div className="flex items-center gap-2 px-1">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9a9da8]">{group}</h2>
              <span className="font-mono text-[11px] text-[#c6c9d2]">{items.length}</span>
            </div>
            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
              {items.map((s) => (
                <Link
                  key={s.slug}
                  to={`/docs/${s.slug}`}
                  className="group rounded-2xl border border-[#e4e6eb] bg-white p-4 sm:p-5 hover:border-black transition-colors min-w-0"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-bold group-hover:underline">{s.title}</span>
                        <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10.5px] font-bold text-[#63666f]">{s.level}</span>
                      </div>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-[#63666f] line-clamp-2">{s.excerpt}</p>
                      <div className="mt-2 font-mono text-[11px] text-[#9a9da8]">/docs/{s.slug} · {s.readingMins} min</div>
                    </div>
                    <ArrowUpRight className="size-4 shrink-0 text-[#9a9da8] group-hover:text-black group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
            {items.length === 0 && (
              <div className="mt-2 rounded-2xl border border-dashed border-[#e4e6eb] p-6 text-center text-[13px] text-[#63666f]">
                No pages match “{q}”. Try “checkout”, “session” or “paddle”.
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-2.5">
        <Link to="/ui" className="flex-1 rounded-2xl bg-black p-5 text-white hover:bg-black/90 transition-colors">
          <div className="text-[14px] font-bold">Prefer visuals?</div>
          <div className="text-[12.5px] text-white/70 mt-0.5">Every component, live in the UI kit →</div>
        </Link>
        <a href="/llms.txt" className="flex-1 rounded-2xl border border-[#e4e6eb] bg-white p-5 hover:border-black transition-colors">
          <div className="flex items-center gap-1.5 text-[14px] font-bold"><Sparkles className="size-4" /> Building with an agent?</div>
          <div className="text-[12.5px] text-[#63666f] mt-0.5">Fetch /llms.txt — titles, excerpts + URLs for all {DOC_PAGES.length} pages.</div>
        </a>
      </div>
    </div>
  );
}
