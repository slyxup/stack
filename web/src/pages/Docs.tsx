import { ArrowRight, BookOpen, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CodeBlock } from '../components/CodeBlock';
import { IntegrationGuide } from '../components/IntegrationGuide';
import { Button, Card, CardBody } from '../components/ui';
import { AUTH_URL, BILLING_URL } from '../lib/api';

const SECTIONS = [
  {
    id: 'integration-guide',
    label: 'Complete integration guide',
    group: 'Start here',
    keys: 'ai implementation migration sdk server spa cookie billing setup',
  },
  {
    id: 'quickstart',
    label: 'Quickstart',
    group: 'Start here',
    keys: 'start install key domain project setup',
  },
  {
    id: 'concepts',
    label: 'Core concepts',
    group: 'Start here',
    keys: 'project user session key domain environment test live mental model',
  },
  {
    id: 'react',
    label: 'React',
    group: 'Integrate',
    keys: 'provider hooks signin signup userbutton',
  },
  {
    id: 'nextjs',
    label: 'Next.js',
    group: 'Integrate',
    keys: 'middleware server component ssr',
  },
  {
    id: 'core',
    label: 'Core SDK',
    group: 'Integrate',
    keys: 'headless client auth billing checkout',
  },
  {
    id: 'uikit',
    label: 'UI kit',
    group: 'Integrate',
    keys: 'components theme pricing admin signin',
  },
  {
    id: 'management',
    label: 'Management',
    group: 'Integrate',
    keys: 'projects keys domains api',
  },
  {
    id: 'auth',
    label: 'Authentication',
    group: 'Identity',
    keys: 'signup signin signout password username email login register',
  },
  {
    id: 'oauth',
    label: 'OAuth',
    group: 'Identity',
    keys: 'google github social redirect state callback link unlink',
  },
  {
    id: 'passwords',
    label: 'Passwords & verification',
    group: 'Identity',
    keys: 'forgot reset verify resend email token ttl',
  },
  {
    id: 'sessions',
    label: 'Sessions',
    group: 'Identity',
    keys: 'cookie session bearer expiry revoke device authorize login',
  },
  {
    id: 'tfa',
    label: 'Two-factor auth',
    group: 'Identity',
    keys: 'totp authenticator challenge recovery',
  },
  {
    id: 'users',
    label: 'Users & members',
    group: 'Identity',
    keys: 'role admin member block delete paginate',
  },
  {
    id: 'keys',
    label: 'API keys',
    group: 'Identity',
    keys: 'publishable secret pk sk prefix hash rotate environment',
  },
  {
    id: 'domains',
    label: 'Domains & CORS',
    group: 'Identity',
    keys: 'origin allowlist cors browser localhost https',
  },
  {
    id: 'billing',
    label: 'Billing & subscriptions',
    group: 'Money',
    keys: 'plans checkout paddle subscription invoice cancel resume trial',
  },
  {
    id: 'webhooks',
    label: 'Webhooks',
    group: 'Money',
    keys: 'events paddle user created billing notify endpoint signature',
  },
  {
    id: 'selfhost',
    label: 'Self-hosting',
    group: 'Run it',
    keys: 'deploy wrangler d1 secrets dev vars cloudflare',
  },
  {
    id: 'security',
    label: 'Security',
    group: 'Run it',
    keys: 'sessions password pbkdf2 keys block https hash',
  },
  {
    id: 'api',
    label: 'API reference',
    group: 'Run it',
    keys: 'endpoints rest users keys projects domains oauth',
  },
  {
    id: 'trouble',
    label: 'Troubleshooting',
    group: 'Run it',
    keys: 'error 401 403 cors faq debug fix',
  },
];

const GROUP_ORDER = ['Start here', 'Integrate', 'Identity', 'Money', 'Run it'];

function SectionContent({ section }: { section: string }) {
  return (
    <div className="docs-prose max-w-none">
      {section === 'integration-guide' && (
        <>
          <h2>Auth and billing integration guide</h2>
          <p>
            Source-accurate recipes, session transport choices, upgrade
            instructions, and known limitations. This guide describes this
            checkout; confirm the installed npm versions before upgrading.
          </p>
          <IntegrationGuide />
        </>
      )}
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

      {section === 'concepts' && (
        <>
          <h2>Core concepts</h2>
          <p>
            Six nouns explain the whole platform. Learn them once and every
            page, endpoint and SDK falls into place.
          </p>
          <h3>Project</h3>
          <p>
            The isolation boundary. A project owns its <b>users</b>,{' '}
            <b>API keys</b>, <b>domains</b> and <b>billing plans</b> — nothing
            leaks across projects. Create one per product or per environment
            (e.g. <code className="inline">acme-web</code>,{' '}
            <code className="inline">acme-staging</code>). Slugs are lowercase
            letters, numbers and hyphens, and must be unique.
          </p>
          <h3>User</h3>
          <p>
            An end-user of <b>your</b> product (not of SlyxUp itself). Users
            belong to exactly one project and carry{' '}
            <code className="inline">email</code>, optional{' '}
            <code className="inline">firstName / lastName / username</code>, a{' '}
            <code className="inline">role</code> (
            <code className="inline">user</code> or{' '}
            <code className="inline">admin</code>), a verified flag and a
            blocked flag. You are a <b>developer</b> — the human operating
            projects through this panel, the CLI or a secret key.
          </p>
          <h3>Session</h3>
          <p>
            A 32-byte random token + 7-day expiry, delivered as an HttpOnly
            cookie (and optionally a Bearer token). Sessions are what “logged
            in” means — revoke one and that device is out immediately. Full
            detail in <b>Sessions</b>.
          </p>
          <h3>API key</h3>
          <p>
            A long-lived credential for a project:{' '}
            <code className="inline">pk_…</code> (publishable, browsers) or{' '}
            <code className="inline">sk_…</code> (secret, servers only), each in{' '}
            <code className="inline">test</code> or{' '}
            <code className="inline">live</code> flavor — e.g.{' '}
            <code className="inline">pk_live_…</code>. Only a SHA-256 hash is
            stored; the full key exists solely in the create response. Full
            detail in <b>API keys</b>.
          </p>
          <h3>Domain</h3>
          <p>
            A browser origin allowed to call the API with this project's
            publishable key. Browser traffic from anywhere else is rejected
            before it touches your data. Full detail in <b>Domains & CORS</b>.
          </p>
          <h3>Environment: test vs live</h3>
          <p>
            Projects start in <code className="inline">test</code>. CORS domain
            checks, billing enforcement and rate limits treat{' '}
            <code className="inline">live</code> strictly;{' '}
            <code className="inline">test</code> is lenient for local
            development (localhost is always allowed). Flip with Project →
            Settings → <b>Go live</b> when you ship.
          </p>
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

<SlyxUpProvider publishableKey="pk_live_..." apiUrl="${AUTH_URL}" billingApiUrl="${BILLING_URL}" tokenStorage="sessionStorage">
  <SignIn social={false} onSuccess={() => router.push("/dashboard")} />
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
            Server-side auth via{' '}
            <code className="inline">@slyxup/core/next</code>: read the session
            in Server Components and route handlers, protect pages in
            middleware.
          </p>
          <CodeBlock
            title="middleware.ts"
            lang="ts"
            code={`import { slyxupMiddleware } from "@slyxup/core/next"

export default slyxupMiddleware({
  publicRoutes: ["/", "/sign-in"],
})

export const config = { matcher: ["/((?!_next|.*\\\\..*).*)"] }`}
          />
          <CodeBlock
            title="app/api/account/route.ts"
            lang="ts"
            code={`import { getServerSession } from "@slyxup/core/next"

export async function GET(request: Request) {
  const session = await getServerSession(request, {
    apiUrl: process.env.SLYXUP_AUTH_URL,
    publishableKey: process.env.SLYXUP_PUBLISHABLE_KEY,
  })
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  return Response.json({ user: session.user })
}`}
          />
          <p>
            These helpers require a same-origin sign-in endpoint that sets your
            application's HttpOnly cookie. Direct cross-origin SPA sign-in does
            not set that cookie. See Complete integration guide for the required
            server flow; static-export Next.js apps cannot use middleware.
          </p>
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
            code={`import { SlyxupClient } from "@slyxup/core"

const slyxup = new SlyxupClient({
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
            code={`import { createBillingClient } from "@slyxup/core"
const billing = createBillingClient({
  apiUrl: "${BILLING_URL}",
  publishableKey: slyxup.publishableKey,
  getToken: () => slyxup.getToken(),
})
const plans = await billing.listPlans(projectId)
if (plans[0]) await billing.checkout(plans[0].id)
// Server-side feature authorization uses the current user's session:
const access = await billing.getEntitlements(projectId)
const canExport = access.features.includes("export")`}
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

      {section === 'auth' && (
        <>
          <h2>Authentication</h2>
          <p>
            Email + password is the primary method; OAuth and 2FA layer on top.
            Every flow ends in a <b>session</b> (7-day cookie/Bearer token) —
            see <b>Sessions</b> for the transport.
          </p>
          <h3>Sign up</h3>
          <p>
            <code className="inline">POST /v1/auth/sign-up</code> takes{' '}
            <code className="inline">email</code>,{' '}
            <code className="inline">password</code> (8–128 chars), optional{' '}
            <code className="inline">firstName</code> and optional{' '}
            <code className="inline">username</code> (3–30 chars, letters,
            numbers, underscores, lowercased). It immediately returns a session
            <b>and</b> sends a verification email (best-effort, never blocks the
            response — verification tokens live 24h).
          </p>
          <CodeBlock
            title="signup.ts"
            lang="ts"
            code={`const res = await client.auth.signUp({
  email: "ada@example.com",
  password: "correct-horse-9",
  firstName: "Ada",
  username: "ada",
});
// → { userId, sessionToken, expiresAt } + verification email sent`}
          />
          <h3>Sign in</h3>
          <p>
            <code className="inline">POST /v1/auth/sign-in</code> accepts{' '}
            <code className="inline">{'{ email, password }'}</code> <b>or</b>{' '}
            <code className="inline">{'{ username, password }'}</code>. Two
            outcomes: a normal account gets{' '}
            <code className="inline">{'{ sessionToken }'}</code>; a 2FA account
            gets <code className="inline">{'{ challengeToken }'}</code> and must
            finish via <code className="inline">POST /v1/auth/sign-in/2fa</code>
            .
          </p>
          <h3>Sign out</h3>
          <p>
            <code className="inline">POST /v1/auth/sign-out</code> ends the
            session and clears cookies. To log out <b>every</b> device, delete
            each session (
            <code className="inline">DELETE /v1/sessions/:id</code>) or block +
            unblock the user.
          </p>
          <h3>First-login password rotation</h3>
          <p>
            Admins created with the default password carry{' '}
            <code className="inline">mustChangePassword</code>. They cannot use
            the API until they complete{' '}
            <code className="inline">POST /v1/auth/password/force-change</code>{' '}
            (works without a session — that is the point). The flag then clears
            permanently.
          </p>
        </>
      )}

      {section === 'oauth' && (
        <>
          <h2>OAuth (Google + GitHub)</h2>
          <p>
            Exactly two providers, fully hosted: your app never sees provider
            secrets. The flow is standard authorization-code with a server-side
            state guard.
          </p>
          <h3>The flow, step by step</h3>
          <ul>
            <li>
              <b>1. Start</b> — send the browser to{' '}
              <code className="inline">
                GET /v1/oauth/:provider?redirect_url=…
              </code>{' '}
              (provider is <code className="inline">google</code> or{' '}
              <code className="inline">github</code>). The server stores a state
              token for <b>10 minutes</b> and redirects to the provider.
            </li>
            <li>
              <b>2. Callback</b> — the provider returns to{' '}
              <code className="inline">/v1/oauth/callback/:provider</code>,
              which validates state (single-use), exchanges the code, and{' '}
              <b>upserts</b> the user by verified email: new users are created,
              existing users get the provider <b>linked</b>.
            </li>
            <li>
              <b>3. Land</b> — a session is created and the browser returns to
              your <code className="inline">redirect_url</code>. Failures land
              on <code className="inline">/sign-in?error=…</code> (
              <code className="inline">missing_code</code>,{' '}
              <code className="inline">invalid_state</code>,{' '}
              <code className="inline">state_mismatch</code>).
            </li>
          </ul>
          <CodeBlock
            title="oauth.ts"
            lang="ts"
            code={`import { SocialButtons } from "@slyxup/ui";

// one line — redirect handled for you
<SocialButtons providers={["google", "github"]} />

// manual:
// window.location.href =
//   AUTH_URL + "/v1/oauth/google?redirect_url=" + encodeURIComponent(location.href)`}
          />
          <h3>Link / unlink</h3>
          <p>
            Connected providers live under{' '}
            <code className="inline">GET /v1/user/accounts</code>. Unlink with{' '}
            <code className="inline">
              DELETE /v1/user/accounts/:id?provider=…
            </code>{' '}
            — allowed only while the user keeps <b>at least one</b> sign-in
            method (password or another provider), so accounts can never lock
            themselves out.
          </p>
        </>
      )}

      {section === 'passwords' && (
        <>
          <h2>Passwords & verification</h2>
          <p>
            Passwords require <b>8–128 characters</b> and are stored as
            PBKDF2-HMAC-SHA-256 (100,000 iterations, per-user salt). All three
            email flows are <b>best-effort and non-enumerating</b>: requesting a
            link for an unknown address still returns success, so attackers
            cannot harvest your user list.
          </p>
          <h3>Email verification</h3>
          <ul>
            <li>
              Sign-up sends a link with a token valid <b>24 hours</b>.
            </li>
            <li>
              <code className="inline">
                GET /v1/verification/confirm?token=…
              </code>{' '}
              confirms from the email link.
            </li>
            <li>
              <code className="inline">POST /v1/verification/verify</code>{' '}
              confirms from your UI;{' '}
              <code className="inline">POST /v1/verification/resend</code> sends
              a fresh link.
            </li>
          </ul>
          <h3>Password reset</h3>
          <ul>
            <li>
              <code className="inline">
                POST /v1/verification/password/forgot
              </code>{' '}
              with <code className="inline">{'{ email }'}</code> — always
              succeeds.
            </li>
            <li>
              The emailed link carries a token valid <b>1 hour</b>, single-use.
            </li>
            <li>
              <code className="inline">
                POST /v1/verification/password/reset
              </code>{' '}
              with <code className="inline">{'{ token, password }'}</code> sets
              the new password (same 8–128 rule).
            </li>
          </ul>
          <h3>Change while signed in</h3>
          <p>
            <code className="inline">POST /v1/user/password</code> (current +
            new password) for normal rotation. First-login admins use{' '}
            <code className="inline">POST /v1/auth/password/force-change</code>{' '}
            instead — see <b>Authentication</b>.
          </p>
        </>
      )}

      {section === 'users' && (
        <>
          <h2>Users & members</h2>
          <p>
            Users belong to one project. Developers (you, operating via this
            panel, the CLI or a secret key) manage them per project — never
            globally.
          </p>
          <h3>List & search</h3>
          <p>
            <code className="inline">GET /v1/projects/:id/users</code> supports{' '}
            <code className="inline">q</code> (email substring match),{' '}
            <code className="inline">limit</code> (default 50, max 200) and{' '}
            <code className="inline">offset</code>, newest first, with a{' '}
            <code className="inline">total</code> for pagination.{' '}
            <code className="inline">GET /v1/projects/:id/users/:userId</code>{' '}
            adds profile, live session count and linked OAuth providers.
          </p>
          <h3>Roles</h3>
          <ul>
            <li>
              <b>owner</b> — created the project. Only owners can delete it.
            </li>
            <li>
              <b>admin</b> — manages users, keys and domains.
            </li>
            <li>
              <b>member</b> / <b>user</b> — the default; a regular end-user.
            </li>
          </ul>
          <p>
            Change role, name or email with{' '}
            <code className="inline">PATCH /v1/projects/:id/users/:userId</code>
            .
          </p>
          <h3>Block, unblock, delete</h3>
          <ul>
            <li>
              <b>Block</b> (<code className="inline">POST …/block</code>,
              optional <code className="inline">{'{ reason }'}</code>) flips the
              flag <b>and deletes every session</b> — the user is out on all
              devices instantly.
            </li>
            <li>
              <b>Unblock</b> (<code className="inline">POST …/unblock</code>)
              restores access; the user signs in again.
            </li>
            <li>
              <b>Delete</b> (<code className="inline">DELETE …/:userId</code>)
              removes profile, sessions and the user row — permanent.
            </li>
          </ul>
        </>
      )}

      {section === 'keys' && (
        <>
          <h2>API keys</h2>
          <p>
            Keys identify <b>which project</b> a call belongs to and{' '}
            <b>how much trust</b> it carries. The name encodes both:{' '}
            <code className="inline">pk_live_…</code> (publishable, live),{' '}
            <code className="inline">sk_test_…</code> (secret, test).
          </p>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Where it goes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>publishable (pk_)</td>
                <td>
                  Browsers and public clients. Origin-checked against your
                  domains.
                </td>
              </tr>
              <tr>
                <td>secret (sk_)</td>
                <td>Your server only. Never ships to browsers — ever.</td>
              </tr>
              <tr>
                <td>test</td>
                <td>Local development; lenient CORS and billing.</td>
              </tr>
              <tr>
                <td>live</td>
                <td>Production; strict checks everywhere.</td>
              </tr>
            </tbody>
          </table>
          <h3>Lifecycle rules</h3>
          <ul>
            <li>
              <b>Created once, shown once</b> —{' '}
              <code className="inline">POST /v1/keys</code> returns the full
              key; only a SHA-256 hash is stored. Lose it? Revoke and create
              another.
            </li>
            <li>
              <b>Listing never leaks</b> —{' '}
              <code className="inline">GET /v1/keys?projectId=…</code> returns
              id, name, prefix, type and environment. No hashes, ever.
            </li>
            <li>
              <b>Revocation is instant</b> —{' '}
              <code className="inline">DELETE /v1/keys/:id</code> deletes the
              row; in-flight requests with it fail immediately.
            </li>
            <li>
              <b>Rotate like this</b> — create the replacement → deploy it →
              revoke the old one. Never the reverse order.
            </li>
          </ul>
        </>
      )}

      {section === 'domains' && (
        <>
          <h2>Domains & CORS</h2>
          <p>
            Browser calls authenticate with a publishable key — but a key alone
            is not enough. The request <b>origin</b> must also be allowlisted
            for the project, otherwise the API answers without CORS headers and
            the browser blocks the response.
          </p>
          <h3>Matching rules (exact, but forgiving where safe)</h3>
          <ul>
            <li>
              Hostnames compare <b>exactly</b> after lowercasing, with a leading{' '}
              <code className="inline">www.</code> ignored on both sides —{' '}
              <code className="inline">www.app.com</code> matches{' '}
              <code className="inline">app.com</code>.
            </li>
            <li>
              Only <code className="inline">https://</code> origins qualify for
              custom domains. <code className="inline">localhost</code> (any
              port) is <b>always allowed</b> so local dev just works.
            </li>
            <li>
              Only domains on <code className="inline">live</code> projects
              participate; lookups are KV-cached for <b>60 seconds</b>, so a
              freshly added domain can take up to a minute to take effect.
            </li>
            <li>
              Preflights (<code className="inline">OPTIONS</code>) answer{' '}
              <code className="inline">204</code> with credentials enabled.
            </li>
          </ul>
          <h3>Manage</h3>
          <p>
            Project → Domains here, or{' '}
            <code className="inline">PATCH /v1/projects/:id/domains</code> with{' '}
            <code className="inline">
              {'{ action: "add" | "remove", domain }'}
            </code>
            . Enter bare hosts (<code className="inline">app.example.com</code>
            ), never URLs — scheme and path are stripped.
          </p>
        </>
      )}

      {section === 'billing' && (
        <>
          <h2>Billing & subscriptions</h2>
          <p>
            Money lives in the <b>billing worker</b> (Paddle-backed), completely
            separate from identity. It never writes to the auth database — it
            validates your session read-only and owns plans, subscriptions and
            invoices itself.
          </p>
          <h3>Plans</h3>
          <p>
            A plan is <code className="inline">name</code>,{' '}
            <code className="inline">amount</code> (cents),{' '}
            <code className="inline">currency</code>,{' '}
            <code className="inline">interval</code> (
            <code className="inline">month</code>/
            <code className="inline">year</code>), optional{' '}
            <code className="inline">trialDays</code>,{' '}
            <code className="inline">features[]</code> and a{' '}
            <code className="inline">popular</code> flag, ordered by{' '}
            <code className="inline">sortOrder</code>. The public endpoint lists{' '}
            <b>active plans only</b>; creating, editing or deactivating needs
            the <code className="inline">BILLING_ADMIN_SECRET</code>.
          </p>
          <h3>Subscribe (hosted checkout)</h3>
          <ul>
            <li>
              <code className="inline">POST /v1/billing/checkout</code> with{' '}
              <code className="inline">{'{ planId, successUrl }'}</code> returns{' '}
              <code className="inline">{'{ checkoutUrl }'}</code> — open it,
              Paddle takes it from there.
            </li>
            <li>
              Already on an <code className="inline">active</code> or{' '}
              <code className="inline">trialing</code> plan? Checkout refuses —
              cancel first.
            </li>
            <li>
              The subscription row itself is created by the{' '}
              <code className="inline">subscription.created</code> webhook. The
              webhook is the source of truth, not the checkout call.
            </li>
          </ul>
          <h3>Manage a subscription</h3>
          <ul>
            <li>
              <code className="inline">
                GET /v1/billing/subscription?projectId=…
              </code>{' '}
              — status, current period, cancel flag.
            </li>
            <li>
              <code className="inline">
                POST …/subscription/cancel?projectId=…
              </code>{' '}
              — cancels <b>at period end</b>; access continues until then.
            </li>
            <li>
              <code className="inline">
                POST …/subscription/resume?projectId=…
              </code>{' '}
              — undoes a scheduled cancellation.
            </li>
            <li>
              <code className="inline">
                GET /v1/billing/invoices?projectId=…
              </code>{' '}
              — newest first, limit 50 (max 100).
            </li>
          </ul>
          <p>
            Without a configured Paddle key these endpoints answer{' '}
            <code className="inline">501 Billing not configured</code> — plans
            still list, checkout does not run. That is normal on a fresh
            self-host.
          </p>
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

      {section === 'management' && (
        <>
          <h2>Project Management</h2>
          <p>
            Manage projects, API keys, and domains via the web dashboard at{' '}
            <code className="inline">stack.slyxup.online</code> or using the
            management API directly.
          </p>
          <CodeBlock
            title="API"
            lang="bash"
            code={`curl -H "Authorization: Bearer <session_token>" ${AUTH_URL}/v1/projects
curl -H "Authorization: Bearer <session_token>" ${AUTH_URL}/v1/keys?projectId=<id>`}
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
              <b>Passwords</b> use PBKDF2-HMAC-SHA-256 (100,000 iterations,
              per-user salt); tokens use{' '}
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
          <h2>Sessions</h2>
          <p>
            Every sign-in mints a 32-byte random token stored server-side with a{' '}
            <b>7-day expiry</b>. The token travels in two cookies:{' '}
            <code className="inline">slyxup_session</code> plus the host-only{' '}
            <code className="inline">__Host-slyxup_session</code> (preferred — a
            host-only cookie cannot leak across subdomains, so logging into two
            SlyxUp apps in one browser never overwrites anything). SDKs and the
            CLI may also send the token as{' '}
            <code className="inline">Authorization: Bearer</code>, which always
            wins over cookies. All three are{' '}
            <code className="inline">HttpOnly, Secure, SameSite=Lax</code>.
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
                  Start a session. Step-up (2FA) accounts get a challenge token
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
          <h3>Rules that always hold</h3>
          <ul>
            <li>
              <b>Blocked users lose everything instantly</b> — blocking deletes
              all of their sessions, so the next request fails.
            </li>
            <li>
              <b>Sessions are single-token</b> — there is no separate refresh
              token. When a session expires (or is revoked), sign in again.
            </li>
            <li>
              <b>Cookies are scoped per host</b> — auth, billing and your apps
              each keep their own cookie; Bearer tokens isolate platforms
              further.
            </li>
          </ul>
        </>
      )}

      {section === 'tfa' && (
        <>
          <h2>Two-factor auth (TOTP)</h2>
          <p>
            Any user can attach an authenticator app (Google Authenticator,
            1Password, …). Afterwards every password sign-in returns a{' '}
            <code className="inline">challengeToken</code> instead of a session
            — the client must complete the second step within minutes.
          </p>
          <h3>Enable flow (do it in this order)</h3>
          <ul>
            <li>
              <b>1. Setup</b> —{' '}
              <code className="inline">GET /v1/user/2fa/setup</code> returns a
              fresh secret + provisioning URI. Nothing is persisted yet — render
              it as a QR code.
            </li>
            <li>
              <b>2. Confirm</b> —{' '}
              <code className="inline">POST /v1/user/2fa/enable</code> with{' '}
              <code className="inline">{'{ secret, code }'}</code>. The code
              must match the authenticator app. Returns <b>recovery codes</b> —
              show them once and tell the user to store them.
            </li>
            <li>
              <b>3. Sign in with 2FA</b> — password sign-in returns{' '}
              <code className="inline">{'{ challengeToken }'}</code>; finish
              with <code className="inline">POST /v1/auth/sign-in/2fa</code>{' '}
              carrying{' '}
              <code className="inline">{'{ challengeToken, code }'}</code>.
            </li>
          </ul>
          <CodeBlock
            title="2fa.ts"
            lang="ts"
            code={`// 1. password step returns a challenge instead of a session
const res = await client.auth.signIn({ email, password });
if ("challengeToken" in res) {
  // 2. complete with the 6-digit code
  await client.auth.completeSignIn({ challengeToken: res.challengeToken, code: "123456" });
}`}
          />
          <h3>Manage</h3>
          <ul>
            <li>
              <code className="inline">GET /v1/user/2fa/status</code> — is 2FA
              on?
            </li>
            <li>
              <code className="inline">POST /v1/user/2fa/verify</code> — check a
              code <b>without</b> changing state (pre-checks, CLI flows).
            </li>
            <li>
              <code className="inline">POST /v1/user/2fa/disable</code> —
              requires a valid current code; emits{' '}
              <code className="inline">2fa.disabled</code>.
            </li>
          </ul>
          <p>
            The UI kit's <code className="inline">SignIn</code> handles the
            challenge screen automatically, and{' '}
            <code className="inline">UserProfile → Security</code> walks users
            through setup, recovery codes and disable.
          </p>
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
            Check the session transport. Tokens are in memory by default; opt
            into project-scoped sessionStorage for a client-only SPA or
            implement a same-origin HttpOnly cookie flow. Standalone billing
            clients need getToken. Legacy global localStorage tokens are not
            imported. Expired sessions require sign-in again.
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
  const [section, setSection] = useState('integration-guide');
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
        {/* Side nav with groups */}
        <aside className="hidden md:block w-[200px] shrink-0 sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto">
          <Card>
            <div className="p-2">
              {GROUP_ORDER.map((g) => {
                const items = visible.filter((s) => s.group === g);
                if (items.length === 0) return null;
                return (
                  <div key={g} className="mb-1 last:mb-0">
                    <div className="px-3 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#a1a1aa] first:pt-1">
                      {g}
                    </div>
                    {items.map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => setSection(s.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-[7px] text-left text-[13px] font-medium cursor-pointer transition-colors ${active === s.id ? 'bg-black text-white font-semibold' : 'text-[#63666f] hover:bg-black/[0.04] hover:text-black'}`}
                      >
                        {s.label}
                        {active === s.id && (
                          <ArrowRight className="size-3.5 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </Card>
          <Link
            to="/ui"
            className="mt-3 block rounded-2xl bg-black p-4 text-white"
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
