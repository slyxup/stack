import { CodeBlock, CopyForLLM } from '../../copy';

const LLM = `# OAuth — Google & GitHub
GET https://auth.slyxup.online/v1/oauth/google        // start flow
GET https://auth.slyxup.online/v1/oauth/github
GET /v1/oauth/callback/:provider?code=...&state=...   // provider callback
// state + PKCE protected, session cookie set on success,
// then redirect to an origin in ALLOWED_REDIRECT_ORIGINS
`;

export default function Page() {
  return (
    <div>
      <div className="fw-head">
        <h1 className="h-doc">OAuth (Google &amp; GitHub)</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p className="prose-p">
        Social sign-in with state + PKCE protection built in. The flow is a browser redirect — pick how you want to
        start it for your framework.
      </p>

      <h2 className="h-sec">Start the flow</h2>
      <CodeBlock
        variants={{
          js: `// Plain redirect works everywhere:
window.location.href = 'https://auth.slyxup.online/v1/oauth/google';`,
          react: `import { SocialButtons } from '@slyxup/ui';

<SocialButtons providers={['google', 'github']} />`,
          nextjs: `// app/sign-in/page.tsx
'use client';
import { SocialButtons } from '@slyxup/ui';
// or start server-side and redirect:
import { redirect } from 'next/navigation';

export function startGoogle() {
  redirect('https://auth.slyxup.online/v1/oauth/google');
}`,
        }}
      />

      <h2 className="h-sec">What happens on callback</h2>
      <CodeBlock>{`https://auth.slyxup.online/v1/oauth/callback/google?code=...&state=...
// 1. state verified (CSRF), code exchanged with PKCE
// 2. user upserted, matched by verified provider email
// 3. HttpOnly slyxup_session cookie set
// 4. 302 -> first origin in ALLOWED_REDIRECT_ORIGINS`}</CodeBlock>

      <h2 className="h-sec">Provider setup</h2>
      <p className="prose-p">
        Two apps per provider: <b>DEV</b> (callback <code className="inl">http://localhost:8787/v1/oauth/callback/&lt;provider&gt;</code>)
        and <b>PROD</b> (<code className="inl">https://auth.slyxup.online/v1/oauth/callback/&lt;provider&gt;</code>).
        Secrets are Workers secrets — never committed.
      </p>
      <CodeBlock copyContent={`wrangler secret put GOOGLE_CLIENT_ID`}>{`wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET`}</CodeBlock>

      <div className="prose-note">
        <b>Account linking:</b> signing in with a provider that shares a verified email with an existing
        email/password account links both identities to one user automatically.
      </div>
    </div>
  );
}
