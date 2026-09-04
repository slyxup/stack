import {
  ACCENTS,
  type AccentName,
  type AuthLayout,
  BillingPortal,
  EmailVerification,
  FONTS,
  ForgotPassword,
  PricingTable,
  type PrimaryStyle,
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

const UI_VERSION = '2.2.0';

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

/** Single-column section: title, demo (centered, width-capped), code below. Nothing overflows. */
function Section({
  title,
  desc,
  demo,
  code,
  wide,
}: {
  title: string;
  desc: string;
  demo: ReactNode;
  code: string;
  wide?: boolean;
}) {
  return (
    <section className="min-w-0">
      <h2 className="font-mono text-[14px] font-bold">{`<${title} />`}</h2>
      <p className="text-[13px] text-[#63666f] mt-1 mb-4 max-w-2xl leading-relaxed">
        {desc}
      </p>
      <div className="rounded-2xl border border-[#e4e6eb] bg-white p-4 sm:p-8 min-w-0">
        <div
          className={`mx-auto min-w-0 ${wide ? 'max-w-3xl' : 'max-w-[400px]'}`}
        >
          <DemoBoundary label={title}>{demo}</DemoBoundary>
        </div>
      </div>
      <div className="mt-3 min-w-0">
        <CodeBlock title={`${title}.tsx`} lang="tsx" code={code} />
      </div>
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-wider text-[#63666f] mb-2">
      {children}
    </div>
  );
}

function Switch({
  on,
  onClick,
  label,
}: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${on ? 'bg-[#6d28d9]' : 'bg-[#d4d7de]'}`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  );
}

type FontKey = keyof typeof FONTS;

export default function UiKit() {
  const [mode, setMode] = useState<ThemeMode>('auto');
  const [accent, setAccent] = useState<AccentName | 'custom'>('violet');
  const [customColor, setCustomColor] = useState('#e8562a');
  const [font, setFont] = useState<FontKey>('default');
  const [radius, setRadius] = useState(10);
  const [primary, setPrimary] = useState<PrimaryStyle>('accent');

  const [layout, setLayout] = useState<AuthLayout>('centered');
  const [social, setSocial] = useState(true);
  const [username, setUsername] = useState(true);

  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!galleryRef.current) return;
    const cleanup = applyTheme(
      {
        mode,
        accent: accent === 'custom' ? customColor : accent,
        font,
        radius,
        primary,
      },
      galleryRef.current
    );
    return cleanup;
  }, [mode, accent, customColor, font, radius, primary]);

  const themeCode = `import { applyTheme } from "@slyxup/ui"

applyTheme({
  mode: "${mode}",
  accent: "${accent === 'custom' ? customColor : accent}",
  font: "${font}",
  radius: ${radius},
  primary: "${primary}",
})`;

  const authCode = `import { SignIn, SignUp } from "@slyxup/ui"

<SignIn layout="${layout}" social={${social}}} username={${username}}} />
<SignUp layout="${layout}" social={${social}}} username={${username}}} />`;

  return (
    <div className="min-h-screen bg-[#0b0b10] text-white overflow-x-clip">
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0b10]/85 backdrop-blur">
        <div className="mx-auto max-w-[1000px] px-4 sm:px-8 py-3 flex items-center gap-2 min-w-0">
          <div className="size-8 rounded-lg bg-gradient-to-br from-[#6d28d9] to-[#4c1d95] flex items-center justify-center text-white shrink-0">
            <Blocks className="size-4" />
          </div>
          <span className="text-[14px] font-bold truncate">SlyxUp UI Kit</span>
          <span className="font-mono text-[11px] bg-white/10 px-2 py-0.5 rounded-md text-white/60 shrink-0">
            v{UI_VERSION}
          </span>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Link
              to="/"
              className="hidden sm:block text-[12.5px] font-semibold text-white/60 hover:text-white"
            >
              Home
            </Link>
            <Link
              to="/docs"
              className="hidden sm:flex items-center gap-1.5 text-[12.5px] font-semibold text-white/60 hover:text-white"
            >
              <BookOpen className="size-3.5" /> Docs
            </Link>
            <Link
              to="/admin"
              className="rounded-full bg-white text-[#0b0b10] px-4 py-2 text-[12.5px] font-bold hover:bg-white/85"
            >
              Open admin
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1000px] px-4 sm:px-8 py-8 sm:py-12 space-y-8 min-w-0">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-10 min-w-0">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(640px 300px at 12% 0%, rgba(109,40,217,0.42), transparent 65%), radial-gradient(520px 280px at 95% 100%, rgba(34,211,238,0.13), transparent 60%)',
            }}
          />
          <div className="relative max-w-2xl min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.12em] text-white/70">
              11 components · 3 layouts · live
            </div>
            <h1 className="font-display mt-4 text-[30px] sm:text-[44px] font-extrabold leading-[1.02] text-balance">
              Every component, <span className="text-gradient">live.</span>
            </h1>
            <p className="text-[14px] text-white/60 mt-3 leading-relaxed">
              The full{' '}
              <span className="font-mono text-[12.5px] bg-white/10 px-1.5 py-0.5 rounded-md text-white/85">
                @slyxup/ui
              </span>{' '}
              kit rendered on this page — not screenshots. Tune the playgrounds
              and watch everything follow.
            </p>
            <div className="mt-5 max-w-xl min-w-0">
              <CodeBlock
                title="install"
                lang="bash"
                code={'pnpm add @slyxup/ui'}
              />
            </div>
          </div>
        </div>

        {/* Theme playground */}
        <section className="rounded-2xl border border-[#e4e6eb] bg-white p-5 sm:p-6 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-[16px] font-bold tracking-tight">
              Theme playground
            </h2>
            <span className="text-[12px] text-[#63666f]">
              Applies to the gallery via{' '}
              <span className="font-mono">applyTheme()</span>
            </span>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            <div className="min-w-0">
              <FieldLabel>Mode</FieldLabel>
              <div className="flex rounded-full border border-[#e4e6eb] p-1">
                {(['auto', 'light', 'dark'] as ThemeMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex-1 min-w-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold capitalize cursor-pointer truncate ${mode === m ? 'bg-[#101014] text-white' : 'text-[#63666f]'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-w-0">
              <FieldLabel>Primary buttons</FieldLabel>
              <div className="flex rounded-full border border-[#e4e6eb] p-1">
                {(['ink', 'accent'] as PrimaryStyle[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrimary(p)}
                    className={`flex-1 min-w-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold capitalize cursor-pointer truncate ${primary === p ? 'bg-[#6d28d9] text-white' : 'text-[#63666f]'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-w-0">
              <FieldLabel>Font</FieldLabel>
              <select
                value={font}
                onChange={(e) => setFont(e.target.value as FontKey)}
                className="w-full h-9 rounded-xl border border-[#e4e6eb] bg-white px-3 text-[13px] font-medium cursor-pointer min-w-0"
              >
                {(Object.keys(FONTS) as FontKey[]).map((f) => (
                  <option key={f} value={f}>
                    {FONTS[f].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <FieldLabel>Accent</FieldLabel>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(Object.keys(ACCENTS) as AccentName[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    title={ACCENTS[a].label}
                    onClick={() => setAccent(a)}
                    className={`size-7 rounded-full cursor-pointer border-2 shrink-0 ${accent === a ? 'border-[#101014] scale-110' : 'border-transparent'}`}
                    style={{
                      background: `linear-gradient(135deg, ${ACCENTS[a].accent}, ${ACCENTS[a].gradientTo})`,
                    }}
                  />
                ))}
                <label
                  title="Custom color"
                  className={`size-7 rounded-full cursor-pointer border-2 overflow-hidden relative shrink-0 ${accent === 'custom' ? 'border-[#101014] scale-110' : 'border-dashed border-[#c6c9d2]'}`}
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
            <div className="min-w-0">
              <FieldLabel>
                Radius · <span className="font-mono">{radius}px</span>
              </FieldLabel>
              <input
                type="range"
                min={0}
                max={20}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full accent-[#6d28d9] cursor-pointer"
              />
            </div>
            <div className="min-w-0 sm:col-span-2 xl:col-span-1">
              <FieldLabel>Your theme, copy-paste</FieldLabel>
              <CodeBlock title="theme.ts" lang="ts" code={themeCode} />
            </div>
          </div>
        </section>

        {/* Auth variants playground + gallery */}
        <SlyxUpProvider publishableKey="pk_test_preview" apiUrl={AUTH_URL}>
          <div ref={galleryRef} className="space-y-10 min-w-0">
            <section className="rounded-2xl border border-[#e4e6eb] bg-white p-5 sm:p-6 min-w-0">
              <h2 className="text-[16px] font-bold tracking-tight">
                Auth pages playground
              </h2>
              <p className="text-[12.5px] text-[#63666f] mt-1 mb-4">
                Three professional variants. Toggle OAuth and username, pick a
                layout — previews and code update together.
              </p>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex rounded-full border border-[#e4e6eb] p-1 min-w-0">
                  {(['centered', 'split', 'minimal'] as AuthLayout[]).map(
                    (l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLayout(l)}
                        className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold capitalize cursor-pointer whitespace-nowrap ${layout === l ? 'bg-[#101014] text-white' : 'text-[#63666f]'}`}
                      >
                        {l}
                      </button>
                    )
                  )}
                </div>
                <span className="flex items-center gap-2 text-[12.5px] font-semibold cursor-pointer">
                  <Switch
                    on={social}
                    onClick={() => setSocial((v) => !v)}
                    label="OAuth buttons"
                  />{' '}
                  OAuth
                </span>
                <span className="flex items-center gap-2 text-[12.5px] font-semibold cursor-pointer">
                  <Switch
                    on={username}
                    onClick={() => setUsername((v) => !v)}
                    label="Username field"
                  />{' '}
                  Username
                </span>
              </div>
              <div className="mt-4 min-w-0">
                <CodeBlock
                  title="auth.tsx — your config, copy-paste"
                  lang="tsx"
                  code={authCode}
                />
              </div>
            </section>

            <Section
              title="SignIn"
              desc="Email/password + optional OAuth + 2FA challenge. Submitting here talks to the real API, so a random email shows a genuine error state."
              wide={layout === 'split'}
              demo={
                <SignIn
                  layout={layout}
                  social={social}
                  username={username && social ? true : username}
                />
              }
              code={
                'import { SignIn } from "@slyxup/ui"\n\n<SignIn onSuccess={() => router.push("/dashboard")} />'
              }
            />

            <Section
              title="SignUp"
              desc="Registration with verification states. The username field is real — passed to signUp when filled."
              wide={layout === 'split'}
              demo={
                <SignUp layout={layout} social={social} username={username} />
              }
              code={
                'import { SignUp } from "@slyxup/ui"\n\n<SignUp onSuccess={() => router.push("/verify")} />'
              }
            />

            <Section
              title="PricingTable"
              desc="Plans grid with popular badge. Pass real plans from billing — same shape as GET /v1/billing/plans."
              wide
              demo={<PricingTable plans={DEMO_PLANS} />}
              code={
                'import { PricingTable } from "@slyxup/ui"\n\nconst { plans } = await client.billing.plans.list()\n<PricingTable plans={plans} onSelect={(p) => checkout(p.id)} />'
              }
            />

            <Section
              title="SocialButtons"
              desc="Google / GitHub OAuth redirect buttons. Clicking leaves for the OAuth start URL."
              demo={<SocialButtons />}
              code={
                'import { SocialButtons } from "@slyxup/ui"\n\n<SocialButtons providers={["google", "github"]} />'
              }
            />

            <Section
              title="ForgotPassword"
              desc="Reset-email request with cooldown handling."
              demo={<ForgotPassword />}
              code={
                'import { ForgotPassword } from "@slyxup/ui"\n\n<ForgotPassword onBackToSignIn={() => router.push("/sign-in")} />'
              }
            />

            <Section
              title="ResetPassword"
              desc="Token-based reset (token comes from the email link). Demo token shows the validation flow."
              demo={<ResetPassword token="demo-token" />}
              code={
                'import { ResetPassword } from "@slyxup/ui"\n\n<ResetPassword token={searchParams.token} />'
              }
            />

            <Section
              title="EmailVerification"
              desc="Without a token it shows the resend form; with ?token it verifies."
              demo={<EmailVerification />}
              code={
                'import { EmailVerification } from "@slyxup/ui"\n\n<EmailVerification token={searchParams.token} />'
              }
            />

            <Section
              title="UserButton"
              desc="Avatar + dropdown (profile, sign out). Signed out here, so it shows the fallback initial."
              demo={
                <div className="flex justify-center py-4">
                  <UserButton />
                </div>
              }
              code={
                'import { UserButton } from "@slyxup/ui"\n\n<UserButton onProfileClick={() => setProfileOpen(true)} />'
              }
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
              code={
                'import { BillingPortal } from "@slyxup/ui"\n\nconst { subscription, invoices } = await client.billing.get()\n<BillingPortal subscription={subscription} invoices={invoices} />'
              }
            />

            <Section
              title="UserProfile + AdminPanel"
              desc="UserProfile renders the full account modal but needs a signed-in session, so it renders nothing here. AdminPanel needs a secret key and makes privileged calls, so it stays code-only on this public page."
              demo={
                <div className="text-[12.5px] text-[#63666f] leading-relaxed text-center">
                  Drop the snippets into an authenticated app to see them live.
                </div>
              }
              code={
                'import { UserProfile, AdminPanel } from "@slyxup/ui"\n\n<UserProfile modal={false} onClose={() => setOpen(false)} />\n\n<AdminPanel secretKey={process.env.SLYXUP_SECRET_KEY!} />'
              }
            />
          </div>
        </SlyxUpProvider>

        <p className="text-center text-[12px] text-white/45">
          All components self-inject styles (no CSS import), respect{' '}
          <span className="font-mono">prefers-reduced-motion</span>, and reflow
          down to 360px viewports.
        </p>
      </div>
    </div>
  );
}
