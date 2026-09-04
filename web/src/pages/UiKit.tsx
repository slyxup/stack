import {
  ACCENTS,
  type AccentName,
  BillingPortal,
  EmailVerification,
  FONTS,
  ForgotPassword,
  PricingTable,
  ResetPassword,
  SignIn,
  SignUp,
  SlyxUpProvider,
  SocialButtons,
  type ThemeMode,
  UserButton,
  applyTheme,
} from '@slyxup/ui';
import { Blocks, BookOpen } from 'lucide-react';
import { Component, type ReactNode, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CodeBlock } from '../components/CodeBlock';
import { AUTH_URL } from '../lib/api';

const UI_VERSION = '2.1.0';

const DEMO_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    amount: 0,
    currency: 'USD',
    interval: 'month' as const,
    trialDays: null,
    features: ['1 project', 'Email + OAuth', 'Community support'],
    isPopular: false,
  },
  {
    id: 'scale',
    name: 'Scale',
    amount: 1900,
    currency: 'USD',
    interval: 'month' as const,
    trialDays: 14,
    features: ['5 projects', 'Billing & webhooks', '100k requests'],
    isPopular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    amount: 4900,
    currency: 'USD',
    interval: 'month' as const,
    trialDays: null,
    features: ['Unlimited projects', 'SSO & audit log', 'Priority support'],
    isPopular: false,
  },
];

const DEMO_SUB = {
  id: 'sub_demo',
  status: 'active',
  currentPeriodEnd: '2026-10-04',
  cancelAtPeriodEnd: false,
};
const DEMO_INVOICES = [
  {
    id: 'in_1',
    amount: 1900,
    currency: 'USD',
    status: 'paid' as const,
    billedAt: '2026-09-04',
  },
  {
    id: 'in_2',
    amount: 1900,
    currency: 'USD',
    status: 'paid' as const,
    billedAt: '2026-08-04',
  },
];

class DemoBoundary extends Component<
  { children: ReactNode; label: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="rounded-xl border border-dashed p-6 text-center text-xs text-[#63666f]">
          {this.props.label} preview unavailable — see code.
        </div>
      );
    }
    return this.props.children;
  }
}

function Section({
  title,
  desc,
  demo,
  code,
}: { title: string; desc: string; demo: ReactNode; code: string }) {
  return (
    <section className="scroll-mt-24">
      <h2 className="font-mono text-[14px] font-bold">&lt;{title} /&gt;</h2>
      <p className="text-[13px] text-[#63666f] mt-1 mb-4 max-w-2xl leading-relaxed">
        {desc}
      </p>
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <div className="rounded-2xl border border-[#e4e6eb] bg-white p-5 sm:p-6 overflow-x-auto">
          <DemoBoundary label={title}>{demo}</DemoBoundary>
        </div>
        <div className="lg:sticky lg:top-4">
          <CodeBlock title={`${title}.tsx`} lang="tsx" code={code} />
        </div>
      </div>
    </section>
  );
}

type FontKey = keyof typeof FONTS;

export default function UiKit() {
  const [mode, setMode] = useState<ThemeMode>('auto');
  const [accent, setAccent] = useState<AccentName | 'custom'>('violet');
  const [customColor, setCustomColor] = useState('#e8562a');
  const [font, setFont] = useState<FontKey>('default');
  const [radius, setRadius] = useState(10);
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!galleryRef.current) return;
    const cleanup = applyTheme(
      {
        mode,
        accent: accent === 'custom' ? customColor : accent,
        font,
        radius,
      },
      galleryRef.current
    );
    return cleanup;
  }, [mode, accent, customColor, font, radius]);

  const themeCode = `import { applyTheme } from "@slyxup/ui"

applyTheme({
  mode: "${mode}",
  accent: "${accent === 'custom' ? customColor : accent}",
  font: "${font}",
  radius: ${radius},
})`;

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      {/* Topbar */}
      <div className="sticky top-0 z-30 border-b border-[#e4e6eb] bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-8 py-3 flex items-center gap-2">
          <div className="size-8 rounded-lg bg-[#6d28d9] flex items-center justify-center text-white">
            <Blocks className="size-4" />
          </div>
          <span className="text-[14px] font-bold">SlyxUp UI Kit</span>
          <span className="font-mono text-[11px] bg-[#f0f1f4] px-2 py-0.5 rounded-md text-[#63666f]">
            v{UI_VERSION}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/docs"
              className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#63666f] hover:text-[#101014]"
            >
              <BookOpen className="size-3.5" /> Docs
            </Link>
            <Link
              to="/admin"
              className="rounded-full bg-[#101014] text-white px-4 py-2 text-[12.5px] font-semibold"
            >
              Open admin
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-8 py-8 sm:py-12 space-y-12">
        {/* Hero */}
        <div className="max-w-2xl">
          <h1 className="text-[28px] sm:text-[36px] font-extrabold tracking-tight">
            Every component, live.
          </h1>
          <p className="text-[14px] text-[#63666f] mt-2 leading-relaxed">
            All eleven{' '}
            <span className="font-mono text-[12.5px] bg-[#eceef2] px-1.5 py-0.5 rounded-md">
              @slyxup/ui
            </span>{' '}
            components rendered on this page — not screenshots. Tune the theme
            playground and watch every component follow.
          </p>
          <div className="mt-4 max-w-xl">
            <CodeBlock
              title="install"
              lang="bash"
              code={'pnpm add @slyxup/ui'}
            />
          </div>
        </div>

        {/* Theme playground */}
        <section className="rounded-2xl border border-[#e4e6eb] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-[16px] font-bold tracking-tight">
              Theme playground
            </h2>
            <span className="text-[12px] text-[#63666f]">
              Applies to the whole gallery below via{' '}
              <span className="font-mono">applyTheme()</span>
            </span>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#63666f] mb-2">
                Mode
              </div>
              <div className="flex rounded-full border border-[#e4e6eb] p-1">
                {(['auto', 'light', 'dark'] as ThemeMode[]).map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 rounded-full px-3 py-1.5 text-[12.5px] font-semibold capitalize cursor-pointer ${mode === m ? 'bg-[#101014] text-white' : 'text-[#63666f]'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#63666f] mb-2">
                Accent
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(Object.keys(ACCENTS) as AccentName[]).map((a) => (
                  <button
                    type="button"
                    key={a}
                    title={ACCENTS[a].label}
                    onClick={() => setAccent(a)}
                    className={`size-7 rounded-full cursor-pointer border-2 ${accent === a ? 'border-[#101014] scale-110' : 'border-transparent'}`}
                    style={{
                      background: `linear-gradient(135deg, ${ACCENTS[a].accent}, ${ACCENTS[a].gradientTo})`,
                    }}
                  />
                ))}
                <label
                  title="Custom color"
                  className={`size-7 rounded-full cursor-pointer border-2 overflow-hidden relative ${accent === 'custom' ? 'border-[#101014] scale-110' : 'border-dashed border-[#c6c9d2]'}`}
                  style={
                    accent === 'custom'
                      ? { background: customColor }
                      : {
                          background:
                            'conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)',
                        }
                  }
                >
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      setAccent('custom');
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#63666f] mb-2">
                Font
              </div>
              <select
                value={font}
                onChange={(e) => setFont(e.target.value as FontKey)}
                className="w-full h-9 rounded-xl border border-[#e4e6eb] bg-white px-3 text-[13px] font-medium cursor-pointer"
              >
                {(Object.keys(FONTS) as FontKey[]).map((f) => (
                  <option key={f} value={f}>
                    {FONTS[f].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#63666f] mb-2">
                Radius · <span className="font-mono">{radius}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full accent-[#6d28d9] cursor-pointer"
              />
            </div>
          </div>
          <div className="mt-4">
            <CodeBlock
              title="theme.ts — your settings, copy-paste"
              lang="ts"
              code={themeCode}
            />
          </div>
        </section>

        {/* Gallery (themed scope) */}
        <SlyxUpProvider publishableKey="pk_test_preview" apiUrl={AUTH_URL}>
          <div ref={galleryRef} className="space-y-12">
            <Section
              title="SignIn"
              desc="Email/password + OAuth + 2FA challenge in one card. Submitting here talks to the real API, so a random email shows a genuine error state."
              demo={
                <div className="max-w-[380px] mx-auto">
                  <SignIn social={false} />
                </div>
              }
              code={`import { SlyxUpProvider, SignIn } from "@slyxup/ui"

<SlyxUpProvider publishableKey="pk_live_..." apiUrl="${AUTH_URL}">
  <SignIn
    onSuccess={() => router.push("/dashboard")}
    onSignUpClick={() => router.push("/sign-up")}
    onForgotPasswordClick={() => router.push("/forgot")}
  />
</SlyxUpProvider>`}
            />

            <Section
              title="SignUp"
              desc="Registration with verification states. Social buttons redirect to hosted OAuth — disabled in this preview to keep you on the page."
              demo={
                <div className="max-w-[380px] mx-auto">
                  <SignUp social={false} />
                </div>
              }
              code={`import { SignUp } from "@slyxup/ui"

<SignUp
  onSuccess={() => router.push("/verify")}
  onSignInClick={() => router.push("/sign-in")}
/>`}
            />

            <Section
              title="PricingTable"
              desc="Plans grid with popular badge. Pass real plans from billing — same shape as GET /v1/billing/plans."
              demo={<PricingTable plans={DEMO_PLANS} />}
              code={`import { PricingTable } from "@slyxup/ui"

const { plans } = await client.billing.plans.list()
<PricingTable plans={plans} onSelect={(p) => checkout(p.id)} />`}
            />

            <Section
              title="SocialButtons"
              desc="Google / GitHub OAuth redirect buttons. Clicking leaves for the OAuth start URL — try it, then come back."
              demo={
                <div className="max-w-[380px] mx-auto">
                  <SocialButtons />
                </div>
              }
              code={`import { SocialButtons } from "@slyxup/ui"

<SocialButtons providers={["google", "github"]} />
// → <apiUrl>/v1/oauth/:provider?redirect_url=…`}
            />

            <div className="grid lg:grid-cols-3 gap-4">
              <Section
                title="ForgotPassword"
                desc="Reset-email request with cooldown handling."
                demo={<ForgotPassword />}
                code={`import { ForgotPassword } from "@slyxup/ui"\n\n<ForgotPassword onBackToSignIn={() => router.push("/sign-in")} />`}
              />
              <Section
                title="ResetPassword"
                desc="Token-based reset (token comes from the email link). Demo token shows the validation flow."
                demo={<ResetPassword token="demo-token" />}
                code={`import { ResetPassword } from "@slyxup/ui"\n\n// /reset?token=…\n<ResetPassword token={searchParams.token} />`}
              />
              <Section
                title="EmailVerification"
                desc="Without a token it shows the resend form; with ?token it verifies."
                demo={<EmailVerification />}
                code={`import { EmailVerification } from "@slyxup/ui"\n\n<EmailVerification token={searchParams.token} />`}
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <Section
                title="UserButton"
                desc="Avatar + dropdown (profile, sign out). Signed out here, so it shows the fallback initial — sign in via admin to see it populated in your own app."
                demo={
                  <div className="flex justify-center py-4">
                    <UserButton />
                  </div>
                }
                code={`import { UserButton } from "@slyxup/ui"\n\n<UserButton onProfileClick={() => setProfileOpen(true)} />`}
              />
              <Section
                title="BillingPortal"
                desc="Current plan + invoices + cancel. Pure props — no session needed."
                demo={
                  <BillingPortal
                    subscription={DEMO_SUB}
                    invoices={DEMO_INVOICES}
                  />
                }
                code={`import { BillingPortal } from "@slyxup/ui"\n\nconst { subscription, invoices } = await client.billing.get()\n<BillingPortal subscription={subscription} invoices={invoices} />`}
              />
            </div>

            <Section
              title="UserProfile + AdminPanel"
              desc="UserProfile renders the full account modal (profile, security, 2FA, billing) — it needs a signed-in session, so it renders nothing here; AdminPanel needs a secret key and makes privileged calls, so it is code-only on this public page."
              demo={
                <div className="text-[12.5px] text-[#63666f] leading-relaxed">
                  Open your browser devtools on an app with a session to see{' '}
                  <span className="font-mono">UserProfile</span> live — or drop
                  these two snippets in.
                </div>
              }
              code={`import { UserProfile, AdminPanel } from "@slyxup/ui"

// Inline profile (modal={false}) or overlay (default)
<UserProfile modal={false} onClose={() => setOpen(false)} />

// Full admin: users, sessions, keys, audit — server-rendered page only
<AdminPanel secretKey={process.env.SLYXUP_SECRET_KEY!} />`}
            />
          </div>
        </SlyxUpProvider>

        <p className="text-center text-[12px] text-[#63666f]">
          All components self-inject styles (no CSS import), respect{' '}
          <span className="font-mono">prefers-reduced-motion</span>, and reflow
          down to 360px viewports.
        </p>
      </div>
    </div>
  );
}
