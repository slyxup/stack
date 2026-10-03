import { CodeBlock } from '../components/CodeBlock';
import { IntegrationGuide } from '../components/IntegrationGuide';
import { Callout, CodeTabs, Endpoint, Steps } from '../components/docs';
import { AUTH_URL, BILLING_URL } from '../lib/api';

/** Per-page body content — Paddle-style: narrative + endpoints + code + rules. */
export function DocBody({ slug }: { slug: string }) {
  return (
    <div className="docs-prose max-w-none space-y-4">
      {slug === 'introduction' && (
        <>
          <h2 id="what">What SlyxUp Stack is</h2>
          <p>
            Open-source auth and billing on Cloudflare — MIT licensed,
            self-hostable in about a minute. Three deployables, two SDKs, one
            admin panel:
          </p>
          <ul>
            <li>
              <b>Auth Worker</b> (Hono + D1 + KV) — the{' '}
              <code className="inline">/v1/*</code> identity API: users,
              sessions, keys, domains, OAuth, 2FA.
            </li>
            <li>
              <b>Billing Worker</b> (Hono + separate D1 + Paddle) — plans,
              checkout, subscriptions, invoices. Owns its tables; validates auth
              sessions read-only.
            </li>
            <li>
              <b>Web</b> (this site, Vite + React 19) — admin panel at{' '}
              <code className="inline">/admin</code>, public docs at{' '}
              <code className="inline">/docs</code>, live kit at{' '}
              <code className="inline">/ui</code>.
            </li>
            <li>
              <b>SDKs</b> — <code className="inline">@slyxup/core</code>{' '}
              (headless client) + <code className="inline">@slyxup/ui</code> (15
              components).
            </li>
          </ul>
          <Callout tone="info" title="The one rule to remember">
            Billing never writes to the auth database. It reads your session,
            owns money itself. That separation is what makes self-hosting and
            audits boring — in a good way.
          </Callout>
          <h2 id="vs">SlyxUp vs Clerk / Auth0 / Paddle</h2>
          <p>
            Same drop-in components and hooks you expect — but you own the data
            (your D1/SQLite, dumpable anytime), billing is Paddle-native instead
            of seat-priced, and the admin panel on this site ships in the repo
            instead of as a dashboard upsell.
          </p>
          <h2 id="tour">Take the 60-second tour</h2>
          <Steps
            items={[
              {
                title: 'Create a project',
                desc: 'Sign in, create a project — it gets isolated users, keys, domains and billing.',
              },
              {
                title: 'Drop in the UI',
                desc: 'SlyxUpProvider + <SignIn layout="split" />. Theme with one applyTheme() call.',
              },
              {
                title: 'Moderate & monetize',
                desc: 'Users appear live. Block abuse, rotate keys, sell plans through Paddle checkout.',
              },
            ]}
          />
        </>
      )}

      {slug === 'quickstart' && (
        <>
          <h2 id="steps">Five steps to authenticated users</h2>
          <Steps
            items={[
              {
                title: 'Create a project',
                desc: 'Sign in to the admin panel and create a project. Slugs are lowercase letters, numbers and hyphens.',
              },
              {
                title: 'Create a publishable key',
                desc: 'Project → Keys → publishable (pk_…) for the browser. The project test/live mode controls its behavior. Copy it once — only a hash is stored.',
              },
              {
                title: 'Allowlist your origin',
                desc: 'Project → Domains → add your frontend host (bare host, e.g. app.example.com). Localhost always works.',
              },
              {
                title: 'Install the SDKs',
                desc: 'pnpm add @slyxup/core @slyxup/ui, wrap your app in SlyxUpProvider pointed at your key.',
              },
              {
                title: 'Ship sign-up',
                desc: 'Render <SignIn />. New users appear under Project → Users for edit / block / delete.',
              },
            ]}
          />
          <CodeBlock
            title="install"
            lang="bash"
            code="pnpm add @slyxup/core @slyxup/ui"
          />
          <CodeTabs
            tabs={[
              {
                label: 'React',
                lang: 'tsx',
                title: 'app.tsx',
                code: `import { SlyxUpProvider, SignIn } from "@slyxup/ui"\n\n<SlyxUpProvider publishableKey="pk_..." apiUrl="${AUTH_URL}" billingApiUrl="${BILLING_URL}">\n  <SignIn layout="split" />\n</SlyxUpProvider>`,
              },
              {
                label: 'cURL',
                lang: 'bash',
                title: 'signup.sh',
                code: `curl -X POST ${AUTH_URL}/v1/auth/sign-up \\\n  -H "Content-Type: application/json" \\\n  -d '{"email":"ada@example.com","password":"correct-horse-9"}'`,
              },
            ]}
          />
        </>
      )}

      {slug === 'core-concepts' && (
        <>
          <h2 id="nouns">Six nouns explain everything</h2>
          <h3 id="project">Project</h3>
          <p>
            The isolation boundary. Owns its <b>users</b>, <b>API keys</b>,{' '}
            <b>domains</b> and <b>billing plans</b> — nothing leaks across
            projects. One per product or per environment (
            <code className="inline">acme-web</code>,{' '}
            <code className="inline">acme-staging</code>).
          </p>
          <h3 id="user">User</h3>
          <p>
            An end-user of <b>your</b> product. Carries{' '}
            <code className="inline">email</code>, optional{' '}
            <code className="inline">firstName / lastName / username</code>,{' '}
            <code className="inline">role</code> (
            <code className="inline">user</code> |{' '}
            <code className="inline">admin</code>), verified + blocked flags.
            You are a <b>developer</b> — operating via panel or secret key.
          </p>
          <h3 id="session">Session</h3>
          <p>
            32-byte random token + 7-day expiry in HttpOnly cookies (and
            optional Bearer). Revoke one and that device is out. Full detail in{' '}
            <b>Sessions</b>.
          </p>
          <h3 id="key">API key</h3>
          <p>
            <code className="inline">pk_…</code> (browsers) or{' '}
            <code className="inline">sk_…</code> (servers), each{' '}
            <code className="inline">test</code> or{' '}
            <code className="inline">live</code>. Only a SHA-256 hash is stored.
          </p>
          <h3 id="domain">Domain</h3>
          <p>
            Browser origin allowed to call with this project's publishable key.
            Anything else is rejected before touching data.
          </p>
          <h3 id="env">Environment: test vs live</h3>
          <p>
            Projects start in <code className="inline">test</code> (lenient
            CORS/billing/rate limits; localhost always allowed). Flip via
            Project → Settings → <b>Go live</b>.
          </p>
        </>
      )}

      {slug === 'react' && (
        <>
          <h2 id="provider">Provider + components</h2>
          <p>
            Wrap your app once, use hooks anywhere. Drop-in auth UI comes from{' '}
            <code className="inline">@slyxup/ui</code>.
          </p>
          <CodeBlock
            title="app.tsx"
            lang="tsx"
            code={`import { SlyxUpProvider, SignIn, UserButton } from "@slyxup/ui"\n\n<SlyxUpProvider publishableKey="pk_..." apiUrl="${AUTH_URL}" billingApiUrl="${BILLING_URL}" tokenStorage="sessionStorage">\n  <SignIn social={false} onSuccess={() => navigate("/account")} />\n  <UserButton />\n</SlyxUpProvider>`}
          />
          <h3 id="hooks">Hooks</h3>
          <p>
            <code className="inline">useAuth</code> (signIn/signOut/session),{' '}
            <code className="inline">useUser</code>,{' '}
            <code className="inline">useSession</code>,{' '}
            <code className="inline">useBilling</code>,{' '}
            <code className="inline">usePlans</code>,{' '}
            <code className="inline">useSubscription</code>,{' '}
            <code className="inline">useTwoFactor</code>.
          </p>
          <Callout tone="warning" title="Tokens are not authorization">
            UI visibility is not a security boundary. Your server must validate
            every protected request — use{' '}
            <code className="inline">client.getToken()</code> as your API's
            bearer header, never send it to untrusted URLs.
          </Callout>
          <h3 id="verify">Verification + reset pages</h3>
          <p>
            Render{' '}
            <code className="inline">
              {'<EmailVerification token={token} />'}
            </code>{' '}
            on the verify landing page and{' '}
            <code className="inline">{'<ResetPassword token={token} />'}</code>{' '}
            on reset. Read <code className="inline">token</code> from your
            router's URL. <code className="inline">SignIn</code> handles{' '}
            <code className="inline">2FA_REQUIRED</code> challenges
            automatically.
          </p>
        </>
      )}

      {slug === 'core-sdk' && (
        <>
          <h2 id="headless">Headless client</h2>
          <p>
            Prefer your own UI? <code className="inline">@slyxup/core</code> is
            the TypeScript client for the REST API. No separate framework
            packages.
          </p>
          <CodeBlock
            title="auth.ts"
            lang="ts"
            code={`import { SlyxupClient } from "@slyxup/core"\n\nconst slyxup = new SlyxupClient({\n  publishableKey: "pk_...",\n  apiUrl: "${AUTH_URL}",\n})\n\nawait slyxup.auth.signUp({ email, password })\nawait slyxup.auth.signIn({ email, password })\nconst { user } = await slyxup.users.me()\nawait slyxup.auth.signOut()`}
          />
          <CodeBlock
            title="billing.ts"
            lang="ts"
            code={`import { createBillingClient } from "@slyxup/core"\nconst billing = createBillingClient({\n  apiUrl: "${BILLING_URL}",\n  publishableKey: slyxup.publishableKey,\n  getToken: () => slyxup.getToken(),\n})\nconst plans = await billing.listPlans(projectId)\nif (plans[0]) await billing.checkout(plans[0].id)\nconst access = await billing.getEntitlements(projectId)\nconst canExport = access.features.includes("export")`}
          />
          <h3 id="server">Server-side admin</h3>
          <p>
            <code className="inline">new SlyxupClient({'{ secretKey }'})</code>{' '}
            on your server for project administration — never in browser code.
            Create one client per request; never keep signed-in server clients
            in module scope.
          </p>
        </>
      )}

      {slug === 'ui-kit' && (
        <>
          <h2 id="components">Fifteen components, three layouts</h2>
          <p>
            Styles self-inject; theme with{' '}
            <code className="inline">applyTheme()</code> or CSS variables on{' '}
            <code className="inline">.slyxup-root</code> (
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
              <code className="inline">EmailVerification</code> — reset + verify
              flows.
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
              <code className="inline">PasswordField</code>,{' '}
              <code className="inline">PasswordStrength</code> (+{' '}
              <code className="inline">passwordScore()</code>),{' '}
              <code className="inline">OtpInput</code>,{' '}
              <code className="inline">CopyField</code>,{' '}
              <code className="inline">EmptyState</code>.
            </li>
          </ul>
          <CodeBlock
            title="theme.ts"
            lang="ts"
            code={`import { applyTheme } from "@slyxup/ui"\n\napplyTheme({ accent: "mono", radius: 10 })\n// layouts: <SignIn layout="split" /> | "centered" | "minimal"`}
          />
          <p>
            Try everything live at <b>/ui</b> — theme playground, props tables
            and copy-paste snippets included.
          </p>
        </>
      )}

      {slug === 'management-api' && (
        <>
          <h2 id="manage">Projects, keys, domains</h2>
          <p>
            Manage via this panel or the API directly with a developer session.
            Your account must be a project member (403 otherwise).
          </p>
          <div className="space-y-2">
            <Endpoint
              method="GET"
              path="/v1/projects"
              desc="List my projects"
            />
            <Endpoint
              method="POST"
              path="/v1/projects"
              desc="Create (name, slug, description)"
            />
            <Endpoint
              method="DELETE"
              path="/v1/projects/:id"
              desc="Delete project + everything under it"
            />
            <Endpoint
              method="GET"
              path="/v1/keys?projectId="
              desc="List keys (hashes never exposed)"
            />
            <Endpoint
              method="POST"
              path="/v1/keys"
              desc="Create — full key returned once"
            />
            <Endpoint
              method="DELETE"
              path="/v1/keys/:id"
              desc="Revoke instantly"
            />
            <Endpoint
              method="GET"
              path="/v1/projects/:id/domains"
              desc="List allowed origins"
            />
            <Endpoint
              method="PATCH"
              path="/v1/projects/:id/domains"
              desc="{ action: add | remove, domain }"
            />
            <Endpoint
              method="POST"
              path="/v1/projects/:id/go-live"
              desc="Switch to live environment"
            />
          </div>
          <CodeBlock
            title="manage.sh"
            lang="bash"
            code={`curl -H "Authorization: Bearer <session>" ${AUTH_URL}/v1/projects\ncurl -H "Authorization: Bearer <session>" "${AUTH_URL}/v1/keys?projectId=<id>"`}
          />
        </>
      )}

      {slug === 'authentication' && (
        <>
          <h2 id="flows">Email + password, end to end</h2>
          <p>
            Email + password is primary; OAuth and 2FA layer on top. Every flow
            ends in a <b>session</b> (7-day cookie/Bearer) — see <b>Sessions</b>
            .
          </p>
          <h3 id="signup">Sign up</h3>
          <p>
            <code className="inline">POST /v1/auth/sign-up</code> takes{' '}
            <code className="inline">email</code>,{' '}
            <code className="inline">password</code> (8–128), optional{' '}
            <code className="inline">firstName</code> +{' '}
            <code className="inline">username</code> (3–30, lowercase). Returns
            a session <b>and</b> sends a verification email (best-effort; tokens
            live 24h).
          </p>
          <CodeBlock
            title="signup.ts"
            lang="ts"
            code={`const res = await client.auth.signUp({\n  email: "ada@example.com",\n  password: "correct-horse-9",\n  firstName: "Ada",\n  username: "ada",\n});\n// → { userId, sessionToken, expiresAt } + verification email sent`}
          />
          <h3 id="signin">Sign in</h3>
          <p>
            <code className="inline">POST /v1/auth/sign-in</code> accepts{' '}
            <code className="inline">{'{ email, password }'}</code> <b>or</b>{' '}
            <code className="inline">{'{ username, password }'}</code>. Normal
            accounts get <code className="inline">{'{ sessionToken }'}</code>,
            while 2FA accounts get{' '}
            <code className="inline">{'{ challengeToken }'}</code> → finish via{' '}
            <code className="inline">POST /v1/auth/sign-in/2fa</code>.
          </p>
          <h3 id="signout">Sign out</h3>
          <p>
            <code className="inline">POST /v1/auth/sign-out</code> ends the
            session + clears cookies. For <b>every</b> device, delete each
            session (<code className="inline">DELETE /v1/sessions/:id</code>) or
            block + unblock the user.
          </p>
          <h3 id="bootstrap">First admin</h3>
          <p>
            Claim via <code className="inline">POST /v1/setup/bootstrap</code>{' '}
            while the users table is empty. No default password — you choose it
            in the request; passwords are never returned.
          </p>
        </>
      )}

      {slug === 'oauth' && (
        <>
          <h2 id="flow">Google + GitHub, fully hosted</h2>
          <p>
            Exactly two providers. Your app never sees provider secrets —
            standard authorization-code with a server-side state guard.
          </p>
          <Steps
            items={[
              {
                title: 'Start — GET /v1/oauth/:provider?redirect_url=…',
                desc: 'Server stores a state token for 10 minutes and redirects to the provider (google | github).',
              },
              {
                title: 'Callback — /v1/oauth/callback/:provider',
                desc: 'Validates single-use state, exchanges the code, upserts the user by verified email (new users created, existing linked).',
              },
              {
                title: 'Land',
                desc: 'Session created, browser returns to your redirect_url. Failures land on /sign-in?error=missing_code | invalid_state | state_mismatch.',
              },
            ]}
          />
          <CodeBlock
            title="oauth.tsx"
            lang="tsx"
            code={`import { SocialButtons } from "@slyxup/ui";\n\n<SocialButtons providers={["google", "github"]} />\n\n// manual:\n// window.location.href =\n//   AUTH_URL + "/v1/oauth/google?redirect_url=" + encodeURIComponent(location.href)`}
          />
          <h3 id="link">Link / unlink</h3>
          <p>
            Connected providers live under{' '}
            <code className="inline">GET /v1/user/accounts</code>. Unlink with{' '}
            <code className="inline">
              DELETE /v1/user/accounts/:id?provider=…
            </code>{' '}
            — only while ≥1 sign-in method remains, so accounts can't lock
            themselves out.
          </p>
        </>
      )}

      {slug === 'passwords-verification' && (
        <>
          <h2 id="hashing">Hashing + enumeration resistance</h2>
          <p>
            Passwords require <b>8–128 characters</b>, stored as
            PBKDF2-HMAC-SHA-256 (100,000 iterations, per-user salt). All email
            flows are <b>best-effort and non-enumerating</b>: unknown addresses
            still return success.
          </p>
          <h3 id="verify">Email verification (24h)</h3>
          <ul>
            <li>
              Sign-up sends a link (token valid <b>24 hours</b>).
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
          <h3 id="reset">Password reset (1h, single-use)</h3>
          <ul>
            <li>
              <code className="inline">
                POST /v1/verification/password/forgot
              </code>{' '}
              with <code className="inline">{'{ email }'}</code> — always
              succeeds.
            </li>
            <li>
              <code className="inline">
                POST /v1/verification/password/reset
              </code>{' '}
              with <code className="inline">{'{ token, password }'}</code> sets
              the new password.
            </li>
          </ul>
          <h3 id="change">Change while signed in</h3>
          <p>
            <code className="inline">POST /v1/user/password</code> (current +
            new). First-login admins use{' '}
            <code className="inline">POST /v1/auth/password/force-change</code>.
          </p>
        </>
      )}

      {slug === 'sessions' && (
        <>
          <h2 id="transport">Cookies + Bearer</h2>
          <p>
            Every sign-in mints a 32-byte token with <b>7-day expiry</b>,
            delivered as <code className="inline">slyxup_session</code> plus
            host-only <code className="inline">__Host-slyxup_session</code>{' '}
            (preferred — can't leak across subdomains). SDKs may also send{' '}
            <code className="inline">Authorization: Bearer</code>, which wins.
            All <code className="inline">HttpOnly, Secure, SameSite=Lax</code>.
          </p>
          <div className="space-y-2">
            <Endpoint
              method="POST"
              path="/v1/auth/sign-in"
              desc="Start session (or 2FA challenge)"
            />
            <Endpoint
              method="POST"
              path="/v1/auth/sign-in/2fa"
              desc="Complete with 6-digit code"
            />
            <Endpoint
              method="POST"
              path="/v1/auth/sign-out"
              desc="End session + clear cookies"
            />
            <Endpoint
              method="GET"
              path="/v1/auth/session"
              desc="Inspect current session"
            />
            <Endpoint
              method="GET"
              path="/v1/sessions"
              desc="List my sessions"
            />
            <Endpoint
              method="DELETE"
              path="/v1/sessions/:id"
              desc="Revoke one device"
            />
          </div>
          <Callout tone="info" title="Rules that always hold">
            Blocked users lose everything instantly. Sessions are single-token
            (no refresh tokens — sign in again on expiry). Cookies are scoped
            per host; Bearer tokens isolate platforms further.
          </Callout>
        </>
      )}

      {slug === 'two-factor' && (
        <>
          <h2 id="enable">Enable in this order</h2>
          <Steps
            items={[
              {
                title: 'Setup — GET /v1/user/2fa/setup',
                desc: 'Returns fresh secret + provisioning URI. Nothing persisted — render as QR.',
              },
              {
                title: 'Confirm — POST /v1/user/2fa/enable { secret, code }',
                desc: 'Code must match the authenticator app. Returns recovery codes — show once, store safely.',
              },
              {
                title: 'Sign in — challenge flow',
                desc: 'Password step returns { challengeToken }; finish with POST /v1/auth/sign-in/2fa { challengeToken, code }.',
              },
            ]}
          />
          <CodeBlock
            title="2fa.ts"
            lang="ts"
            code={`const res = await client.auth.signIn({ email, password });\nif ("challengeToken" in res) {\n  await client.auth.completeSignIn({ challengeToken: res.challengeToken, code: "123456" });\n}`}
          />
          <h3 id="manage2fa">Manage</h3>
          <ul>
            <li>
              <code className="inline">GET /v1/user/2fa/status</code> — is 2FA
              on?
            </li>
            <li>
              <code className="inline">POST /v1/user/2fa/verify</code> — check a
              code <b>without</b> changing state.
            </li>
            <li>
              <code className="inline">POST /v1/user/2fa/disable</code> — needs
              a valid current code; emits{' '}
              <code className="inline">2fa.disabled</code>.
            </li>
          </ul>
          <p>
            <code className="inline">SignIn</code> shows the challenge screen
            automatically;{' '}
            <code className="inline">UserProfile → Security</code> walks users
            through setup + recovery + disable.
          </p>
        </>
      )}

      {slug === 'users-members' && (
        <>
          <h2 id="list">List & search</h2>
          <p>
            <code className="inline">GET /v1/projects/:id/users</code> supports{' '}
            <code className="inline">q</code> (email substring),{' '}
            <code className="inline">limit</code> (default 50, max 200),{' '}
            <code className="inline">offset</code>, newest first, with{' '}
            <code className="inline">total</code>. Detail adds profile, live
            session count + linked OAuth providers.
          </p>
          <h3 id="roles">Roles</h3>
          <ul>
            <li>
              <b>owner</b> — created the project. Only owners can delete it.
            </li>
            <li>
              <b>admin</b> — manages users, keys, domains.
            </li>
            <li>
              <b>member</b> / <b>user</b> — default end-user. Change via{' '}
              <code className="inline">
                PATCH /v1/projects/:id/users/:userId
              </code>
              .
            </li>
          </ul>
          <h3 id="moderate">Block, unblock, delete</h3>
          <ul>
            <li>
              <b>Block</b> (<code className="inline">POST …/block</code>,
              optional <code className="inline">{'{ reason }'}</code>) flips the
              flag <b>and deletes every session</b>.
            </li>
            <li>
              <b>Unblock</b> (<code className="inline">POST …/unblock</code>)
              restores access; user signs in again.
            </li>
            <li>
              <b>Delete</b> (<code className="inline">DELETE …/:userId</code>)
              removes profile + sessions + row — permanent.
            </li>
          </ul>
        </>
      )}

      {slug === 'api-keys' && (
        <>
          <h2 id="types">Which key goes where</h2>
          <p>
            Prefix encodes trust: <code className="inline">pk_…</code> is
            publishable and <code className="inline">sk_…</code> is secret.
            Test/live behavior comes from the project environment, not the key
            string.
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
                <td>Browsers. Origin-checked against your domains.</td>
              </tr>
              <tr>
                <td>secret (sk_)</td>
                <td>Your server only. Never ships to browsers.</td>
              </tr>
              <tr>
                <td>test</td>
                <td>Local dev; lenient CORS + billing.</td>
              </tr>
              <tr>
                <td>live</td>
                <td>Production; strict checks everywhere.</td>
              </tr>
            </tbody>
          </table>
          <h3 id="lifecycle">Lifecycle rules</h3>
          <ul>
            <li>
              <b>Created once, shown once</b> —{' '}
              <code className="inline">POST /v1/keys</code> returns the full
              key; only a SHA-256 hash is stored.
            </li>
            <li>
              <b>Listing never leaks</b> —{' '}
              <code className="inline">GET /v1/keys?projectId=…</code> returns
              id, name, prefix and type. No hashes or full keys.
            </li>
            <li>
              <b>Revocation is instant</b> —{' '}
              <code className="inline">DELETE /v1/keys/:id</code>; in-flight
              requests fail immediately.
            </li>
            <li>
              <b>Rotate like this</b> — create replacement → deploy → revoke
              old. Never reverse.
            </li>
          </ul>
        </>
      )}

      {slug === 'domains-cors' && (
        <>
          <h2 id="rules">Matching rules</h2>
          <p>
            Publishable-key browser calls need <b>both</b> a valid key{' '}
            <b>and</b> an allowlisted origin — otherwise the API answers without
            CORS headers and the browser blocks the response.
          </p>
          <ul>
            <li>
              Hostnames compare <b>exactly</b> after lowercasing; leading{' '}
              <code className="inline">www.</code> ignored both sides.
            </li>
            <li>
              Only <code className="inline">https://</code> custom origins.{' '}
              <code className="inline">localhost</code> (any port) is{' '}
              <b>always allowed</b>.
            </li>
            <li>
              Only <code className="inline">live</code>-project domains
              enforced; KV-cached <b>60 seconds</b> (fresh adds take ~1 min).
            </li>
            <li>
              Preflights (<code className="inline">OPTIONS</code>) answer{' '}
              <code className="inline">204</code> with credentials.
            </li>
          </ul>
          <h3 id="manage-domains">Manage</h3>
          <p>
            Project → Domains, or{' '}
            <code className="inline">PATCH /v1/projects/:id/domains</code> with{' '}
            <code className="inline">
              {'{ action: "add" | "remove", domain }'}
            </code>
            . Enter bare hosts (<code className="inline">app.example.com</code>
            ), never URLs.
          </p>
        </>
      )}

      {slug === 'billing-overview' && (
        <>
          <h2 id="loop">The money loop (Paddle-style)</h2>
          <p>
            Money lives in the <b>billing Worker</b> (Paddle-backed), separate
            from identity. It never writes the auth DB — it validates your
            session read-only and owns plans, subscriptions, invoices itself.
          </p>
          <Steps
            items={[
              {
                title: 'List plans',
                desc: 'GET /v1/billing/plans?projectId=… returns active plans only (name, amount in cents, interval, trial, features).',
              },
              {
                title: 'Checkout',
                desc: 'POST /v1/billing/checkout { planId, successUrl } → { checkoutUrl }. Open it — Paddle takes over (overlay or hosted).',
              },
              {
                title: 'Webhook truth',
                desc: 'subscription.created creates the subscription row. The webhook — not the checkout call — is the source of truth.',
              },
              {
                title: 'Gate access',
                desc: 'GET subscription/invoices for UI; getEntitlements(projectId) server-side for authorization. Check features.includes("export").',
              },
            ]}
          />
          <Callout tone="warning" title="501 Billing not configured">
            Without a Paddle key these endpoints answer{' '}
            <code className="inline">501</code> — plans still list, checkout
            doesn't run. Normal on a fresh self-host.
          </Callout>
          <CodeBlock
            title="subscribe.ts"
            lang="ts"
            code={`const plans = await billing.listPlans(projectId)\nconst { checkoutUrl } = await billing.checkout(plans[0].id, { successUrl: location.origin + "/billing/return" })\nwindow.location.assign(checkoutUrl) // same-tab avoids popup blockers`}
          />
        </>
      )}

      {slug === 'plans' && (
        <>
          <h2 id="shape">Plan shape</h2>
          <p>
            <code className="inline">name</code>,{' '}
            <code className="inline">amount</code> (cents),{' '}
            <code className="inline">currency</code>,{' '}
            <code className="inline">interval</code> (
            <code className="inline">month</code>/
            <code className="inline">year</code>), optional{' '}
            <code className="inline">trialDays</code>,{' '}
            <code className="inline">features[]</code>,{' '}
            <code className="inline">popular</code> flag, ordered by{' '}
            <code className="inline">sortOrder</code>.
          </p>
          <div className="space-y-2">
            <Endpoint
              method="GET"
              path="/v1/billing/plans?projectId="
              desc="Public — active plans only"
            />
            <Endpoint
              method="POST"
              path="/v1/admin/plans"
              desc="Admin — create (+ auto Paddle price)"
            />
            <Endpoint
              method="PATCH"
              path="/v1/admin/plans/:id"
              desc="Admin — edit"
            />
            <Endpoint
              method="DELETE"
              path="/v1/admin/plans/:id"
              desc="Admin — deactivate"
            />
            <Endpoint
              method="POST"
              path="/v1/admin/plans/:id/sync"
              desc="Admin — create missing Paddle price"
            />
          </div>
          <Callout tone="info" title="Paddle price mapping">
            Creating a plan without{' '}
            <code className="inline">paddlePriceId</code> auto-creates the
            Paddle price in the same environment (sandbox vs production must
            match). Pass an explicit price ID only when reusing an existing
            Paddle price.
          </Callout>
          <CodeBlock
            title="pricing.tsx"
            lang="tsx"
            code={
              'const plans = await billing.listPlans(projectId)\n<PricingTable plans={plans} onSelect={(p) => checkout(p.id)} />\n// mark one plan popular for the highlighted card'
            }
          />
        </>
      )}

      {slug === 'checkout' && (
        <>
          <h2 id="hosted">Hosted checkout, two ways to open</h2>
          <Steps
            items={[
              {
                title: 'Create',
                desc: 'POST /v1/billing/checkout { planId, successUrl } → { checkoutUrl, transactionId }. Refuses when already active/trialing — cancel first.',
              },
              {
                title: 'Open',
                desc: 'Paddle overlay (clientToken from GET /v1/billing/config) for inline, or hosted redirect via window.location.assign(checkoutUrl) — same-tab avoids popup blockers.',
              },
              {
                title: 'Verify',
                desc: 'successUrl like /checkout/success?transaction_id=… then GET /v1/billing/transactions/:id → { paid }. Never trust bare URL params.',
              },
            ]}
          />
          <CodeTabs
            tabs={[
              {
                label: 'TypeScript',
                lang: 'ts',
                title: 'checkout.ts',
                code: `const { checkoutUrl } = await billing.checkout(plan.id, {\n  origin: "https://your-app.example/billing/return",\n  manualOpen: true,\n})\nwindow.location.assign(checkoutUrl)`,
              },
              {
                label: 'cURL',
                lang: 'bash',
                title: 'checkout.sh',
                code: `curl -X POST ${BILLING_URL}/v1/billing/checkout \\\n  -H "Authorization: Bearer <session>" -H "Content-Type: application/json" \\\n  -d '{"planId":"<plan>","successUrl":"https://stack.slyxup.com/checkout/success"}'`,
              },
            ]}
          />
          <Callout tone="warning" title="Transaction ID is display, not proof">
            getTransaction shows checkout status. It does not prove the current
            user owns a paid plan — gate paid features with getEntitlements on
            your server.
          </Callout>
        </>
      )}

      {slug === 'subscriptions-invoices' && (
        <>
          <h2 id="sub">Subscriptions</h2>
          <div className="space-y-2">
            <Endpoint
              method="GET"
              path="/v1/billing/subscription?projectId="
              desc="Status, period, cancel flag"
            />
            <Endpoint
              method="POST"
              path="/v1/billing/subscription/cancel?projectId="
              desc="Cancel at period end — access continues"
            />
            <Endpoint
              method="POST"
              path="/v1/billing/subscription/resume?projectId="
              desc="Undo scheduled cancellation"
            />
            <Endpoint
              method="GET"
              path="/v1/billing/invoices?projectId="
              desc="Newest first, limit 50 (max 100)"
            />
          </div>
          <h3 id="portal">Portal UI</h3>
          <CodeBlock
            title="portal.tsx"
            lang="tsx"
            code={`import { BillingPortal, useSubscription, useInvoices } from "@slyxup/ui"\n\nconst sub = useSubscription(projectId)\nconst invoices = useInvoices()\n<BillingPortal subscription={sub.subscription} invoices={invoices.invoices}\n  onCancel={() => client.cancelSubscription(projectId)}\n  onResume={() => client.resumeSubscription(projectId)} />`}
          />
          <Callout tone="info" title="Trialing counts as subscribed">
            Checkout refuses while <code className="inline">active</code> or{' '}
            <code className="inline">trialing</code>. Webhook delivery can lag
            the redirect — show pending + retry with a bounded interval.
          </Callout>
        </>
      )}

      {slug === 'entitlements' && (
        <>
          <h2 id="gate">Gate on the server, every request</h2>
          <p>
            Entitlements are the features of the active subscription's plan.
            Only <code className="inline">active</code>/
            <code className="inline">trialing</code> with a future period end
            grant features — paused, past-due, cancelled, missing-period and
            expired grant nothing.
          </p>
          <CodeBlock
            title="entitlements.ts"
            lang="ts"
            code={`// your API route — never trust client state or checkout params\nconst access = await billing.getEntitlements(projectId)\nif (!access.features.includes("export")) {\n  return Response.json({ error: "Upgrade required" }, { status: 403 })\n}`}
          />
          <Callout tone="warning" title="Never authorize by">
            Checkout URL params, localStorage flags, PricingTable visibility, or
            transaction IDs. Always: validate session → getEntitlements → check
            features.
          </Callout>
        </>
      )}

      {slug === 'paddle-setup' && (
        <>
          <h2 id="checklist">Sandbox → production checklist</h2>
          <Steps
            items={[
              {
                title: 'Sandbox keys',
                desc: 'Paddle sandbox: API key + client token + webhook secret → billing secrets via wrangler secret put. Checked-in config uses sandbox.',
              },
              {
                title: 'Map prices',
                desc: 'Create plan in admin (auto-creates sandbox price) or paste an existing paddlePriceId. Verify the price in the Paddle dashboard.',
              },
              {
                title: 'Wire webhooks',
                desc: 'Point Paddle at your billing worker URL; subscribe to subscription.created/updated/cancelled + transaction.completed. New subscription webhooks must match the server checkout record + Paddle transaction/customer/price.',
              },
              {
                title: 'Test for real',
                desc: 'Sandbox purchase → webhook → entitlements → refund/cancel. Confirm CUSTOMER_IDENTITY_CONFLICT handling with the operator (never merge client-side).',
              },
              {
                title: 'Go production',
                desc: 'Repeat with production keys/prices, flip project to live, re-verify. Sandbox prices never work in production.',
              },
            ]}
          />
          <div className="space-y-2">
            <Endpoint
              method="GET"
              path="/v1/billing/config?projectId="
              desc="Overlay client token (safe to expose)"
            />
            <Endpoint
              method="GET"
              path="/v1/billing/transactions/:id"
              desc="Verify checkout (paid flag)"
            />
          </div>
        </>
      )}

      {slug === 'webhooks' && (
        <>
          <h2 id="two-streams">Two streams — don't mix them</h2>
          <p>
            <b>Auth events</b> fire from identity when users change;{' '}
            <b>Paddle events</b> land on billing and update subscriptions.
          </p>
          <h3 id="auth-events">Auth events</h3>
          <p>
            <code className="inline">user.created</code> ·{' '}
            <code className="inline">user.updated</code> ·{' '}
            <code className="inline">user.deleted</code> ·{' '}
            <code className="inline">user.signed_in</code> /{' '}
            <code className="inline">user.signed_out</code> ·{' '}
            <code className="inline">session.revoked</code> ·{' '}
            <code className="inline">password.changed</code> /{' '}
            <code className="inline">password.reset</code> ·{' '}
            <code className="inline">email.verified</code> ·{' '}
            <code className="inline">oauth.linked</code> /{' '}
            <code className="inline">oauth.unlinked</code> ·{' '}
            <code className="inline">2fa.enabled</code> /{' '}
            <code className="inline">2fa.disabled</code>
          </p>
          <p>
            Each event POSTs signed JSON to your project webhook URL. Verify the
            signature with your <code className="inline">sk_…</code>, respond{' '}
            <code className="inline">200</code> fast, do heavy work async.
          </p>
          <h3 id="paddle-events">Billing (Paddle) events</h3>
          <p>
            Paddle sends subscription lifecycle events to the billing Worker —
            sole owner of plans, subscriptions, invoices. Timestamps decide
            ordering; duplicate delivery uses expiring leases so crashed
            deliveries retry safely. Existing subscriptions keep their recorded
            owner.
          </p>
        </>
      )}

      {slug === 'self-hosting' && (
        <>
          <h2 id="cf">Everything runs on Cloudflare</h2>
          <p>
            Workers for compute, D1 (SQLite) for data, KV for sessions/cache.
            You need a Cloudflare account +{' '}
            <code className="inline">wrangler</code>.
          </p>
          <h3 id="backend">1. Backend (auth worker)</h3>
          <CodeBlock
            title="bash"
            lang="bash"
            code={
              'cd auth\ncp .env.example .dev.vars\n# put your D1/KV ids in the active Wrangler config (wrangler d1 create slyxup_auth)\npnpm db:generate && pnpm db:migrate:local\nwrangler secret put SESSION_SECRET\nwrangler dev    # or: wrangler deploy'
            }
          />
          <h3 id="admin">2. First admin</h3>
          <p>
            Empty users table →{' '}
            <code className="inline">POST /v1/setup/bootstrap</code> (optionally
            gated by <code className="inline">BOOTSTRAP_SECRET</code>,
            restricted to <code className="inline">BOOTSTRAP_ADMIN_EMAIL</code>
            ). No default password — choose it in the request. Check{' '}
            <code className="inline">GET /v1/setup/status</code> first.
          </p>
          <h3 id="panel">3. This panel (web)</h3>
          <CodeBlock
            title="bash"
            lang="bash"
            code={
              'cd web\ncp .env.example .env   # VITE_API_URL → your auth worker URL\npnpm install && pnpm build\nwrangler deploy --config wrangler.stack-frontend.jsonc'
            }
          />
          <h3 id="secrets">Secrets, never files</h3>
          <p>
            <code className="inline">SESSION_SECRET</code>,{' '}
            <code className="inline">BILLING_ADMIN_SECRET</code> + Paddle keys
            via <code className="inline">wrangler secret put</code> only — never{' '}
            <code className="inline">wrangler.jsonc</code>,{' '}
            <code className="inline">.env</code> or git. Local dev uses
            gitignored <code className="inline">.dev.vars</code>.
          </p>
        </>
      )}

      {slug === 'security' && (
        <>
          <h2 id="model">Security model</h2>
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
              exists only in the create response.
            </li>
            <li>
              <b>Publishable</b> keys (<code className="inline">pk_…</code>) are
              browser-safe but origin-checked.
            </li>
            <li>
              <b>Secret</b> keys (<code className="inline">sk_…</code>) are
              server-only. Leak → revoke + rotate.
            </li>
            <li>
              <b>Blocked users</b> lose all sessions immediately.
            </li>
          </ul>
        </>
      )}

      {slug === 'api-reference' && (
        <>
          <h2 id="bases">Base URLs + auth</h2>
          <p>
            Identity: <code className="inline">{AUTH_URL}</code> · Billing:{' '}
            <code className="inline">{BILLING_URL}</code>. Send{' '}
            <code className="inline">Authorization: Bearer {'<session>'}</code>{' '}
            or the HttpOnly cookie. Errors are always{' '}
            <code className="inline">{'{ ok: false, error }'}</code> with the
            HTTP status.
          </p>
          <h3 id="auth-api">Identity</h3>
          <div className="space-y-2">
            <Endpoint
              method="POST"
              path="/v1/auth/sign-up"
              desc="Register (email, password, name?, username?)"
            />
            <Endpoint
              method="POST"
              path="/v1/auth/sign-in"
              desc="Sign in (email|username + password)"
            />
            <Endpoint
              method="POST"
              path="/v1/auth/sign-in/2fa"
              desc="Finish 2FA challenge"
            />
            <Endpoint
              method="POST"
              path="/v1/auth/sign-out"
              desc="End session + clear cookies"
            />
            <Endpoint
              method="GET"
              path="/v1/auth/session"
              desc="Inspect current session"
            />
            <Endpoint method="GET" path="/v1/user" desc="Current profile" />
            <Endpoint
              method="PATCH"
              path="/v1/user"
              desc="Update own profile"
            />
            <Endpoint
              method="POST"
              path="/v1/user/password"
              desc="Rotate password"
            />
            <Endpoint
              method="GET"
              path="/v1/sessions · DELETE /v1/sessions/:id"
              desc="List / revoke my sessions"
            />
            <Endpoint
              method="POST"
              path="/v1/verification/verify · /resend"
              desc="Verify email / resend link"
            />
            <Endpoint
              method="GET"
              path="/v1/verification/confirm?token="
              desc="Confirm from email link"
            />
            <Endpoint
              method="POST"
              path="/v1/verification/password/forgot"
              desc="Request reset email"
            />
            <Endpoint
              method="POST"
              path="/v1/verification/password/reset"
              desc="Reset with token + password"
            />
            <Endpoint
              method="GET"
              path="/v1/user/2fa/setup · /status"
              desc="TOTP setup / status"
            />
            <Endpoint
              method="POST"
              path="/v1/user/2fa/enable · /verify · /disable"
              desc="TOTP lifecycle"
            />
            <Endpoint
              method="GET"
              path="/v1/user/accounts"
              desc="Linked OAuth providers"
            />
            <Endpoint
              method="DELETE"
              path="/v1/user/accounts/:id"
              desc="Unlink provider"
            />
            <Endpoint
              method="GET"
              path="/v1/oauth/google | github"
              desc="Start hosted OAuth"
            />
            <Endpoint
              method="GET"
              path="/v1/oauth/callback/:provider"
              desc="OAuth callback"
            />
          </div>
          <h3 id="mgmt-api">Projects, users, keys, domains</h3>
          <div className="space-y-2">
            <Endpoint
              method="GET"
              path="/v1/projects"
              desc="List my projects"
            />
            <Endpoint method="POST" path="/v1/projects" desc="Create project" />
            <Endpoint
              method="DELETE"
              path="/v1/projects/:id"
              desc="Delete + everything under it"
            />
            <Endpoint
              method="POST"
              path="/v1/projects/:id/go-live"
              desc="Go live"
            />
            <Endpoint
              method="GET"
              path="/v1/projects/:id/users?q=&limit=&offset="
              desc="Search + paginate"
            />
            <Endpoint
              method="PATCH"
              path="/v1/projects/:id/users/:userId"
              desc="Edit profile / role"
            />
            <Endpoint
              method="POST"
              path="…/users/:userId/block"
              desc="Block + revoke sessions"
            />
            <Endpoint
              method="POST"
              path="…/users/:userId/unblock"
              desc="Unblock"
            />
            <Endpoint
              method="DELETE"
              path="…/users/:userId"
              desc="Delete user"
            />
            <Endpoint
              method="GET"
              path="/v1/keys?projectId="
              desc="List keys"
            />
            <Endpoint
              method="POST"
              path="/v1/keys"
              desc="Create (once-visible)"
            />
            <Endpoint method="DELETE" path="/v1/keys/:id" desc="Revoke" />
            <Endpoint
              method="GET"
              path="/v1/projects/:id/domains"
              desc="List origins"
            />
            <Endpoint
              method="PATCH"
              path="/v1/projects/:id/domains"
              desc="Add / remove origin"
            />
            <Endpoint
              method="GET"
              path="/v1/projects/:id/audit?limit=&offset=&action="
              desc="Project audit timeline + total"
            />
          </div>
          <h3 id="billing-api">Billing (billing host)</h3>
          <div className="space-y-2">
            <Endpoint
              method="GET"
              path="/v1/billing/plans?projectId="
              desc="Active plans"
            />
            <Endpoint
              method="POST"
              path="/v1/billing/checkout"
              desc="{ planId, successUrl } → { checkoutUrl }"
            />
            <Endpoint
              method="GET"
              path="/v1/billing/subscription?projectId="
              desc="Status + period"
            />
            <Endpoint
              method="POST"
              path="…/subscription/cancel · …/resume"
              desc="Cancel at period end / resume"
            />
            <Endpoint
              method="GET"
              path="/v1/billing/invoices?projectId="
              desc="Invoices, newest first"
            />
            <Endpoint
              method="GET"
              path="/v1/billing/transactions/:id"
              desc="Verify checkout (paid)"
            />
            <Endpoint
              method="GET"
              path="/v1/billing/config"
              desc="Paddle client token"
            />
            <Endpoint
              method="GET"
              path="/v1/billing/entitlements?projectId="
              desc="Features for gating"
            />
            <Endpoint
              method="GET"
              path="/v1/billing/stats?projectId="
              desc="Subscribers, MRR, revenue, per-plan"
            />
          </div>
        </>
      )}

      {slug === 'troubleshooting' && (
        <>
          <h2 id="fix">Fix it fast</h2>
          <h3 id="t401">401 on every call</h3>
          <p>
            Check transport: memory default vs project-scoped sessionStorage vs
            same-origin HttpOnly cookie. Standalone billing clients need{' '}
            <code className="inline">getToken</code>. Expired → sign in again.
          </p>
          <h3 id="t403">403 on a project route</h3>
          <p>
            Not a member of that project. Ask the owner, or use a key created
            inside it.
          </p>
          <h3 id="tcors">Browser calls rejected (CORS / origin)</h3>
          <p>
            Origin must be in Project → Domains, and browser calls must use{' '}
            <code className="inline">pk_…</code> —{' '}
            <code className="inline">sk_…</code> is rejected from browsers by
            design.
          </p>
          <h3 id="tlink">Invalid or expired link</h3>
          <p>
            Tokens are single-use + expiring. Resend, open in the same browser,
            complete within the window.
          </p>
          <h3 id="tforce">Password change forced at login</h3>
          <p>
            First-login admins carry{' '}
            <code className="inline">mustChangePassword</code> →{' '}
            <code className="inline">POST /v1/auth/password/force-change</code>{' '}
            once.
          </p>
          <h3 id="stuck">Still stuck?</h3>
          <p>
            Reproduce with <code className="inline">curl -v</code>, paste{' '}
            <code className="inline">{'{ ok: false, error }'}</code> + status
            into an issue at{' '}
            <code className="inline">github.com/slyxup/stack</code>. Never paste
            tokens, cookies, reset links or secret keys.
          </p>
        </>
      )}

      {slug === 'integration-guide' && (
        <>
          <h2 id="recipes">Source-accurate recipes</h2>
          <p>
            Session transport choices, upgrade instructions, known limitations.
            Confirm installed npm versions before upgrading. Download the
            Markdown for your implementation agent:
          </p>
          <IntegrationGuide />
        </>
      )}
    </div>
  );
}
