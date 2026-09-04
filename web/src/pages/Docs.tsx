import { ArrowRight, BookOpen, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CodeBlock } from '../components/CodeBlock';
import { Button, Card, CardBody } from '../components/ui';
import { AUTH_URL, BILLING_URL } from '../lib/api';

const SECTIONS = [
  {
    id: 'quickstart',
    label: 'Quickstart',
    keys: 'start install key domain project setup',
  },
  {
    id: 'react',
    label: 'React',
    keys: 'provider hooks signin signup userbutton',
  },
  { id: 'nextjs', label: 'Next.js', keys: 'middleware server component ssr' },
  {
    id: 'core',
    label: 'Core SDK',
    keys: 'headless client auth billing checkout',
  },
  {
    id: 'uikit',
    label: 'UI kit',
    keys: 'components theme pricing admin signin',
  },
  {
    id: 'api',
    label: 'API reference',
    keys: 'endpoints rest users keys projects domains oauth',
  },
  {
    id: 'sessions',
    label: 'Sessions & 2FA',
    keys: 'cookie session totp authenticator authorize login',
  },
  {
    id: 'webhooks',
    label: 'Webhooks',
    keys: 'events paddle user created billing notify endpoint',
  },
  {
    id: 'selfhost',
    label: 'Self-hosting',
    keys: 'deploy wrangler d1 secrets dev vars cloudflare',
  },
  {
    id: 'trouble',
    label: 'Troubleshooting',
    keys: 'error 401 403 cors faq debug fix',
  },
  { id: 'cli', label: 'CLI', keys: 'terminal commands shorten' },
  {
    id: 'security',
    label: 'Security',
    keys: 'sessions password argon keys block https',
  },
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
            Fifteen drop-in components plus hooks. Styles self-inject; theme
            with <code className="inline">applyTheme()</code> or CSS variables
            on <code className="inline">.slyxup-root</code> (
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
            <li>
              <code className="inline">PasswordField</code> — password input
              with reveal toggle.
            </li>
            <li>
              <code className="inline">PasswordStrength</code> (+{' '}
              <code className="inline">passwordScore()</code>) — strength meter.
            </li>
            <li>
              <code className="inline">OtpInput</code> — one-time-code boxes
              with paste support.
            </li>
            <li>
              <code className="inline">CopyField</code> — masked value + copy
              button for keys and secrets.
            </li>
            <li>
              <code className="inline">EmptyState</code> — placeholder for empty
              lists.
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
                <td>POST /v1/auth/sign-up</td>
                <td>Register (email, password, optional name/username).</td>
              </tr>
              <tr>
                <td>POST /v1/auth/sign-out</td>
                <td>End session + clear cookies.</td>
              </tr>
              <tr>
                <td>GET /v1/auth/session</td>
                <td>Inspect the current session.</td>
              </tr>
              <tr>
                <td>GET /v1/user</td>
                <td>Current user profile.</td>
              </tr>
              <tr>
                <td>PATCH /v1/user</td>
                <td>Update own profile.</td>
              </tr>
              <tr>
                <td>GET /v1/sessions · DELETE /v1/sessions/:id</td>
                <td>List / revoke my sessions.</td>
              </tr>
              <tr>
                <td>POST /v1/verification/password/forgot</td>
                <td>Request a password-reset email.</td>
              </tr>
              <tr>
                <td>POST /v1/verification/password/reset</td>
                <td>Reset with token + new password.</td>
              </tr>
              <tr>
                <td>POST /v1/verification/verify · /resend</td>
                <td>Verify email / resend the link.</td>
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

      {section === 'sessions' && (
        <>
          <h2>Sessions & 2FA</h2>
          <p>
            Sessions live in two cookies:{' '}
            <code className="inline">slyxup_session</code> plus the host-only{' '}
            <code className="inline">__Host-slyxup_session</code> (preferred —
            it cannot leak across subdomains). SDKs may also send the token as{' '}
            <code className="inline">Authorization: Bearer</code>, which wins
            over cookies.
          </p>
          <h3>Session endpoints</h3>
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
                <td>
                  Start a session. Step-up accounts get a challenge token
                  instead.
                </td>
              </tr>
              <tr>
                <td>POST /v1/auth/sign-in/2fa</td>
                <td>Complete sign-in with the 6-digit authenticator code.</td>
              </tr>
              <tr>
                <td>POST /v1/auth/sign-out</td>
                <td>End the current session + clear cookies.</td>
              </tr>
              <tr>
                <td>GET /v1/auth/session</td>
                <td>Inspect the current session (id, expiry, user).</td>
              </tr>
              <tr>
                <td>GET /v1/sessions</td>
                <td>List my active sessions across devices.</td>
              </tr>
              <tr>
                <td>DELETE /v1/sessions/:id</td>
                <td>Revoke one session (log out that device).</td>
              </tr>
            </tbody>
          </table>
          <h3>Two-factor (TOTP)</h3>
          <p>
            Users enable 2FA from{' '}
            <code className="inline">UserProfile → Security</code> or via API:{' '}
            <code className="inline">GET /v1/user/2fa/setup</code> returns a
            secret + provisioning URI,{' '}
            <code className="inline">POST /v1/user/2fa/enable</code> confirms it
            with a code and returns recovery codes.{' '}
            <code className="inline">/v1/user/2fa/verify</code> checks a code
            without changing state;{' '}
            <code className="inline">/v1/user/2fa/disable</code> turns it off.
          </p>
          <CodeBlock
            title="2fa.ts"
            lang="ts"
            code={`// after POST /v1/auth/sign-in returns { challengeToken }
await client.auth.completeSignIn({ challengeToken, code: "123456" })`}
          />
        </>
      )}

      {section === 'webhooks' && (
        <>
          <h2>Webhooks</h2>
          <p>
            Two webhook streams exist — don't mix them up. <b>Auth events</b>{' '}
            fire from the identity worker when users change;{' '}
            <b>Paddle events</b> land on the billing worker and update
            subscriptions.
          </p>
          <h3>Auth events</h3>
          <ul>
            <li>
              <code className="inline">user.created</code> — after sign-up +
              verification
            </li>
            <li>
              <code className="inline">user.updated</code> — profile, role or
              block-state change
            </li>
            <li>
              <code className="inline">user.deleted</code> — user removed from a
              project
            </li>
            <li>
              <code className="inline">user.signed_in</code> /{' '}
              <code className="inline">user.signed_out</code> — session
              lifecycle
            </li>
            <li>
              <code className="inline">session.revoked</code> — a session was
              revoked
            </li>
            <li>
              <code className="inline">password.changed</code> /{' '}
              <code className="inline">password.reset</code> — credential
              changes
            </li>
            <li>
              <code className="inline">email.verified</code> — address confirmed
            </li>
            <li>
              <code className="inline">oauth.linked</code> /{' '}
              <code className="inline">oauth.unlinked</code> — provider
              connections
            </li>
            <li>
              <code className="inline">2fa.enabled</code> /{' '}
              <code className="inline">2fa.disabled</code> — two-factor changes
            </li>
          </ul>
          <p>
            Configure a project webhook URL and each event POSTs a signed JSON
            payload. Always verify the signature with your{' '}
            <code className="inline">sk_…</code> secret, respond{' '}
            <code className="inline">200</code> fast, and do heavy work after
            responding.
          </p>
          <h3>Billing (Paddle) events</h3>
          <p>
            Paddle sends subscription lifecycle events to{' '}
            <code className="inline">billing.slyxup.online</code>, which is the
            sole owner of plans, subscriptions and invoices. The auth database
            is never written by billing — it only reads sessions through a
            read-only binding.
          </p>
        </>
      )}

      {section === 'selfhost' && (
        <>
          <h2>Self-hosting</h2>
          <p>
            Everything runs on Cloudflare: Workers for compute, D1 (SQLite) for
            data, KV for sessions/cache, R2 for blobs. You need a Cloudflare
            account and <code className="inline">wrangler</code>.
          </p>
          <h3>1. Backend (auth worker)</h3>
          <CodeBlock
            title="bash"
            lang="bash"
            code={`cd auth
cp .env.example .dev.vars
# put your D1/KV ids in wrangler.jsonc (wrangler d1 create slyxup_auth)
pnpm db:generate && pnpm db:migrate:local
wrangler secret put SESSION_SECRET
wrangler dev    # or: wrangler deploy`}
          />
          <h3>2. First admin</h3>
          <p>
            With an empty users table, claim the admin via{' '}
            <code className="inline">POST /v1/setup/bootstrap</code> (optionally
            gated by <code className="inline">BOOTSTRAP_SECRET</code> and
            restricted to <code className="inline">BOOTSTRAP_ADMIN_EMAIL</code>
            ). Check <code className="inline">GET /v1/setup/status</code> first.
          </p>
          <h3>3. This admin panel (web)</h3>
          <CodeBlock
            title="bash"
            lang="bash"
            code={`cd web
cp .env.example .env   # VITE_API_URL → your auth worker URL
pnpm install && pnpm build
wrangler pages deploy dist --project-name=my-panel --branch main`}
          />
          <h3>Secrets, never files</h3>
          <p>
            <code className="inline">SESSION_SECRET</code>,{' '}
            <code className="inline">BILLING_ADMIN_SECRET</code> and Paddle keys
            go through <code className="inline">wrangler secret put</code> only
            — never into <code className="inline">wrangler.jsonc</code>,{' '}
            <code className="inline">.env</code> or git. Local dev uses
            gitignored <code className="inline">.dev.vars</code>.
          </p>
        </>
      )}

      {section === 'trouble' && (
        <>
          <h2>Troubleshooting</h2>
          <h3>401 Unauthorized on every call</h3>
          <p>
            No session token sent. Sign in again — the SDK stores it as{' '}
            <code className="inline">slyxup_session_token</code> (or the
            HttpOnly cookie). Expired sessions return 401: refresh by signing
            in, then retry once.
          </p>
          <h3>403 Forbidden on a project route</h3>
          <p>
            Your developer account is not a member of that project. Ask the
            project owner to add you, or use a key created inside the project.
          </p>
          <h3>Browser calls rejected (CORS / origin)</h3>
          <p>
            The origin must be listed under Project → Domains, and browser calls
            must use a <code className="inline">pk_…</code> key —{' '}
            <code className="inline">sk_…</code> keys are rejected from browsers
            by design.
          </p>
          <h3>“Invalid or expired link” (verify / reset)</h3>
          <p>
            Tokens are single-use and expire. Request a fresh link (resend),
            open it in the same browser, and complete it within the window shown
            in the email.
          </p>
          <h3>Password change forced at login</h3>
          <p>
            First-login admins carry{' '}
            <code className="inline">mustChangePassword</code>. Complete{' '}
            <code className="inline">POST /v1/auth/password/force-change</code>{' '}
            once — the flag clears and normal sign-in resumes.
          </p>
          <h3>Still stuck?</h3>
          <p>
            Reproduce with <code className="inline">curl -v</code> and check the
            status + <code className="inline">error</code> field. Every API
            error returns{' '}
            <code className="inline">{`{ ok: false, error: "..." }`}</code> —
            paste it into an issue at{' '}
            <code className="inline">github.com/slyxup/stack</code>.
          </p>
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
  const active = visible.some((s) => s.id === section)
    ? section
    : visible[0]?.id || 'quickstart';

  return (
    <div className="min-w-0">
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
              <span className="flex size-9 items-center justify-center rounded-xl bg-black shrink-0">
                <BookOpen className="size-[18px]" />
              </span>
              Documentation
            </h1>
            <p className="mt-1.5 max-w-[520px] text-[13px] leading-relaxed text-white/60">
              Integrate SlyxUp into your own platform. Public docs — no sign-in
              needed.{' '}
              <Link
                to="/admin"
                className="font-semibold text-white underline underline-offset-4"
              >
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
                className="h-10 w-full rounded-full border border-white/15 bg-white/[0.07] pl-10 pr-4 text-[13px] text-white placeholder:text-white/35 focus:border-black focus:outline-none"
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
            className={`shrink-0 rounded-full px-4 py-2 text-[12.5px] font-semibold cursor-pointer whitespace-nowrap transition-colors ${active === s.id ? 'bg-black text-white' : 'bg-white border border-[#e4e6eb] text-[#63666f] hover:text-black'}`}
          >
            {s.label}
          </button>
        ))}
        {visible.length === 0 && (
          <span className="text-[12.5px] text-[#63666f] py-2">
            No sections match “{q}”.
          </span>
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
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] font-semibold cursor-pointer transition-colors ${active === s.id ? 'bg-black text-white' : 'text-[#63666f] hover:bg-[#eceef2] hover:text-black'}`}
                >
                  {s.label}
                  {active === s.id && <ArrowRight className="size-3.5" />}
                </button>
              ))}
            </div>
          </Card>
          <Link
            to="/ui"
            className="mt-3 block rounded-2xl bg-gradient-to-br from-[#3f3f46] to-black p-4 text-white"
          >
            <div className="text-[13px] font-bold">Prefer visuals?</div>
            <div className="text-[12px] text-white/70 mt-0.5">
              Every component, live in the UI kit →
            </div>
          </Link>
        </aside>

        <Card className="flex-1 min-w-0">
          <CardBody className="px-5! sm:px-7! py-6!">
            <SectionContent section={active} />
            <div className="mt-8 flex items-center justify-between border-t border-[#e4e6eb] pt-4">
              <span className="text-[12px] text-[#9a9da8]">
                Was this helpful?
              </span>
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
