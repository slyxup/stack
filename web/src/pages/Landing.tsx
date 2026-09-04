import {
  ArrowRight,
  Blocks,
  Check,
  CreditCard,
  Globe,
  KeyRound,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CodeBlock } from '../components/CodeBlock';
import { Reveal } from '../components/Reveal';
import { PublicNav, SectionHead, SiteFooter } from '../components/marketing';
import { Button } from '../components/ui';
import { AUTH_URL } from '../lib/api';

const STACK = [
  'Workers',
  'D1',
  'KV',
  'R2',
  'Paddle',
  'Zod',
  'Drizzle',
  'React 19',
];

const FEATURES = [
  {
    icon: Users,
    title: 'Users, fully moderated',
    desc: 'Server-side search, edit roles, block with instant session revoke, or delete — per project, paginated, zero mock data.',
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
    title: '15 components, 3 auth layouts',
    desc: 'The same @slyxup/ui kit — centered, split, minimal. Six accents plus mono, dark mode, custom fonts, compact density.',
    span: 'sm:col-span-2',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Create a project',
    desc: 'Sign in and create a project. It gets isolated users, keys, domains and billing.',
  },
  {
    n: '02',
    title: 'Drop in the UI',
    desc: 'Wrap your app in SlyxUpProvider, render <SignIn layout="split" />. Theme it in one call.',
  },
  {
    n: '03',
    title: 'Moderate & monetize',
    desc: 'Users appear here as they sign up. Block abuse, rotate keys, watch plans convert.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-clip">
      <PublicNav />

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 bg-dots pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-[1120px] px-4 sm:px-8 pt-16 sm:pt-28 pb-12 min-w-0">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] min-w-0">
            <div className="min-w-0">
              <div className="rise inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[12px] font-medium text-white/70">
                <span className="size-1.5 rounded-full bg-emerald-400 pulse-dot" />
                Open source · MIT · UI kit v2.4.0
              </div>
              <h1 className="rise rise-1 font-display mt-6 text-[42px] leading-[0.98] sm:text-[72px] font-bold text-balance">
                Auth & billing,
                <br />
                minus the boilerplate.
              </h1>
              <p className="rise rise-2 mt-5 max-w-[520px] text-[14.5px] sm:text-[16.5px] leading-relaxed text-white/55">
                One admin panel to run every project — users, API keys, domains,
                billing. And the exact same UI kit,{' '}
                <span className="font-mono text-[13px] text-white/85">
                  @slyxup/ui
                </span>
                , drops into your own product.
              </p>
              <div className="rise rise-3 mt-8 flex flex-wrap items-center gap-2.5">
                <Link to="/login">
                  <Button
                    size="lg"
                    className="bg-white! text-black! hover:bg-white/85!"
                  >
                    Open admin <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link to="/ui">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/15! bg-transparent! text-white! hover:bg-white/10!"
                  >
                    Live UI kit
                  </Button>
                </Link>
              </div>
              <div className="rise rise-4 mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-white/45">
                {['No signup walls', 'No mock data', 'Self-host in 60s'].map(
                  (t) => (
                    <span key={t} className="inline-flex items-center gap-1.5">
                      <Check className="size-3.5 text-emerald-400" /> {t}
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="rise rise-2 min-w-0">
              <div className="code-window float-slow min-w-0">
                <div className="flex items-center gap-2 border-b border-white/[0.08] px-4 py-3">
                  <span className="flex gap-1.5">
                    <i className="block size-2.5 rounded-full bg-[#ff5f56]" />
                    <i className="block size-2.5 rounded-full bg-[#ffbd2e]" />
                    <i className="block size-2.5 rounded-full bg-[#27c93f]" />
                  </span>
                  <span className="ml-1 font-mono text-[11px] text-white/40">
                    your-app — 6 lines
                  </span>
                </div>
                <div className="p-4 sm:p-5 min-w-0">
                  <CodeBlock
                    title="app.tsx"
                    lang="tsx"
                    code={`import { SlyxUpProvider, SignIn, applyTheme } from "@slyxup/ui"

applyTheme({ accent: "mono", radius: 10 })

<SlyxUpProvider publishableKey="pk_live_...">
  <SignIn layout="split" />
</SlyxUpProvider>`}
                  />
                </div>
              </div>
              <p className="mt-3 text-center font-mono text-[11px] text-white/35 break-all">
                {AUTH_URL} · pk_live_… browser · sk_live_… server
              </p>
            </div>
          </div>

          <div className="mt-12 min-w-0">
            <div className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-white/30">
              Built on
            </div>
            <div className="marquee" aria-hidden="true">
              <div className="marquee-track">
                {[...STACK, ...STACK].map((s, i) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: static duplicated list for the seamless loop
                    key={`${s}-${i}`}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[11.5px] font-medium text-white/60 whitespace-nowrap"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-[1120px] px-4 sm:px-8 py-14 sm:py-20 min-w-0">
        <SectionHead
          eyebrow="Control plane"
          title={<>Everything around your users, in one place.</>}
          desc="The admin panel and your product read the same live API. What you see here is what your users get."
        />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 4) * 70} className={f.span}>
              <div className="bento p-6 min-w-0 h-full">
                <div className="size-9 rounded-lg border border-white/10 bg-white/[0.05] flex items-center justify-center">
                  <f.icon className="size-4 text-white" />
                </div>
                <div className="mt-4 text-[14.5px] font-semibold text-white">
                  {f.title}
                </div>
                <div className="mt-1.5 text-[13px] leading-relaxed text-white/50">
                  {f.desc}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <section className="border-y border-white/[0.08] bg-white/[0.015]">
        <div className="mx-auto max-w-[1120px] px-4 sm:px-8 py-10 grid grid-cols-2 gap-6 sm:grid-cols-4 min-w-0">
          {[
            { k: '15', v: 'Drop-in components' },
            { k: '3', v: 'Auth page layouts' },
            { k: '7', v: 'Accent presets' },
            { k: '19', v: 'Documented endpoints' },
          ].map((s) => (
            <div key={s.v} className="text-center min-w-0">
              <div className="font-display text-[34px] sm:text-[44px] font-bold tracking-tight text-white">
                {s.k}
              </div>
              <div className="mt-1 text-[12px] font-medium text-white/45">
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Variants */}
      <section className="mx-auto max-w-[1120px] px-4 sm:px-8 py-14 sm:py-20 min-w-0">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] min-w-0">
          <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_auto] min-w-0">
            <div className="min-w-0">
              <div className="inline-block rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                Auth pages
              </div>
              <h3 className="font-display mt-4 text-[24px] sm:text-[32px] font-bold leading-[1.05] text-balance">
                Three designs. Yours in one prop.
              </h3>
              <p className="mt-3 max-w-[520px] text-[13.5px] leading-relaxed text-white/55">
                Centered for SaaS, split-screen for marketing pages, minimal for
                embedding. OAuth and username toggles on top — try them live.
              </p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {[
                  'layout="split"',
                  'social={false}',
                  'username',
                  'density="compact"',
                ].map((c) => (
                  <code
                    key={c}
                    className="rounded-md border border-white/10 bg-black px-2.5 py-1 font-mono text-[11.5px] text-white/75 whitespace-nowrap"
                  >
                    {c}
                  </code>
                ))}
              </div>
            </div>
            <Link to="/ui" className="shrink-0 lg:justify-self-end">
              <Button
                size="lg"
                className="bg-white! text-black! hover:bg-white/85!"
              >
                Explore the kit <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-3 divide-x divide-white/[0.08] border-t border-white/[0.08]">
            {[
              { icon: ShieldCheck, t: 'Centered', d: 'Classic card' },
              { icon: Zap, t: 'Split', d: 'Brand + form' },
              { icon: Blocks, t: 'Minimal', d: 'Chromeless' },
            ].map((v) => (
              <div
                key={v.t}
                className="flex flex-col items-center gap-1 px-2 py-5 text-center min-w-0"
              >
                <v.icon className="size-4 text-white/70" />
                <div className="text-[13px] font-semibold">{v.t}</div>
                <div className="text-[11.5px] text-white/45">{v.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps + CTA */}
      <section className="mx-auto max-w-[1120px] px-4 sm:px-8 pb-14 sm:pb-20 min-w-0">
        <SectionHead eyebrow="How it works" title={<>Live in three moves.</>} />
        <div className="mt-10 grid gap-3 md:grid-cols-3 min-w-0">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="bento p-6 min-w-0 h-full">
                <div className="font-mono text-[12px] font-semibold text-white/40">
                  {s.n}
                </div>
                <div className="mt-3 text-[15px] font-semibold text-white">
                  {s.title}
                </div>
                <div className="mt-1.5 text-[13px] leading-relaxed text-white/50">
                  {s.desc}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
          <div className="min-w-0">
            <div className="text-[17px] font-semibold">
              Run your own in 60 seconds.
            </div>
            <div className="text-[13px] text-white/50 mt-0.5">
              Clone, install, sign in — no signup walls.
            </div>
          </div>
          <div className="flex gap-2 sm:ml-auto shrink-0">
            <Link to="/login">
              <Button className="bg-white! text-black! hover:bg-white/85!">
                Sign in
              </Button>
            </Link>
            <Link to="/docs">
              <Button
                variant="outline"
                className="border-white/15! bg-transparent! text-white! hover:bg-white/10!"
              >
                Docs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
