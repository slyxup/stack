import {
  ACCENTS,
  type AccentName,
  type AuthLayout,
  BillingPortal,
  CopyField,
  type Density,
  EmailVerification,
  EmptyState,
  FONTS,
  ForgotPassword,
  OtpInput,
  PasswordField,
  PasswordStrength,
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
import { Input } from '../components/ui';
import { AUTH_URL } from '../lib/api';

const UI_VERSION = '2.5.0';

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
  { failed: boolean; message: string }
> {
  state = { failed: false, message: '' };
  static getDerivedStateFromError(e: unknown) {
    return {
      failed: true,
      message: e instanceof Error ? e.message : String(e),
    };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="rounded-xl border border-dashed border-red-300 bg-red-50/50 p-6 text-center">
          <div className="text-[12.5px] font-bold text-red-700">
            {this.props.label} failed to render
          </div>
          <div className="mt-1 font-mono text-[11px] text-red-600 break-all">
            {this.state.message}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Interactive demos (module level so hooks stay legal) ── */

function PasswordStrengthDemo() {
  const [pw, setPw] = useState('slyxup-2026!');
  return (
    <div className="mx-auto max-w-[360px] space-y-1">
      <Input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="Type a password"
      />
      <PasswordStrength password={pw} />
    </div>
  );
}

function OtpDemo() {
  const [done, setDone] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-[360px]">
      <OtpInput onComplete={(c) => setDone(c)} />
      <div className="mt-3 text-center font-mono text-[12px] text-[#63666f] h-4">
        {done ? `completed: ${done}` : 'fill all 6 boxes'}
      </div>
    </div>
  );
}

function StandalonePasswordDemo() {
  const [pw, setPw] = useState('');
  return (
    <div className="mx-auto max-w-[360px]">
      <PasswordField
        id="demo-pw"
        value={pw}
        onChange={setPw}
        placeholder="••••••••"
      />
    </div>
  );
}

/* ── Registry ── */

interface Item {
  id: string;
  name: string;
  desc: string;
  code: string;
  props: Array<[string, string, string]>;
  demo?: ReactNode;
  demoNote?: string;
  wide?: boolean;
}

const GROUPS: Array<{ label: string; items: Item[] }> = [
  {
    label: 'Auth pages',
    items: [
      {
        id: 'signin',
        name: 'SignIn',
        desc: 'Email/password + optional OAuth + 2FA challenge. Submitting here talks to the real API, so a random email shows a genuine error state.',
        code: 'import { SignIn } from "@slyxup/ui"\n\n<SignIn layout="split" social username\n  onSuccess={() => router.push("/dashboard")} />',
        props: [
          ['social', 'boolean', 'true'],
          ['layout', 'centered | split | minimal', 'centered'],
          ['username', 'boolean', 'false'],
          ['onSuccess', '() => void', '—'],
          ['brandTitle/Sub/Points', 'split panel', 'defaults'],
        ],
        demo: null,
        wide: false,
      },
      {
        id: 'signup',
        name: 'SignUp',
        desc: 'Registration with verification states. The username field is real — passed to signUp when filled.',
        code: 'import { SignUp } from "@slyxup/ui"\n\n<SignUp layout="split" username\n  onSuccess={() => router.push("/verify")} />',
        props: [
          ['social', 'boolean', 'true'],
          ['layout', 'centered | split | minimal', 'centered'],
          ['username', 'boolean', 'true'],
          ['onSuccess / onSignInClick', 'callbacks', '—'],
        ],
        demo: null,
        wide: false,
      },
    ],
  },
  {
    label: 'Password flows',
    items: [
      {
        id: 'forgot',
        name: 'ForgotPassword',
        desc: 'Reset-email request with cooldown handling.',
        code: 'import { ForgotPassword } from "@slyxup/ui"\n\n<ForgotPassword onBackToSignIn={() => router.push("/sign-in")} />',
        props: [
          ['apiUrl?', 'string', 'provider url'],
          ['onSuccess?', '() => void', '—'],
          ['onBackToSignIn?', '() => void', '—'],
        ],
        demo: <ForgotPassword />,
      },
      {
        id: 'reset',
        name: 'ResetPassword',
        desc: 'Token-based reset (token comes from the email link). Demo token shows the validation flow.',
        code: 'import { ResetPassword } from "@slyxup/ui"\n\n<ResetPassword token={searchParams.token} />',
        props: [
          ['token*', 'string', '—'],
          ['apiUrl?', 'string', '—'],
          ['onSuccess?', '() => void', '—'],
        ],
        demo: <ResetPassword token="demo-token" />,
      },
      {
        id: 'verify',
        name: 'EmailVerification',
        desc: 'Without a token it shows the resend form; with ?token it verifies.',
        code: 'import { EmailVerification } from "@slyxup/ui"\n\n<EmailVerification token={searchParams.token} />',
        props: [
          ['token?', 'string', '—'],
          ['apiUrl?', 'string', '—'],
          ['onSuccess?', '() => void', '—'],
        ],
        demo: <EmailVerification />,
      },
      {
        id: 'pwfield',
        name: 'PasswordField',
        desc: 'Password input with reveal toggle. Drop into any custom form.',
        code: 'import { PasswordField } from "@slyxup/ui"\n\n<PasswordField id="pw" value={pw} onChange={setPw}\n  required minLength={8} />',
        props: [
          ['id* / value* / onChange*', 'string', '—'],
          ['showToggle', 'boolean', 'true'],
          [
            'autoComplete / placeholder / required / minLength',
            'input attrs',
            '—',
          ],
        ],
        demo: <StandalonePasswordDemo />,
      },
      {
        id: 'pwstrength',
        name: 'PasswordStrength',
        desc: '5-segment meter scored by length + variety. Try typing above — plus a pure passwordScore() helper.',
        code: 'import { PasswordStrength, passwordScore } from "@slyxup/ui"\n\n<PasswordStrength password={pw} />\nif (passwordScore(pw) < 2) return "Pick something stronger"',
        props: [
          ['password*', 'string', '—'],
          ['showLabel', 'boolean', 'true'],
        ],
        demo: <PasswordStrengthDemo />,
      },
      {
        id: 'otp',
        name: 'OtpInput',
        desc: 'One-time-code boxes with paste + arrow-key navigation. Fill all six to fire onComplete.',
        code: 'import { OtpInput } from "@slyxup/ui"\n\n<OtpInput length={6} onComplete={(code) => verify(code)} />',
        props: [
          ['length', 'number', '6'],
          ['value? / onChange?', 'controlled', '—'],
          ['onComplete?', '(code) => void', '—'],
          ['autoFocus? / disabled? / label?', '—', '—'],
        ],
        demo: <OtpDemo />,
      },
    ],
  },
  {
    label: 'Form primitives',
    items: [
      {
        id: 'pwfield',
        name: 'PasswordField',
        desc: 'Password input with reveal toggle. Drop into any custom form.',
        code: 'import { PasswordField } from "@slyxup/ui"\n\n<PasswordField id="pw" value={pw} onChange={setPw}\n  required minLength={8} />',
        props: [
          ['id* / value* / onChange*', 'string', '—'],
          ['showToggle', 'boolean', 'true'],
          [
            'autoComplete / placeholder / required / minLength',
            'input attrs',
            '—',
          ],
        ],
        demo: <StandalonePasswordDemo />,
      },
      {
        id: 'pwstrength',
        name: 'PasswordStrength',
        desc: 'Live meter scored by length + variety. Type above — plus a pure passwordScore() helper for validation.',
        code: 'import { PasswordStrength, passwordScore } from "@slyxup/ui"\n\n<PasswordStrength password={pw} />\nif (passwordScore(pw) < 2) return "Pick something stronger"',
        props: [
          ['password*', 'string', '—'],
          ['showLabel', 'boolean', 'true'],
        ],
        demo: <PasswordStrengthDemo />,
      },
      {
        id: 'otp',
        name: 'OtpInput',
        desc: 'One-time-code boxes with paste + arrow-key navigation. Fill all six to fire onComplete.',
        code: 'import { OtpInput } from "@slyxup/ui"\n\n<OtpInput length={6} onComplete={(code) => verify(code)} />',
        props: [
          ['length', 'number', '6'],
          ['value? / onChange?', 'controlled', '—'],
          ['onComplete?', '(code) => void', '—'],
          ['autoFocus? / disabled? / label?', '—', '—'],
        ],
        demo: <OtpDemo />,
      },
      {
        id: 'copy',
        name: 'CopyField',
        desc: 'Masked value + copy button. Built for API keys, tokens, webhook secrets.',
        code: 'import { CopyField } from "@slyxup/ui"\n\n<CopyField label="Secret key" value="sk_live_abc123..." />',
        props: [
          ['value*', 'string', '—'],
          ['label?', 'string', '—'],
          ['masked', 'boolean', 'true'],
        ],
        demo: (
          <div className="mx-auto max-w-[360px]">
            <CopyField
              label="Secret key"
              value="sk_live_9f2c7d4a1b5e8f0a3c6d"
            />
          </div>
        ),
      },
      {
        id: 'empty',
        name: 'EmptyState',
        desc: 'Friendly placeholder for empty lists and results.',
        code: 'import { EmptyState } from "@slyxup/ui"\n\n<EmptyState title="No keys yet"\n  desc="Create one to get started."\n  action={<button>Create key</button>} />',
        props: [
          ['title*', 'string', '—'],
          ['desc?', 'string', '—'],
          ['action? / icon?', 'ReactNode', '—'],
        ],
        demo: (
          <EmptyState title="No keys yet" desc="Create one to get started." />
        ),
      },
    ],
  },
  {
    label: 'Social & billing',
    items: [
      {
        id: 'social',
        name: 'SocialButtons',
        desc: 'Google / GitHub OAuth redirect buttons. Clicking leaves for the OAuth start URL.',
        code: 'import { SocialButtons } from "@slyxup/ui"\n\n<SocialButtons providers={["google", "github"]} />',
        props: [
          ['providers', 'google | github[]', 'both'],
          ['basePath?', 'string', 'provider url'],
        ],
        demo: <SocialButtons />,
      },
      {
        id: 'pricing',
        name: 'PricingTable',
        desc: 'Plans grid with popular badge. Same shape as GET /v1/billing/plans.',
        code: 'import { PricingTable } from "@slyxup/ui"\n\nconst { plans } = await client.billing.plans.list()\n<PricingTable plans={plans} onSelect={(p) => checkout(p.id)} />',
        props: [
          ['plans*', 'Plan[]', '—'],
          ['onSelect?', '(plan) => void', '—'],
          ['loading?', 'boolean', '—'],
        ],
        demo: <PricingTable plans={DEMO_PLANS} />,
        wide: true,
      },
      {
        id: 'portal',
        name: 'BillingPortal',
        desc: 'Current plan + invoices + cancel. Pure props — no session needed.',
        code: 'import { BillingPortal } from "@slyxup/ui"\n\nconst { subscription, invoices } = await client.billing.get()\n<BillingPortal subscription={subscription} invoices={invoices} />',
        props: [
          ['subscription', 'Subscription | null', '—'],
          ['invoices', 'Invoice[]', '—'],
          ['onCancel?', '() => void', '—'],
        ],
        demo: (
          <BillingPortal subscription={DEMO_SUB} invoices={DEMO_INVOICES} />
        ),
        wide: true,
      },
    ],
  },
  {
    label: 'Account & admin',
    items: [
      {
        id: 'userbutton',
        name: 'UserButton',
        desc: 'Avatar + dropdown (profile, sign out). Signed out here, so it shows the fallback initial.',
        code: 'import { UserButton } from "@slyxup/ui"\n\n<UserButton onProfileClick={() => setProfileOpen(true)} />',
        props: [['onProfileClick?', '() => void', '—']],
        demo: (
          <div className="flex justify-center py-4">
            <UserButton />
          </div>
        ),
      },
      {
        id: 'copy',
        name: 'CopyField',
        desc: 'Masked value + copy button. Built for API keys, tokens, webhook secrets.',
        code: 'import { CopyField } from "@slyxup/ui"\n\n<CopyField label="Secret key" value="sk_live_abc123..." />',
        props: [
          ['value*', 'string', '—'],
          ['label?', 'string', '—'],
          ['masked', 'boolean', 'true'],
        ],
        demo: (
          <div className="mx-auto max-w-[360px]">
            <CopyField
              label="Secret key"
              value="sk_live_9f2c7d4a1b5e8f0a3c6d"
            />
          </div>
        ),
      },
      {
        id: 'empty',
        name: 'EmptyState',
        desc: 'Friendly placeholder for empty lists and results.',
        code: 'import { EmptyState } from "@slyxup/ui"\n\n<EmptyState title="No keys yet"\n  desc="Create one to get started."\n  action={<button>Create key</button>} />',
        props: [
          ['title*', 'string', '—'],
          ['desc?', 'string', '—'],
          ['action? / icon?', 'ReactNode', '—'],
        ],
        demo: (
          <EmptyState title="No keys yet" desc="Create one to get started." />
        ),
      },
      {
        id: 'profile',
        name: 'UserProfile',
        desc: 'Full account modal (profile, security, 2FA, billing) — needs a signed-in session, so it renders nothing on this public page. Code below works in any authenticated app.',
        code: 'import { UserProfile } from "@slyxup/ui"\n\n<UserProfile modal={false} onClose={() => setOpen(false)} />',
        props: [
          ['modal', 'boolean', 'true'],
          ['onClose?', '() => void', '—'],
          ['onDeleted?', '() => void', '—'],
        ],
      },
      {
        id: 'admin',
        name: 'AdminPanel',
        desc: 'Users, sessions, keys, audit — secret key only, server-rendered pages. Code-only here by design.',
        code: 'import { AdminPanel } from "@slyxup/ui"\n\n<AdminPanel secretKey={process.env.SLYXUP_SECRET_KEY!} />',
        props: [
          ['secretKey*', 'sk_…', '—'],
          ['apiUrl?', 'string', '—'],
          ['fullPage?', 'boolean', 'true'],
        ],
      },
    ],
  },
];

const ALL_IDS = GROUPS.flatMap((g) => g.items.map((i) => i.id));

function findItem(id: string) {
  for (const g of GROUPS) for (const i of g.items) if (i.id === id) return i;
  return GROUPS[0].items[0];
}

/* ── Small controls ── */

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
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${on ? 'bg-black' : 'bg-[#d4d7de]'}`}
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
  const [accent, setAccent] = useState<AccentName | 'custom'>('mono');
  const [customColor, setCustomColor] = useState('#e8562a');
  const [font, setFont] = useState<FontKey>('default');
  const [radius, setRadius] = useState(10);
  const [primary, setPrimary] = useState<PrimaryStyle>('accent');
  const [density, setDensity] = useState<Density>('comfortable');

  const [layout, setLayout] = useState<AuthLayout>('centered');
  const [social, setSocial] = useState(true);
  const [username, setUsername] = useState(true);

  const [selected, setSelected] = useState('signin');
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
        density,
      },
      galleryRef.current
    );
    return cleanup;
  }, [mode, accent, customColor, font, radius, primary, density]);

  const item = findItem(selected);

  const authCode = `import { SignIn, SignUp } from "@slyxup/ui"

<SignIn layout="${layout}" social={${social}}} username={${username}}} />
<SignUp layout="${layout}" social={${social}}} username={${username}}} />`;

  const themeCode = `import { applyTheme } from "@slyxup/ui"

applyTheme({
  mode: "${mode}",
  accent: "${accent === 'custom' ? customColor : accent}",
  font: "${font}",
  radius: ${radius},
  primary: "${primary}",
  density: "${density}",
})`;

  function renderDemo(it: Item): ReactNode {
    if (it.id === 'signin')
      return <SignIn layout={layout} social={social} username={username} />;
    if (it.id === 'signup')
      return <SignUp layout={layout} social={social} username={username} />;
    return it.demo;
  }

  return (
    <div className="min-h-screen bg-[#0b0b10] text-white overflow-x-clip">
      {/* Topbar */}
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0b10]/85 backdrop-blur">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-8 py-3 flex items-center gap-2 min-w-0">
          <div className="size-8 rounded-lg bg-white text-black flex items-center justify-center shrink-0">
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

      <div className="mx-auto max-w-[1200px] px-4 sm:px-8 py-8 sm:py-10 min-w-0">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-8 min-w-0">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(640px 300px at 12% 0%, rgba(255,255,255,0.09), transparent 65%)',
            }}
          />
          <div className="relative min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.12em] text-white/70">
              {GROUPS.reduce((n, g) => n + g.items.length, 0)} components · live
            </div>
            <h1 className="font-display mt-4 text-[28px] sm:text-[40px] font-extrabold leading-[1.02] text-balance">
              Every component, <span className="text-gradient">live.</span>
            </h1>
            <p className="text-[14px] text-white/60 mt-3 leading-relaxed max-w-2xl">
              Pick a component on the left, see it on the right. Tune the theme
              — fonts, accents, density — and watch everything follow.
            </p>
          </div>
        </div>

        {/* Theme playground */}
        <section className="mt-4 rounded-2xl border border-[#e4e6eb] bg-white p-5 sm:p-6 min-w-0 text-black">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-[15px] font-bold tracking-tight">
              Theme playground
            </h2>
            <span className="text-[12px] text-[#63666f]">
              Applies to the preview via{' '}
              <span className="font-mono">applyTheme()</span>
            </span>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <div className="min-w-0">
              <FieldLabel>Mode</FieldLabel>
              <div className="flex rounded-full border border-[#e4e6eb] p-1">
                {(['auto', 'light', 'dark'] as ThemeMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex-1 min-w-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold capitalize cursor-pointer truncate ${mode === m ? 'bg-black text-white' : 'text-[#63666f]'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-w-0">
              <FieldLabel>Density + Primary</FieldLabel>
              <div className="flex gap-2">
                <div className="flex flex-1 rounded-full border border-[#e4e6eb] p-1">
                  {(['comfortable', 'compact'] as Density[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDensity(d)}
                      className={`flex-1 min-w-0 rounded-full px-2 py-1.5 text-[11.5px] font-semibold capitalize cursor-pointer truncate ${density === d ? 'bg-black text-white' : 'text-[#63666f]'}`}
                    >
                      {d === 'comfortable' ? 'Comfy' : 'Compact'}
                    </button>
                  ))}
                </div>
                <div className="flex flex-1 rounded-full border border-[#e4e6eb] p-1">
                  {(['ink', 'accent'] as PrimaryStyle[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrimary(p)}
                      className={`flex-1 min-w-0 rounded-full px-2 py-1.5 text-[11.5px] font-semibold capitalize cursor-pointer truncate ${primary === p ? 'bg-black text-white' : 'text-[#63666f]'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
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
                    className={`size-7 rounded-full cursor-pointer border-2 shrink-0 ${accent === a ? 'border-black scale-110' : 'border-transparent'}`}
                    style={{
                      background: `linear-gradient(135deg, ${ACCENTS[a].accent}, ${ACCENTS[a].gradientTo})`,
                    }}
                  />
                ))}
                <label
                  title="Custom color"
                  className={`size-7 rounded-full cursor-pointer border-2 overflow-hidden relative shrink-0 ${accent === 'custom' ? 'border-black scale-110' : 'border-dashed border-[#c6c9d2]'}`}
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
                className="w-full accent-black cursor-pointer"
              />
            </div>
            <div className="min-w-0 sm:col-span-2 xl:col-span-1">
              <FieldLabel>Your theme, copy-paste</FieldLabel>
              <CodeBlock title="theme.ts" lang="ts" code={themeCode} />
            </div>
            <div className="min-w-0 sm:col-span-2 xl:col-span-2">
              <FieldLabel>
                Auth pages (applies to SignIn + SignUp below)
              </FieldLabel>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
                <div className="flex rounded-full border border-[#e4e6eb] p-1 min-w-0">
                  {(['centered', 'split', 'minimal'] as AuthLayout[]).map(
                    (l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLayout(l)}
                        className={`rounded-full px-4 py-1.5 text-[12px] font-semibold capitalize cursor-pointer whitespace-nowrap ${layout === l ? 'bg-black text-white' : 'text-[#63666f]'}`}
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
            </div>
          </div>
        </section>

        {/* Sidebar + preview */}
        <div className="mt-4 flex flex-col lg:flex-row gap-4 items-start min-w-0">
          <aside className="w-full lg:w-[240px] shrink-0 lg:sticky lg:top-[68px] min-w-0">
            <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 min-w-0">
              {GROUPS.map((g) => (
                <div key={g.label} className="min-w-0 shrink-0 lg:shrink">
                  <div className="hidden lg:block px-3 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/35 first:pt-1">
                    {g.label}
                  </div>
                  <div className="flex lg:flex-col gap-1">
                    {g.items.map((i) => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => setSelected(i.id)}
                        className={`shrink-0 lg:w-full text-left rounded-lg px-3.5 py-2 text-[13px] font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                          selected === i.id
                            ? 'bg-white text-black'
                            : 'text-white/55 hover:text-white hover:bg-white/[0.07]'
                        }`}
                      >
                        <span className="font-mono text-[12px]">{i.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <SlyxUpProvider publishableKey="pk_test_preview" apiUrl={AUTH_URL}>
            <div ref={galleryRef} className="flex-1 min-w-0 w-full">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-7 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="font-mono text-[15px] font-bold text-white">{`<${item.name} />`}</h2>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11px] font-semibold text-white/55">
                    {
                      GROUPS.find((g) => g.items.some((i) => i.id === item.id))
                        ?.label
                    }
                  </span>
                </div>
                <p className="text-[13px] text-white/55 mt-1.5 mb-5 leading-relaxed max-w-2xl">
                  {item.desc}
                </p>
                {(item.id === 'signin' || item.id === 'signup') && (
                  <div className="mb-4 min-w-0">
                    <CodeBlock
                      title="auth.tsx — current playground config"
                      lang="tsx"
                      code={authCode}
                    />
                  </div>
                )}
                <div className="demo-frame min-w-0">
                  <div className="demo-frame-inner min-w-0">
                    <div className="demo-bar">
                      <span className="flex gap-1.5">
                        <i className="block size-2 rounded-full bg-[#ff5f56]" />
                        <i className="block size-2 rounded-full bg-[#ffbd2e]" />
                        <i className="block size-2 rounded-full bg-[#27c93f]" />
                      </span>
                      <span className="ml-1 truncate">
                        live preview — {item.name}
                      </span>
                      <span className="ml-auto flex items-center gap-1.5 shrink-0">
                        <span className="size-1.5 rounded-full bg-emerald-500 pulse-dot" />{' '}
                        interactive
                      </span>
                    </div>
                    <div className="p-4 sm:p-8 overflow-x-auto">
                      <div
                        className={`mx-auto min-w-0 ${item.wide || ((item.id === 'signin' || item.id === 'signup') && layout === 'split') ? 'max-w-3xl' : 'max-w-[400px]'}`}
                      >
                        <DemoBoundary label={item.name}>
                          {renderDemo(item)}
                        </DemoBoundary>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2 min-w-0">
                  <div className="min-w-0">
                    <CodeBlock
                      title={`${item.name}.tsx`}
                      lang="tsx"
                      code={item.code}
                    />
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-2">
                      Props
                    </div>
                    <dl className="space-y-1.5">
                      {item.props.map(([n, t, d]) => (
                        <div key={n} className="flex gap-2 text-[12px] min-w-0">
                          <dt className="font-mono text-white/85 shrink-0">
                            {n}
                          </dt>
                          <dd className="font-mono text-white/40 truncate">
                            {t}
                          </dd>
                          <dd className="ml-auto font-mono text-white/40 shrink-0">
                            {d}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </SlyxUpProvider>
        </div>

        <p className="text-center text-[12px] text-white/40">
          {ALL_IDS.length} components · self-injecting styles · 360px-safe ·
          motion-respecting
        </p>
      </div>
    </div>
  );
}
