import {
  ArrowRight,
  Blocks,
  BookOpen,
  Check,
  Copy,
  CreditCard,
  Globe,
  KeyRound,
  Lock,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';
import {
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { CodeBlock } from '../components/CodeBlock';
import { Reveal } from '../components/Reveal';
import { PublicNav, SectionHead, SiteFooter } from '../components/marketing';
import { Seo, orgJsonLd, softwareJsonLd } from '../components/Seo';
import { Button } from '../components/ui';
import { AUTH_URL, BILLING_URL } from '../lib/api';

const STACK = ['Workers', 'D1', 'KV', 'Paddle', 'Zod', 'Drizzle', 'Hono', 'React 19'];

/* ── mouse spotlight for premium cards ── */
function onSpot(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
}

/* ── animated count-up on first view ── */
function useCountUp(target: number, run: boolean, dur = 1300) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target, dur]);
  return v;
}

function CopyChip({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard
          ?.writeText(text)
          .catch(() => {})
          .finally(() => {
            setDone(true);
            setTimeout(() => setDone(false), 1400);
          });
      }}
      className="group inline-flex max-w-full items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] py-2 pl-4 pr-2.5 font-mono text-[12px] text-white/70 hover:border-white/30 hover:text-white transition-colors cursor-pointer"
    >
      <span className="truncate">{label}</span>
      {done ? (
        <Check className="size-3.5 shrink-0 text-emerald-400" />
      ) : (
        <Copy className="size-3.5 shrink-0 opacity-50 group-hover:opacity-100" />
      )}
    </button>
  );
}

const TERMINAL_TABS = [
  {
    id: 'install',
    label: 'Install',
    title: 'terminal — install',
    lang: 'bash',
    code: 'pnpm add @slyxup/core @slyxup/ui',
  },
  {
    id: 'auth',
    label: 'Auth',
    title: 'app.tsx — auth in 6 lines',
    lang: 'tsx',
    code: `import { SlyxUpProvider, SignIn, applyTheme } from "@slyxup/ui"

applyTheme({ accent: "mono", radius: 10 })

<SlyxUpProvider publishableKey="pk_...">
  <SignIn layout="split" />
</SlyxUpProvider>`,
  },
  {
    id: 'billing',
    label: 'Billing',
    title: 'billing.ts — Paddle checkout',
    lang: 'ts',
    code: `const plans = await billing.listPlans(projectId)
const { checkoutUrl } = await billing.checkout(plans[0].id, {
  successUrl: location.origin + "/billing/return",
})
window.location.assign(checkoutUrl) // Paddle takes over`,
  },
] as const;

const BENTO = [
  {
    icon: Users,
    tag: 'Moderation',
    title: 'Users, fully moderated',
    desc: 'Server-side search, edit roles, block with instant session revoke, or delete — per project, paginated, zero mock data.',
    visual: (
      <div className="mt-4 flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
        <span className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-emerald-300">ada@… admin</span>
        <span className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-white/50">q=ada · limit=50</span>
        <span className="rounded-md border border-red-400/20 bg-red-400/10 px-2 py-1 text-red-300">block → revoke all</span>
      </div>
    ),
    span: 'sm:col-span-2',
  },
  {
    icon: KeyRound,
    tag: 'Keys',
    title: 'Keys that scale',
    desc: 'pk_ for browsers, sk_ for servers. Hashed at rest, revealed once, revoked instantly.',
    visual: (
      <div className="mt-4 font-mono text-[11px] text-white/50">pk_… <span className="text-white/25">→</span> <span className="text-emerald-300">origin ✓</span></div>
    ),
    span: '',
  },
  {
    icon: CreditCard,
    tag: 'Paddle',
    title: 'Billing, Paddle-backed',
    desc: 'Plans, hosted checkout, subscriptions + invoices stream live from the billing Worker.',
    visual: (
      <div className="mt-4 flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
        <span className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-amber-300">plan → checkout</span>
        <ArrowRight className="size-3 text-white/30" />
        <span className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-white/50">webhook → access</span>
      </div>
    ),
    span: '',
  },
  {
    icon: Globe,
    tag: 'Domains',
    title: 'Domains & CORS',
    desc: 'Allowlist the exact origins per key. Localhost always works; live is strict.',
    visual: (
      <div className="mt-4 font-mono text-[11px] text-white/50">app.example.com <span className="text-emerald-300">✓ allowed</span></div>
    ),
    span: '',
  },
  {
    icon: Blocks,
    tag: 'UI kit',
    title: '15 components, 3 auth layouts',
    desc: 'The same @slyxup/ui kit — centered, split, minimal. Seven accents, dark mode, compact density.',
    visual: (
      <div className="mt-4 flex flex-wrap gap-1.5">
        {['centered', 'split', 'minimal'].map((l) => (
          <span key={l} className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-white/60">{l}</span>
        ))}
      </div>
    ),
    span: 'sm:col-span-2',
  },
];

const MONEY_LOOP = [
  { n: '01', t: 'List plans', d: 'GET /v1/billing/plans — active only, ordered by sortOrder, one flagged popular.' },
  { n: '02', t: 'Checkout', d: 'POST /v1/billing/checkout → checkoutUrl. Overlay or hosted redirect; same-tab avoids blockers.' },
  { n: '03', t: 'Webhook truth', d: 'subscription.created creates the row. The webhook — not the redirect — grants access.' },
  { n: '04', t: 'Gate access', d: 'getEntitlements(projectId) server-side. features.includes("export") or 403.' },
];

const INTEGRATE_TABS = [
  {
    id: 'react',
    label: 'React',
    lang: 'tsx',
    code: `import { SlyxUpProvider, SignIn, UserButton } from "@slyxup/ui"

<SlyxUpProvider publishableKey="pk_..." apiUrl="${AUTH_URL}" billingApiUrl="${BILLING_URL}" tokenStorage="sessionStorage">
  <SignIn social={false} onSuccess={() => navigate("/account")} />
  <UserButton />
</SlyxUpProvider>`,
  },
  {
    id: 'core',
    label: 'Core SDK',
    lang: 'ts',
    code: `import { SlyxupClient, createBillingClient } from "@slyxup/core"

const auth = new SlyxupClient({ publishableKey: "pk_...", apiUrl: "${AUTH_URL}" })
await auth.auth.signIn({ email, password })

const billing = createBillingClient({ apiUrl: "${BILLING_URL}", publishableKey: auth.publishableKey, getToken: () => auth.getToken() })
const access = await billing.getEntitlements(projectId)`,
  },
  {
    id: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `curl -X POST ${AUTH_URL}/v1/auth/sign-up \\
  -H "Content-Type: application/json" \\
  -d '{"email":"ada@example.com","password":"correct-horse-9"}'

curl -H "Authorization: Bearer <session>" \\
  "${BILLING_URL}/v1/billing/plans?projectId=<id>"`,
  },
];

const SWITCH = [
  {
    icon: Server,
    title: 'Your database, not ours',
    desc: 'Standard SQLite on your D1. Dump it anytime with wrangler d1 export — no proprietary formats, no lock-in.',
  },
  {
    icon: TrendingUp,
    title: 'Paddle-native, not seat-priced',
    desc: 'Plans map to real Paddle prices. Trials, cancel-at-period-end and invoices work the way finance expects.',
  },
  {
    icon: ShieldCheck,
    title: 'Admin panel included',
    desc: 'Users, keys, domains, revenue stats and audit timeline ship in the repo — not as a dashboard upsell.',
  },
];

export default function Landing() {
  const [tab, setTab] = useState<(typeof TERMINAL_TABS)[number]['id']>('auth');
  const [code, setCode] = useState('react');
  const active = TERMINAL_TABS.find((t) => t.id === tab) ?? TERMINAL_TABS[1];
  const snippet = INTEGRATE_TABS.find((t) => t.id === code) ?? INTEGRATE_TABS[0];

  const statsRef = useRef<HTMLDivElement>(null);
  const [statsOn, setStatsOn] = useState(false);
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setStatsOn(true),
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const c15 = useCountUp(15, statsOn);
  const c27 = useCountUp(27, statsOn);
  const c19 = useCountUp(19, statsOn);

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-clip">
      <Seo
        title="SlyxUp Stack — Open-source auth & billing on Cloudflare"
        description="SlyxUp Stack is MIT-licensed auth + Paddle billing on Cloudflare Workers. Drop-in React components, headless SDK, admin panel with revenue stats. Self-host in 60 seconds."
        path="/"
        jsonLd={[orgJsonLd(), softwareJsonLd()]}
      />
      {/* announcement bar */}
      <Link
        to="/docs"
        className="relative z-40 flex items-center justify-center gap-2 border-b border-white/[0.08] bg-gradient-to-r from-sky-500/[0.12] via-white/[0.04] to-violet-500/[0.12] px-4 py-2 text-center text-[12px] font-medium text-white/70 hover:text-white transition-colors"
      >
        <Sparkles className="size-3.5 text-sky-300" />
        <span className="truncate">New: 27 Paddle-grade doc pages with syntax highlighting + llms.txt for agents</span>
        <ArrowRight className="size-3.5 shrink-0" />
      </Link>
      <PublicNav />

      {/* ── HERO ── */}
      <section className="noise relative">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0 bg-grid" />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(780px 380px at 12% -4%, rgba(56,189,248,0.16), transparent 65%), radial-gradient(680px 340px at 88% 6%, rgba(139,92,246,0.15), transparent 62%), radial-gradient(620px 320px at 50% 115%, rgba(16,185,129,0.09), transparent 60%)',
            }}
          />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-[1160px] px-4 sm:px-8 pt-14 sm:pt-24 pb-10 min-w-0">
          <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] min-w-0">
            <div className="min-w-0">
              <div className="rise flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] py-1.5 pl-2 pr-3.5 text-[12px] font-medium text-white/75 backdrop-blur">
                  <span className="rounded-full bg-emerald-400/15 border border-emerald-400/30 px-2 py-0.5 font-mono text-[10.5px] font-bold text-emerald-300">MIT</span>
                  Open source · self-host in 60s
                  <span className="size-1.5 rounded-full bg-emerald-400 pulse-dot" />
                </span>
              </div>

              <h1 className="rise rise-1 font-display mt-6 text-[44px] leading-[0.98] sm:text-[76px] font-bold text-balance tracking-[-0.03em]">
                Auth & billing,
                <br />
                <span className="font-serif-accent font-normal tracking-normal text-white/95">minus the boilerplate.</span>
              </h1>
              <p className="rise rise-2 mt-6 max-w-[540px] text-[15px] sm:text-[17px] leading-relaxed text-white/55">
                One open-source control plane for every project — users, API keys,
                domains, Paddle subscriptions, revenue stats. The same{' '}
                <span className="font-mono text-[13.5px] text-white/85">@slyxup/ui</span>{' '}
                kit drops straight into your product.
              </p>

              <div className="rise rise-3 mt-8 flex flex-wrap items-center gap-2.5">
                <Link to="/login">
                  <Button size="lg" className="cta-glow bg-white! text-black! hover:bg-white/90!">
                    Open admin <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link to="/docs">
                  <Button size="lg" variant="outline" className="border-white/15! bg-white/[0.04]! text-white! hover:bg-white/10! backdrop-blur">
                    <BookOpen className="size-4" /> Read the docs
                  </Button>
                </Link>
              </div>
              <div className="rise rise-3 mt-4 flex flex-wrap items-center gap-2">
                <CopyChip text="pnpm add @slyxup/core @slyxup/ui" label="pnpm add @slyxup/core @slyxup/ui" />
              </div>

              <div ref={statsRef} className="rise rise-4 mt-9 grid max-w-[540px] grid-cols-3 gap-4 border-t border-white/[0.08] pt-6">
                {[
                  [c15, 'drop-in components'],
                  [c27, 'doc pages'],
                  [c19, 'documented endpoints'],
                ].map(([k, v]) => (
                  <div key={v as string} className="min-w-0">
                    <div className="font-display text-[30px] sm:text-[36px] font-bold tracking-tight tabular-nums">{k}</div>
                    <div className="text-[12px] font-medium text-white/45">{v as string}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* terminal + floating proof cards */}
            <div className="rise rise-2 relative min-w-0">
              <div className="absolute -top-5 -right-3 sm:-right-5 z-10 hidden sm:block">
                <div className="glass-dark float-slow flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold">
                  <span className="size-2 rounded-full bg-emerald-400 pulse-dot" />
                  subscription.created
                  <span className="font-mono text-[11px] text-white/50">→ active</span>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-3 sm:-left-6 z-10 hidden sm:block">
                <div className="glass-dark float-slow flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold" style={{ animationDelay: '-3.5s' }}>
                  <TrendingUp className="size-4 text-emerald-300" />
                  MRR
                  <span className="font-mono text-[11px] text-white/50">live from billing</span>
                </div>
              </div>
              <div className="code-window min-w-0">
                <div className="flex items-center gap-1 border-b border-white/[0.08] px-3 pt-2.5">
                  <span className="flex gap-1.5 px-1 pb-2.5" aria-hidden="true">
                    <i className="block size-2.5 rounded-full bg-[#ff5f56]" />
                    <i className="block size-2.5 rounded-full bg-[#ffbd2e]" />
                    <i className="block size-2.5 rounded-full bg-[#27c93f]" />
                  </span>
                  <div className="ml-2 flex gap-1 pb-1.5" role="tablist" aria-label="Code examples">
                    {TERMINAL_TABS.map((t) => (
                      <button
                        key={t.id}
                        role="tab"
                        aria-selected={tab === t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        className={`rounded-md px-3 py-1.5 font-mono text-[11.5px] font-semibold cursor-pointer transition-colors ${tab === t.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <span className="ml-auto hidden sm:flex items-center gap-1.5 pb-1.5 font-mono text-[10.5px] text-emerald-300/80">
                    <span className="size-1.5 rounded-full bg-emerald-400 pulse-dot" /> live API
                  </span>
                </div>
                <div className="p-4 sm:p-5 min-w-0">
                  <CodeBlock title={active.title} lang={active.lang} code={active.code} />
                </div>
              </div>
              <p className="mt-3 text-center font-mono text-[11px] text-white/35 break-all">
                {AUTH_URL} · pk_… browser · sk_… server
              </p>
            </div>
          </div>

          <div className="mt-14 min-w-0">
            <div className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/30">
              Runs on your Cloudflare — not ours
            </div>
            <div className="marquee" aria-hidden="true">
              <div className="marquee-track">
                {[...STACK, ...STACK].map((s, i) => (
                  <span
                    key={`${s}-${i}`}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-[12px] font-medium text-white/60 whitespace-nowrap"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── control plane bento ── */}
      <section className="mx-auto max-w-[1160px] px-4 sm:px-8 py-16 sm:py-24 min-w-0">
        <SectionHead
          eyebrow="Control plane"
          title={<>Everything around your users, <span className="font-serif-accent font-normal">in one place.</span></>}
          desc="The admin panel and your product read the same live API. What you see here is what your users get — plus Paddle money in the same loop."
        />
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
          {BENTO.map((f, i) => (
            <Reveal key={f.title} delay={(i % 4) * 70} className={f.span}>
              <div onMouseMove={onSpot} className="spot bento p-6 sm:p-7 min-w-0 h-full">
                <div className="flex items-center gap-2">
                  <div className="size-10 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] flex items-center justify-center">
                    <f.icon className="size-[18px] text-white" />
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-white/45">{f.tag}</span>
                </div>
                <div className="mt-5 text-[15px] font-semibold text-white">{f.title}</div>
                <div className="mt-1.5 text-[13.5px] leading-relaxed text-white/50">{f.desc}</div>
                {f.visual}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── integrate tabs ── */}
      <section className="relative border-y border-white/[0.08] bg-white/[0.015] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ background: 'radial-gradient(700px 320px at 50% 0%, rgba(139,92,246,0.09), transparent 65%)' }} />
        <div className="relative mx-auto max-w-[1160px] px-4 sm:px-8 py-16 sm:py-24 min-w-0">
          <SectionHead
            eyebrow="Drop it in"
            title={<>Three ways to integrate. <span className="font-serif-accent font-normal">One session.</span></>}
            desc="Publishable key identifies the project. Session identifies the user. Secret key administers — never in the browser."
          />
          <div className="mx-auto mt-10 max-w-[880px] min-w-0">
            <div className="flex justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] p-1.5 w-fit mx-auto" role="tablist" aria-label="Integration method">
              {INTEGRATE_TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={code === t.id}
                  type="button"
                  onClick={() => setCode(t.id)}
                  className={`rounded-full px-6 py-2 text-[13px] font-semibold cursor-pointer transition-all ${code === t.id ? 'bg-white text-black' : 'text-white/55 hover:text-white'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="code-window mt-5 min-w-0 text-left">
              <div className="p-4 sm:p-6">
                <CodeBlock title={`${code} — copy, paste, ship`} lang={snippet.lang} code={snippet.code} />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link to="/docs/react" className="chip hover:border-white/30 transition-colors">React guide <ArrowRight className="size-3" /></Link>
              <Link to="/docs/api-reference" className="chip hover:border-white/30 transition-colors">API reference <ArrowRight className="size-3" /></Link>
              <a href="/llms.txt" className="chip hover:border-white/30 transition-colors"><Sparkles className="size-3" /> llms.txt for agents</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── money loop ── */}
      <section className="mx-auto max-w-[1160px] px-4 sm:px-8 py-16 sm:py-24 min-w-0">
        <div onMouseMove={onSpot} className="spot noise relative overflow-hidden rounded-3xl border border-amber-400/15 bg-gradient-to-b from-amber-400/[0.07] via-white/[0.02] to-transparent min-w-0">
          <div className="relative p-6 sm:p-12 min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/[0.09] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200">
              <CreditCard className="size-3.5" /> Monetize · Paddle-native
            </div>
            <h3 className="font-display mt-5 text-[28px] sm:text-[42px] font-bold leading-[1.02] tracking-[-0.02em] text-balance max-w-[640px]">
              From free user to <span className="text-gradient-amber">paid plan</span> in four calls.
            </h3>
            <p className="mt-4 max-w-[580px] text-[14px] sm:text-[15px] leading-relaxed text-white/55">
              Billing is its own Worker with its own D1 — it validates sessions
              read-only and owns every money row. The webhook is the source of
              truth, never the redirect.
            </p>
            <div className="mt-10 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
              {MONEY_LOOP.map((s, i) => (
                <Reveal key={s.n} delay={i * 80}>
                  <div onMouseMove={onSpot} className="spot rounded-2xl border border-white/10 bg-black/50 p-5 sm:p-6 h-full min-w-0 backdrop-blur">
                    <div className="font-mono text-[12px] font-bold text-amber-200/70">{s.n}</div>
                    <div className="mt-2.5 text-[14.5px] font-semibold">{s.t}</div>
                    <div className="mt-1.5 text-[12.5px] leading-relaxed text-white/50">{s.d}</div>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-2.5">
              <Link to="/docs/checkout">
                <Button size="lg" className="bg-white! text-black! hover:bg-white/85!">Checkout guide <ArrowRight className="size-4" /></Button>
              </Link>
              <Link to="/docs/paddle-setup">
                <Button size="lg" variant="outline" className="border-white/15! bg-transparent! text-white! hover:bg-white/10!">Paddle setup</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── why switch ── */}
      <section className="mx-auto max-w-[1160px] px-4 sm:px-8 pb-16 sm:pb-24 min-w-0">
        <SectionHead
          eyebrow="Why teams switch"
          title={<>Clerk-grade DX. <span className="font-serif-accent font-normal">You keep the keys.</span></>}
        />
        <div className="mt-10 grid gap-3 md:grid-cols-3 min-w-0">
          {SWITCH.map((s, i) => (
            <Reveal key={s.title} delay={i * 90}>
              <div onMouseMove={onSpot} className="spot bento p-6 sm:p-7 min-w-0 h-full">
                <div className="size-10 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] flex items-center justify-center">
                  <s.icon className="size-[18px] text-white" />
                </div>
                <div className="mt-5 text-[15px] font-semibold text-white">{s.title}</div>
                <div className="mt-1.5 text-[13.5px] leading-relaxed text-white/50">{s.desc}</div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* security strip */}
        <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.015] px-6 py-6 min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-center gap-5 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-10 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] flex items-center justify-center shrink-0">
                <ShieldCheck className="size-5 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-bold">Secure by construction</div>
                <div className="text-[12.5px] text-white/50">Enforced, not suggested.</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:ml-auto min-w-0">
              {[
                [Lock, 'HttpOnly sessions'],
                [KeyRound, 'SHA-256 keys'],
                [Server, 'PBKDF2 · 100k'],
                [UserCheck, 'Block = revoke all'],
              ].map(([Icon, label]) => {
                const I = Icon as typeof Zap;
                return (
                  <span key={label as string} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[12.5px] font-medium text-white/70 whitespace-nowrap">
                    <I className="size-3.5 text-emerald-300" /> {label as string}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── auth layouts teaser ── */}
      <section className="mx-auto max-w-[1160px] px-4 sm:px-8 pb-16 sm:pb-24 min-w-0">
        <div onMouseMove={onSpot} className="spot overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] min-w-0">
          <div className="grid items-center gap-8 p-6 sm:p-12 lg:grid-cols-[1fr_auto] min-w-0">
            <div className="min-w-0">
              <div className="inline-block rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                Auth pages · <span className="text-white/85">/ui live</span>
              </div>
              <h3 className="font-display mt-4 text-[26px] sm:text-[36px] font-bold leading-[1.04] tracking-[-0.02em] text-balance">
                Three designs. <span className="font-serif-accent font-normal">Yours in one prop.</span>
              </h3>
              <p className="mt-3 max-w-[520px] text-[13.5px] sm:text-[14.5px] leading-relaxed text-white/55">
                Centered for SaaS, split-screen for marketing pages, minimal for
                embedding. Theme everything with one call — try it live before you
                npm-install anything.
              </p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {['layout="split"', 'social={false}', 'username', 'density="compact"'].map((c) => (
                  <code key={c} className="rounded-md border border-white/10 bg-black px-2.5 py-1 font-mono text-[11.5px] text-white/75 whitespace-nowrap">{c}</code>
                ))}
              </div>
            </div>
            <Link to="/ui" className="shrink-0 lg:justify-self-end">
              <Button size="lg" className="bg-white! text-black! hover:bg-white/85! btn-glow">
                Explore the kit <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-3 divide-x divide-white/[0.08] border-t border-white/[0.08]">
            {[
              { icon: ShieldCheck, t: 'Centered', d: 'Classic card' },
              { icon: Zap, t: 'Split', d: 'Brand + form' },
              { icon: Terminal, t: 'Minimal', d: 'Chromeless' },
            ].map((v) => (
              <div key={v.t} className="flex flex-col items-center gap-1 px-2 py-6 text-center min-w-0">
                <v.icon className="size-4 text-white/70" />
                <div className="text-[13px] font-semibold">{v.t}</div>
                <div className="text-[11.5px] text-white/45">{v.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-[820px] px-4 sm:px-8 pb-16 sm:pb-24 min-w-0">
        <SectionHead eyebrow="FAQ" title={<>Asked, <span className="font-serif-accent font-normal">answered.</span></>} />
        <div className="mt-10 space-y-2.5 min-w-0">
          {[
            { q: 'Is this really open source?', a: 'Yes — MIT licensed. Run auth, billing and this panel on your own Cloudflare account. No phone-home, no license keys.' },
            { q: 'How is this different from Clerk or Auth0?', a: 'Same drop-in components and hooks, but you own the data (your D1), billing is Paddle-native instead of seat-priced, and the admin panel is included — not a dashboard upsell.' },
            { q: 'How does Paddle billing actually work?', a: 'List plans → POST /v1/billing/checkout → open the Paddle checkout → subscription.created webhook creates the row → gate with getEntitlements on your server. The webhook is the source of truth — full loop in /docs/billing-overview.' },
            { q: 'Can I use only the UI kit?', a: 'Absolutely. Point SlyxUpProvider at any running instance and render <SignIn layout="split" />. Theme with one applyTheme() call — or raw CSS variables.' },
            { q: 'What happens to my data if I leave?', a: 'It is already yours: standard SQLite (D1) tables you can dump anytime with wrangler d1 export. No proprietary formats, no lock-in.' },
            { q: 'Is there LLM-friendly documentation?', a: 'Yes — 27 per-page guides at /docs/:slug with Shiki highlighting, every page with a Copy-for-LLM button, plus a global /llms.txt index and sitemap.xml built for crawlers and agents.' },
          ].map((f) => (
            <details key={f.q} className="group rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4 open:bg-white/[0.04] open:border-white/20 transition-colors min-w-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-semibold text-white [&::-webkit-details-marker]:hidden">
                {f.q}
                <ArrowRight className="size-4 shrink-0 text-white/40 transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-2 text-[13px] leading-relaxed text-white/55">{f.a}</p>
            </details>
          ))}
        </div>

        {/* finale CTA */}
        <div className="noise relative mt-12 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.01] p-8 sm:p-12 text-center min-w-0">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ background: 'radial-gradient(560px 260px at 50% 0%, rgba(56,189,248,0.14), transparent 65%)' }} />
          <div className="relative min-w-0">
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">Ship today</div>
            <div className="font-display mt-3 text-[30px] sm:text-[46px] font-bold leading-[1.02] tracking-[-0.02em] text-balance">
              Ship auth <span className="font-serif-accent font-normal">this afternoon.</span>
            </div>
            <p className="mx-auto mt-3 max-w-[440px] text-[13.5px] leading-relaxed text-white/55">
              Clone, install, sign in — no signup walls. Docs, UI kit and billing included.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <Link to="/login">
                <Button size="lg" className="cta-glow bg-white! text-black! hover:bg-white/90!">Sign in <ArrowRight className="size-4" /></Button>
              </Link>
              <Link to="/docs/quickstart">
                <Button size="lg" variant="outline" className="border-white/15! bg-transparent! text-white! hover:bg-white/10!">5-step quickstart</Button>
              </Link>
            </div>
            <div className="mt-5 flex justify-center">
              <CopyChip text="pnpm add @slyxup/core @slyxup/ui" label="pnpm add @slyxup/core @slyxup/ui" />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
