import { CodeBlock, CopyForLLM } from '../../copy';

const LLM = `# @slyxup/core
Framework-agnostic HTTP client. Zero dependencies, ESM, works in
browsers, Node, and Cloudflare Workers.

import { SlyxupClient, UnauthorizedError, RateLimitError } from '@slyxup/core';

const client = new SlyxupClient({ publishableKey: 'pk_test_xxx' });

Auth:      client.auth.signUp / signIn / signOut / resendVerification
Sessions:  client.sessions.get() / list() / revoke() / revokeOthers()
Password:  client.password.change()
Users:     client.users.me() / update() / delete()
Billing:   client.billing.listPlans() (via @slyxup/billing)

Errors: UnauthorizedError (401), SlyxupError (base),
        RateLimitError (429), ValidationError (400)
`;

export default function Page() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: '"Space Grotesk",sans-serif', fontSize: 32, fontWeight: 700 }}>@slyxup/core</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p style={{ color: '#7c8195', marginTop: 8, lineHeight: 1.7 }}>The foundation everything else builds on — a typed HTTP client for the <code>/v1</code> API with a cookie jar that works in browsers and SSR.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Create a client</h2>
      <CodeBlock>{`import { SlyxupClient } from '@slyxup/core';

const client = new SlyxupClient({
  publishableKey: 'pk_test_xxx',
});`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Namespaces</h2>
      <div style={{ border: '1px solid #232635', borderRadius: 12, overflow: 'hidden', marginTop: 12 }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#12141d', textAlign: 'left' }}><th style={{ padding: '10px 14px' }}>Namespace</th><th style={{ padding: '10px 14px', color: '#7c8195' }}>Methods</th></tr></thead>
          <tbody>
            {[
              ['client.auth', 'signUp, signIn, signOut, resendVerification'],
              ['client.sessions', 'get, list, revoke, revokeOthers'],
              ['client.password', 'change'],
              ['client.users', 'me, update, delete'],
            ].map(([ns, m]) => (
              <tr key={ns} style={{ borderTop: '1px solid #1d2130' }}>
                <td style={{ padding: '8px 14px', fontFamily: '"JetBrains Mono",monospace', fontSize: 12 }}>{ns}</td>
                <td style={{ padding: '8px 14px', color: '#7c8195' }}>{m}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Typed errors</h2>
      <CodeBlock>{`import { UnauthorizedError, RateLimitError } from '@slyxup/core';

try {
  await client.auth.signIn({ email, password });
} catch (e) {
  if (e instanceof UnauthorizedError) showBadCredentials();
  if (e instanceof RateLimitError)   showTooManyAttempts(); // 429
}`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Self-hosted base URL</h2>
      <CodeBlock>{`const client = new SlyxupClient({
  publishableKey: 'pk_live_xxx',
  apiUrl: 'https://auth.example.com', // your own Worker
});`}</CodeBlock>
    </div>
  );
}
