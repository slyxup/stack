import {
  ArrowRight,
  Blocks,
  Check,
  CreditCard,
  Globe,
  KeyRound,
  Palette,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CodeBlock } from '../components/CodeBlock';
import { Logo, PublicNav, SectionHead } from '../components/marketing';
import { Button } from '../components/ui';
import { AUTH_URL } from '../lib/api';

const STACK = ['Workers', 'D1', 'KV', 'R2', 'Paddle', 'Zod', 'Drizzle', 'React 19'];

const BENTO = [
  {
    icon: Users,
    title: 'Users, fully moderated',
    desc: 'Server-side search, edit roles, block with instant session revoke, or delete — per project, 20 per page, zero mock data.',
    span: 'sm:col-span-2',
  },
  {
    icon: KeyRound,
    title: 'Keys that scale',
    desc: 'pk_ for browsers, sk_ for servers. Hashed at rest, revealed once.',
    span: '',
  },
  {
    icon: Globe,
    title: 'Domains & CORS',
    desc: 'Allowlist the exact origins that may use each key.',
    span: '',
  },
  {
    icon: CreditCard,
    title: 'Billing, Paddle-backed',
    desc: 'Plans, subscriptions and invoices stream in live from the billing service.',
    span: '',
  },
  {
    icon: Blocks,
    title: '11 components, 3 auth layouts',
    desc: 'The same @slyxup/ui kit this page is built to showcase — centered, split, minimal. Six accents, dark mode, custom fonts, compact density.',
    span: 'sm:col-span-2',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Create a project',
    desc: 'Sign in to the admin panel and create a project. It gets isolated users, keys, domains and billing.',
  },
  {
    n: '02',
    title: 'Drop in the UI',
    desc: 'Install @slyxup/ui, wrap your app in SlyxUpProvider, render <SignIn layout="split" />. Theme it in one call.',
  },
  {
    n: '03',
    title: 'Moderate & monetize',
    desc: 'Users appear here as they sign up. Block abuse, rotate keys, watch plans convert — all live.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0b0b10] text-white overflow-x-clip">
      <PublicNav />

      {/* ── Hero ── */}
      <section className="relative">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="absolute inset-0 bg-grid-dark pointer-events-none" />
        <div className="relative mx-auto max-w-[1120px] px-4 sm:px-8 pt-14 sm:pt-24 pb-12 min-w-0">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] min-w-0">
            <div className="min-w-0">
              <div className="rise inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[12px] font-semibold text-white/80">
                <span className="size-1.5 rounded-full bg-emerald-400 pulse-dot" />
                Open source · MIT · v2.3.0 UI kit
              </div>
              <h1 className="rise rise-1 font-display mt-6 text-[40px] leading-[0.98] sm:text-[68px] font-extrabold text-balance">
                Auth & billing,
                <br />
                <span className="text-gradient">minus the boilerplate.</span>
              </h1>
              <p className="rise rise-2 mt-5 max-w-[520px] text-[14.5px] sm:text-[16.5px] leading-relaxed text-white/60">
                One admin panel to run every project — users, API keys,
                domains, billing. And the exact same UI kit,{' '}
                <span className="font-mono text-[13px] text-white/85">@slyxup/ui</span>,
                drops into your own product.
              </p>
              <div className="rise rise-3 mt-8 flex flex-wrap items-center gap-2.5">
                <Link to="/login">
                  <Button size="lg" className="btn-glow !border-0 !bg-[#6d28d9] hover:!bg-[#5b21b6]">
                    Open admin <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link to="/ui">
                  <Button size="lg" variant="outline" className="!border-white/20 !bg-white/5 !text-white hover:!bg-white/10">
                    <Palette className="size-4" /> Live UI kit
                  </Button>
                </Link>
              </div>
              <div className="rise rise-4 mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-white/50">
                {['No signup walls', 'No mock data', 'Self-host in 60s'].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5">
                    <Check className="size-3.5 text-emerald-400" /> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Code window */}
            <div className="rise rise-2 min-w-0">
              <div className="code-window float-slow min-w-0">
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                  <span className="flex gap-1.5">
                    <i className="block size-2.5 rounded-full bg-[#ff5f56]" />
                    <i className="block size-2.5 rounded-full bg-[#ffbd2e]" />
                    <i className="block size-2.5 rounded-full bg-[#27c93f]" />
                  </span>
                  <span className="ml-1 font-mono text-[11px] text-white/50">your-app — 6 lines</span>
                </div>
                <div className="p-4 sm:p-5 min-w-0">
                  <CodeBlock
                    title="app.tsx"
                    lang="tsx"
                    code={`import { SlyxUpProvider, SignIn, applyTheme } from "@slyxup/ui"

applyTheme({ mode: "dark", accent: "violet", radius: 12 })

<SlyxUpProvider publishableKey="pk_live_...">
  <SignIn layout="split" />
</SlyxUpProvider>`}
                  />
                </div>
              </div>
              <p className="mt-3 text-center font-mono text-[11px] text-white/40 break-all">
                {AUTH_URL} · pk_live_… browser · sk_live_… server
              </p>
            </div>
          </div>

          {/* Stack strip */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-1.5 min-w-0">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">
              Built on
            </span>
            {STACK.map((s) => (
              <span key={s} className="chip !text-[11px]">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bento features ── */}
      <section className="mx-auto max-w-[1120px] px-4 sm:px-8 py-14 sm:py-20 min-w-0">
        <SectionHead
          eyebrow="Control plane"
          title={<>Everything around your users, in one place.</>}
          desc="The admin panel and your product read the same live API. What you see here is what your users get."
        />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
          {BENTO.map((f) => (
            <div key={f.title} className={`bento p-6 min-w-0 ${f.span}`}>
              <div className="size-10 rounded-xl border border-[#6d28d9]/40 bg-[#6d28d9]/15 flex items-center justify-center">
                <f.icon className="size-[18px] text-[#c4b5fd]" />
              </div>
              <div className="mt-4 text-[15px] font-bold text-white">{f.title}</div>
              <div className="mt-1.5 text-[13px] leading-relaxed text-white/55">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Metrics band ── */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-[1120px] px-4 sm:px-8 py-10 grid grid-cols-2 gap-6 sm:grid-cols-4 min-w-0">
          {[
            { k: '11', v: 'Drop-in components' },
            { k: '3', v: 'Auth page layouts' },
            { k: '6 + ∞', v: 'Accents + custom colors' },
            { k: '19', v: 'Documented endpoints' },
          ].map((s) => (
            <div key={s.v} className="text-center min-w-0">
              <div className="font-display text-[34px] sm:text-[44px] font-extrabold tracking-tight text-white">
                {s.k}
              </div>
              <div className="mt-1 text-[12px] font-medium text-white/50">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Variants ── */}
      <section className="mx-auto max-w-[1120px] px-4 sm:px-8 py-14 sm:py-20 min-w-0">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#6d28d9]/25 via-white/[0.03] to-[#0891b2]/20 min-w-0">
          <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_auto] min-w-0">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.12em] text-white/70">
                <Sparkles className="size-3.5" /> Auth pages
              </div>
              <h3 className="font-display mt-4 text-[24px] sm:text-[32px] font-extrabold leading-[1.05] text-balance">
                Three designs. Yours in one prop.
              </h3>
              <p className="mt-3 max-w-[520px] text-[13.5px] leading-relaxed text-white/60">
                Centered for SaaS, split-screen for marketing pages, minimal
                for embedding. OAuth and username toggles on top. Open the kit,
                flip the switches, copy the config.
              </p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {['layout="split"', 'social={false}', 'username', 'primary="accent"', 'density="compact"'].map((c) => (
                  <code key={c} className="rounded-lg border border-white/15 bg-black/30 px-2.5 py-1 font-mono text-[11.5px] text-[#c4b5fd] whitespace-nowrap">
                    {c}
                  </code>
                ))}
              </div>
            </div>
            <Link to="/ui" className="shrink-0 lg:justify-self-end">
              <Button size="lg" className="btn-glow !border-0 !bg-white !text-[#0b0b10] hover:!bg-white/85">
                Explore the kit <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10">
            {[
              { icon: ShieldCheck, t: 'Centered', d: 'Classic card' },
              { icon: Zap, t: 'Split', d: 'Brand + form' },
              { icon: Palette, t: 'Minimal', d: 'Chromeless' },
            ].map((v) => (
              <div key={v.t} className="flex flex-col items-center gap-1 px-2 py-5 text-center min-w-0">
                <v.icon className="size-4 text-[#c4b5fd]" />
                <div className="text-[13px] font-bold">{v.t}</div>
                <div className="text-[11.5px] text-white/50">{v.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Steps ── */}
      <section className="mx-auto max-w-[1120px] px-4 sm:px-8 pb-14 sm:pb-20 min-w-0">
        <SectionHead
          eyebrow="How it works"
          title={<>Live in three moves.</>}
        />
        <div className="mt-10 grid gap-3 md:grid-cols-3 min-w-0">
          {STEPS.map((s, i) => (
            <div key={s.n} className="bento p-6 min-w-0">
              <div className="font-mono text-[12px] font-bold text-[#c4b5fd]">{s.n}</div>
              <div className="mt-3 text-[15px] font-bold text-white">{s.title}</div>
              <div className="mt-1.5 text-[13px] leading-relaxed text-white/55">{s.desc}</div>
              {i < 2 && <ArrowRight className="mt-4 size-4 text-white/25 hidden md:block" />}
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          <Link to="/login">
            <Button size="lg" className="btn-glow !border-0 !bg-[#6d28d9] hover:!bg-[#5b21b6]">
              Start now <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link to="/docs">
            <Button size="lg" variant="outline" className="!border-white/20 !bg-transparent !text-white hover:!bg-white/10">
              Read the docs
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black/20">
        <div className="mx-auto max-w-[1120px] px-4 sm:px-8 py-8 flex items-center gap-2.5 min-w-0">
          <Logo />
          <span className="text-[13px] text-white/50">© {new Date().getFullYear()} SlyxUp Stack — MIT</span>
          <span className="ml-auto text-[12px] text-white/35 hidden sm:inline">Auth + billing for modern products.</span>
        </div>
      </footer>
    </div>
  );
}
