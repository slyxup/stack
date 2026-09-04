import { ArrowRight, BookOpen, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CodeBlock } from '../components/CodeBlock';
import { Button, Card, CardBody } from '../components/ui';
import { AUTH_URL, BILLING_URL } from '../lib/api';

const SECTIONS = [
  { id: 'quickstart', label: 'Quickstart', keys: 'start install key domain project setup' },
  { id: 'react', label: 'React', keys: 'provider hooks signin signup userbutton' },
  { id: 'nextjs', label: 'Next.js', keys: 'middleware server component ssr' },
  { id: 'core', label: 'Core SDK', keys: 'headless client auth billing checkout' },
  { id: 'uikit', label: 'UI kit', keys: 'components theme pricing admin signin' },
  { id: 'api', label: 'API reference', keys: 'endpoints rest users keys projects domains oauth' },
  { id: 'cli', label: 'CLI', keys: 'terminal commands shorten' },
  { id: 'security', label: 'Security', keys: 'sessions password argon keys block https' },
];

function SectionContent({ section }: { section: string }) {
  return (
    <div className="docs-prose max-w-none">
      {section === 'quickstart' && (
        <>
          <h2>Quickstart</h2>
          <p>Five steps from zero to authenticated users in your own app:</p>
          <ul>
            <li>
              <b>1.</b> Sign in to this admin panel and create a project.
            </li>
            <li>
              <b>2.</b> Open the project → <b>Keys</b> → create a{' '}
              <code className="inline">publishable</code> key (
              <code className="inline">pk_live_…</code>) for the browser.
            </li>
            <li>
              <b>3.</b> Open the project → <b>Domains</b> → add your frontend
              origin (e.g. <code className="inline">app.example.com</code>).
            </li>
            <li>
              <b>4.</b> Install an SDK below and point it at your key.
            </li>
            <li>
              <b>5.</b> Users sign up through your app — they appear here under{' '}
              <b>Users</b>, where you can edit, block or delete them.
            </li>
          </ul>
          <h3>Install</h3>
          <CodeBlock
            title="install"
            lang="bash"
            code={'pnpm add @slyxup/core @slyxup/ui'}
          />
        </>
      )}

      {section === 'react' && (
        <>
          <h2>React integration</h2>
          <p>
            Wrap your app in the provider, then use hooks anywhere. Drop-in auth
            components come from <code className="inline">@slyxup/ui</code>.
          </p>
          <CodeBlock
            title="app.tsx"
            lang="tsx"
            code={`import { SlyxUpProvider, SignIn, UserButton } from "@slyxup/ui"

<SlyxUpProvider publishableKey="pk_live_..." apiUrl="${AUTH_URL}">
  <SignIn onSuccess={() => router.push("/dashboard")} />
  <UserButton />
</SlyxUpProvider>`}
          />
          <h3>Hooks</h3>
          <p>
            <code className="inline">useAuth</code> (signIn/signOut/session),{' '}
            <code className="inline">useUser</code>,{' '}
            <code className="inline">useSession</code>,{' '}
            <code className="inline">useBilling</code>,{' '}
            <code className="inline">usePlans</code>,{' '}
            <code className="inline">useSubscription</code>,{' '}
            <code className="inline">useTwoFactor</code>.
          </p>
        </>
      )}

      {section === 'nextjs' && (
        <>
          <h2>Next.js integration</h2>
          <p>
            Server-side auth via <code className="inline">@slyxup/nextjs</code>:
            read the session in Server Components and route handlers, protect
            pages in middleware.
          </p>
          <CodeBlock
            title="middleware.ts"
            lang="ts"
            code={`import { authMiddleware } from "@slyxup/nextjs"

export default authMiddleware({
  publishableKey: process.env.NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY!,
  apiUrl: "${AUTH_URL}",
  publicRoutes: ["/", "/sign-in"],
})

export const config = { matcher: ["/((?!_next|.*\\\\..*).*)"] }`}
          />
          <CodeBlock
            title="page.tsx"
            lang="tsx"
            code={`import { currentUser } from "@slyxup/nextjs"

export default async function Dashboard() {
  const user = await currentUser()
  if (!user) redirect("/sign-in")
  return <h1>Hi, {user.email}</h1>
}`}
          />
        </>
      )}

      {section === 'core' && (
        <>
          <h2>Core SDK (headless)</h2>
          <p>
            Prefer your own UI? <code className="inline">@slyxup/core</code> is
            the headless client underneath everything.
          </p>
          <CodeBlock
            title="auth.ts"
            lang="ts"
            code={`import { createClient } from "@slyxup/core"

const slyxup = createClient({
  publishableKey: "pk_live_...",
  apiUrl: "${AUTH_URL}",
})

await slyxup.auth.signUp({ email, password })
await slyxup.auth.signIn({ email, password })
const { user } = await slyxup.users.me()
await slyxup.auth.signOut()`}
          />
          <CodeBlock
            title="billing.ts"
            lang="ts"
            code={`const { plans } = await slyxup.billing.plans.list()
await slyxup.billing.checkout({ planId: plans[0].id })
// server-only: verify with your secret key`}
          />
        </>
      )}

      {section === 'uikit' && (
        <>
          <h2>UI kit — @slyxup/ui</h2>
          <p>
            Eleven drop-in components plus hooks. Styles self-inject; theme with
            CSS variables on <code className="inline">.slyxup-root</code> (
            <code className="inline">--slx-accent</code>,{' '}
            <code className="inline">--slx-radius</code>).
          </p>
          <ul>
            <li>
              <code className="inline">SignIn</code> — email/password + OAuth +
              2FA challenge in one card.
            </li>
            <li>
              <code className="inline">SignUp</code> — registration with
              verification states.
            </li>
            <li>
              <code className="inline">UserButton</code> — avatar + dropdown
              (profile, sign out).
            </li>
            <li>
              <code className="inline">UserProfile</code> — edit profile, 2FA
              setup, linked accounts.
            </li>
            <li>
              <code className="inline">ForgotPassword</code> /{' '}
              <code className="inline">ResetPassword</code> /{' '}
              <code className="inline">EmailVerification</code> — full reset +
              verify flows.
            </li>
            <li>
              <code className="inline">SocialButtons</code> — Google / GitHub
              OAuth.
            </li>
            <li>
              <code className="inline">BillingPortal</code> /{' '}
              <code className="inline">PricingTable</code> — subscription UI +
              plans grid.
            </li>
            <li>
              <code className="inline">AdminPanel</code> — users, sessions,
              keys, audit (secret key only).
            </li>
          </ul>
        </>
      )}

      {section === 'api' && (
        <>
          <h2>API reference</h2>
          <p>
            Base URLs: <code className="inline">{AUTH_URL}</code> (identity) and{' '}
            <code className="inline">{BILLING_URL}</code> (billing).
            Authenticate with{' '}
            <code className="inline">
              Authorization: Bearer &lt;session&gt;
            </code>{' '}
            or the HttpOnly session cookie.
          </p>
          <table>
            <thead>
              <tr>
                <th>Method + path</th>
                <th>What it does</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>POST /v1/auth/sign-in</td>
                <td>Email + password sign-in, returns session token.</td>
              </tr>
              <tr>
                <td>GET /v1/users</td>
                <td>Current user profile.</td>
              </tr>
              <tr>
                <td>PATCH /v1/users</td>
                <td>Update own profile.</td>
              </tr>
              <tr>
                <td>GET /v1/projects</td>
                <td>List my projects.</td>
              </tr>
              <tr>
                <td>POST /v1/projects</td>
                <td>Create project (name, slug, description).</td>
              </tr>
              <tr>
                <td>DELETE /v1/projects/:id</td>
                <td>Delete project + everything under it.</td>
              </tr>
              <tr>
                <td>GET /v1/projects/:id/users?q=&amp;limit=&amp;offset=</td>
                <td>Search + paginate project users.</td>
              </tr>
              <tr>
                <td>PATCH /v1/projects/:id/users/:userId</td>
                <td>Edit name, email, role, block state.</td>
              </tr>
              <tr>
                <td>POST …/users/:userId/block</td>
                <td>Block + revoke sessions immediately.</td>
              </tr>
              <tr>
                <td>POST …/users/:userId/unblock</td>
                <td>Unblock.</td>
              </tr>
              <tr>
                <td>DELETE …/users/:userId</td>
                <td>Delete user from project.</td>
              </tr>
              <tr>
                <td>GET /v1/keys?projectId=</td>
                <td>List API keys (hashes never exposed).</td>
              </tr>
              <tr>
                <td>POST /v1/keys</td>
                <td>Create key — full key returned once.</td>
              </tr>
              <tr>
                <td>DELETE /v1/keys/:id</td>
                <td>Revoke key.</td>
              </tr>
              <tr>
                <td>GET / PATCH /v1/projects/:id/domains</td>
                <td>List / add / remove allowed origins.</td>
              </tr>
              <tr>
                <td>POST /v1/projects/:id/go-live</td>
                <td>Switch project to live environment.</td>
              </tr>
              <tr>
                <td>GET /v1/oauth/google|github</td>
                <td>Start hosted OAuth flow.</td>
              </tr>
              <tr>
                <td>GET /v1/billing/plans?projectId= (billing host)</td>
                <td>List active billing plans.</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {section === 'cli' && (
        <>
          <h2>CLI</h2>
          <p>
            Same operations from the terminal via{' '}
            <code className="inline">@slyxup/cli</code>.
          </p>
          <CodeBlock
            title="cli"
            lang="bash"
            code={`slyxup login -e you@company.com -p '...' --api-url ${AUTH_URL}
slyxup project list --json
slyxup project create "Acme" --json
slyxup keys create --project-id <id> --type publishable --env live
slyxup keys list --project-id <id>
slyxup domains add app.example.com --project-id <id>`}
          />
        </>
      )}

      {section === 'security' && (
        <>
          <h2>Security model</h2>
          <ul>
            <li>
              <b>Sessions</b> live in HttpOnly, Secure, SameSite cookies —
              JavaScript never sees the token.
            </li>
            <li>
              <b>Passwords</b> use Argon2id; tokens use{' '}
              <code className="inline">crypto.randomUUID()</code> — never{' '}
              <code className="inline">Math.random()</code>.
            </li>
            <li>
              <b>API keys</b> are SHA-256 hashed server-side; the full key
              exists only in the create response — copy it once.
            </li>
            <li>
              <b>Publishable</b> keys (<code className="inline">pk_…</code>) are
              safe in browsers but origin-checked against your allowed domains.
            </li>
            <li>
              <b>Secret</b> keys (<code className="inline">sk_…</code>) are
              server-only. Leaked secret = revoke it in Keys and rotate.
            </li>
            <li>
              <b>Blocked users</b> have all sessions revoked immediately.
            </li>
          </ul>
        </>
      )}
    </div>
  );
}

export default function Docs() {
  const [section, setSection] = useState('quickstart');
  const [q, setQ] = useState('');
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return SECTIONS;
    return SECTIONS.filter(
      (s) => s.label.toLowerCase().includes(needle) || s.keys.includes(needle)
    );
  }, [q]);
  const active = visible.some((s) => s.id === section) ? section : visible[0]?.id || 'quickstart';

  return (
    <div className="min-w-0">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0b0b10] text-white p-6 sm:p-8 min-w-0">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(600px 260px at 15% 0%, rgba(109,40,217,0.4), transparent 65%), radial-gradient(500px 260px at 90% 100%, rgba(34,211,238,0.14), transparent 60%)',
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
          <div className="min-w-0">
            <h1 className="font-display flex items-center gap-2.5 text-[22px] sm:text-[26px] font-extrabold tracking-tight">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#6d28d9] shrink-0">
                <BookOpen className="size-[18px]" />
              </span>
              Documentation
            </h1>
            <p className="mt-1.5 max-w-[520px] text-[13px] leading-relaxed text-white/60">
              Integrate SlyxUp into your own platform. Public docs — no sign-in
              needed.{' '}
              <Link to="/admin" className="font-semibold text-white underline underline-offset-4">
                Open admin →
              </Link>
            </p>
          </div>
          <div className="sm:ml-auto w-full sm:w-[280px] shrink-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search docs…"
                className="h-10 w-full rounded-full border border-white/15 bg-white/[0.07] pl-10 pr-4 text-[13px] text-white placeholder:text-white/35 focus:border-[#8b5cf6] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section pills */}
      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 min-w-0">
        {visible.map((s) => (
          <button
            type="button"
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-[12.5px] font-semibold cursor-pointer whitespace-nowrap transition-colors ${active === s.id ? 'bg-[#101014] text-white' : 'bg-white border border-[#e4e6eb] text-[#63666f] hover:text-[#101014]'}`}
          >
            {s.label}
          </button>
        ))}
        {visible.length === 0 && (
          <span className="text-[12.5px] text-[#63666f] py-2">No sections match “{q}”.</span>
        )}
      </div>

      <div className="mt-3 flex gap-6 items-start min-w-0">
        {/* Side nav */}
        <aside className="hidden md:block w-[190px] shrink-0 sticky top-6">
          <Card>
            <div className="p-2 space-y-0.5">
              {visible.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] font-semibold cursor-pointer transition-colors ${active === s.id ? 'bg-[#101014] text-white' : 'text-[#63666f] hover:bg-[#eceef2] hover:text-[#101014]'}`}
                >
                  {s.label}
                  {active === s.id && <ArrowRight className="size-3.5" />}
                </button>
              ))}
            </div>
          </Card>
          <Link to="/ui" className="mt-3 block rounded-2xl bg-gradient-to-br from-[#6d28d9] to-[#4c1d95] p-4 text-white">
            <div className="text-[13px] font-bold">Prefer visuals?</div>
            <div className="text-[12px] text-white/70 mt-0.5">Every component, live in the UI kit →</div>
          </Link>
        </aside>

        <Card className="flex-1 min-w-0">
          <CardBody className="!px-5 sm:!px-7 !py-6">
            <SectionContent section={active} />
            <div className="mt-8 flex items-center justify-between border-t border-[#e4e6eb] pt-4">
              <span className="text-[12px] text-[#9a9da8]">Was this helpful?</span>
              <Link to="/admin">
                <Button size="sm" variant="secondary">
                  Try it in admin <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
