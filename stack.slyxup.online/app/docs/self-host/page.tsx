import { CodeBlock, CopyForLLM } from '../copy';

const LLM = `# Self-Host SlyxUp Stack
git clone https://github.com/slyxup/stack.git
cp .env.example auth.slyxup.online/.dev.vars
pnpm install
pnpm --filter auth.slyxup.online db:migrate:local
pnpm --filter auth.slyxup.online dev
# First admin: POST /v1/setup/bootstrap with BOOTSTRAP_SECRET
`;

export default function SelfHost() {
  return (
    <div>
      <div className="fw-head">
        <h1 className="h-doc">Self-Host</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p className="prose-p" style={{ fontSize: 15.5, maxWidth: 720 }}>
        The hosted <code className="inl">stack.slyxup.online</code> is a <b>personal single-tenant</b> instance — docs and SDK are
        public, but the dashboard is owner-only. Everyone else should self-host. You get the exact same code, your own
        Cloudflare D1, KV, R2, Brevo sender, and OAuth apps. No vendor lock-in.
      </p>

      <div
        style={{
          margin: '18px 0 28px',
          padding: 16,
          background: 'rgba(245,158,11,.08)',
          border: '1px solid rgba(245,158,11,.22)',
          borderRadius: 12,
        }}
      >
        <p style={{ fontWeight: 700, marginBottom: 6 }}>Live instance is private</p>
        <p style={{ fontSize: 13.5, color: '#a1a6bf', lineHeight: 1.5 }}>
          <code className="inl">https://stack.slyxup.online/dashboard</code> and{' '}
          <code className="inl">https://auth.slyxup.online/v1/projects</code> require the owner&apos;s admin session.
          Non-owner logins get{' '}
          <code className="inl">403 Developer registration disabled — self-host instead</code>. Use the docs, SDK, and quick
          start on this site; then deploy your own Worker.
        </p>
      </div>

      <h2 className="h-sec">1. Clone & install</h2>
      <CodeBlock>{`git clone https://github.com/slyxup/stack.git slyxup-stack
cd slyxup-stack/stack
pnpm install
cp .env.example auth.slyxup.online/.dev.vars
# edit auth.slyxup.online/.dev.vars — BREVO_API_KEY, GOOGLE_CLIENT_ID, etc.`}</CodeBlock>

      <h2 className="h-sec">2. Create D1 + run migrations</h2>
      <CodeBlock>{`# create D1 (or use existing id in wrangler.jsonc)
wrangler d1 create slyxup_auth
# paste database_id into auth.slyxup.online/wrangler.jsonc
pnpm --filter auth.slyxup.online db:generate
pnpm --filter auth.slyxup.online db:migrate:local
pnpm --filter auth.slyxup.online db:migrate:remote  # when deploying`}</CodeBlock>

      <h2 className="h-sec">3. Configure single-tenant + bootstrap secret</h2>
      <p className="prose-p">
        In <code className="inl">auth.slyxup.online/wrangler.jsonc</code> <code className="inl">vars</code>:
      </p>
      <CodeBlock>{`{
  "vars": {
    "SINGLE_TENANT_MODE": "true",
    "ALLOW_PUBLIC_DEVELOPER_REGISTRATION": "false",
    "BOOTSTRAP_ADMIN_EMAIL": "you@example.com",
    "APP_URL": "https://your-stack.pages.dev",
    "API_URL": "https://your-auth.workers.dev"
  }
}`}</CodeBlock>
      <p className="prose-p">
        Then set the bootstrap secret (never commit it):
      </p>
      <CodeBlock>{`openssl rand -hex 32
wrangler secret put BOOTSTRAP_SECRET --config auth.slyxup.online/wrangler.jsonc`}</CodeBlock>

      <h2 className="h-sec">4. Bootstrap the first admin (one-time)</h2>
      <p className="prose-p">
        Only works when the DB has zero users. Creates admin (auto-verified), developer row, default project{' '}
        <code className="inl">slyxup-platform</code> and initial <code className="inl">pk_live / sk_live</code> keys — plus a 7-day
        session cookie.
      </p>
      <CodeBlock>{`curl -X POST https://your-auth.workers.dev/v1/setup/bootstrap \\
  -H 'Content-Type: application/json' \\
  -H 'X-Bootstrap-Token: $BOOTSTRAP_SECRET' \\
  -d '{"email":"you@example.com","password":"StrongPass123!","name":"Owner"}'

# response: { ok:true, user, project:{slug, id}, keys:{publishable, secret} }`}</CodeBlock>
      <p className="prose-p">
        Save the returned <code className="inl">keys.publishable</code> as{' '}
        <code className="inl">NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY</code> for your stack front-end. The CLI also works:
      </p>
      <CodeBlock>{`npx @slyxup/cli login -e you@example.com -p StrongPass123 --api-url https://your-auth.workers.dev --json`}</CodeBlock>

      <h2 className="h-sec">5. Cookie isolation (per-platform)</h2>
      <p className="prose-p">
        Each platform now keeps its own session — stack dashboard and your apps don&apos;t overwrite each other&apos;s cookies:
      </p>
      <ul style={{ margin: '10px 0 18px 18px', color: '#a1a6bf', fontSize: 13.5, lineHeight: 1.6 }}>
        <li>
          Server sets a <code className="inl">__Host-slyxup_session</code> host-only cookie (no{' '}
          <code className="inl">Domain=.slyxup.online</code>). Host-only = isolated per Worker host.
        </li>
        <li>
          <code className="inl">Authorization: Bearer &lt;token&gt;</code> from <code className="inl">localStorage</code> is
          preferred over the cookie — each app&apos;s origin stores its own token, so simultaneous logins don&apos;t collide.
        </li>
        <li>
          Your app can safely log in as a project end-user (with <code className="inl">X-Publishable-Key</code>) in one tab
          while the dashboard stays signed in as admin in another.
        </li>
      </ul>

      <h2 className="h-sec">6. Default password rotation</h2>
      <p className="prose-p">
        If you bootstrap with a well-known default like <code className="inl">admin / changeme / password</code>, the account
        is flagged <code className="inl">mustChangePassword</code>. Sign-in returns{' '}
        <code className="inl">403 PASSWORD_CHANGE_REQUIRED</code> until you call:
      </p>
      <CodeBlock>{`curl -X POST https://your-auth.workers.dev/v1/auth/password/force-change \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"you@example.com","oldPassword":"admin","newPassword":"NewStrong!123"}'`}</CodeBlock>
      <p className="prose-p">After change, all other sessions are revoked.</p>

      <h2 className="h-sec">7. After bootstrap</h2>
      <ul style={{ margin: '10px 0 18px 18px', color: '#a1a6bf', fontSize: 13.5, lineHeight: 1.6 }}>
        <li>
          <code className="inl">POST /v1/auth/sign-up</code> without a publishable key is rejected after the first user —
          platform sign-ups are closed. Project users sign up <i>with</i> <code className="inl">pk_...</code> as usual.
        </li>
        <li>
          <code className="inl">POST /v1/developers/me</code> / <code className="inl">/v1/projects</code> is admin-only when{' '}
          <code className="inl">SINGLE_TENANT_MODE=true</code>. Non-admin gets self-host instructions.
        </li>
        <li>
          Check bootstrap status anytime: <code className="inl">GET /v1/setup/status</code> →{' '}
          <code className="inl">{`{ needsBootstrap, singleTenant, bootstrapEmail }`}</code>.
        </li>
      </ul>

      <div className="prose-note">
        <b>Tip:</b> Keep docs public forever — they live on <code className="inl">stack.slyxup.online</code> for everyone.
        Only the dashboard is gated. Link self-hosters here instead of inviting them to your live Worker.
      </div>
    </div>
  );
}
