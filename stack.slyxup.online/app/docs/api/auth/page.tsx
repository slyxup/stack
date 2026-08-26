import { CodeBlock, CopyForLLM } from '../../copy';

const LLM = `# Auth API
Base: https://auth.slyxup.online/v1
All bodies JSON. Zod validated. Rate limited 20/min per IP on auth routes.
Session cookie: slyxup_session (HttpOnly, Secure, SameSite=Lax).

POST   /v1/auth/sign-up           { email, password, firstName? }
POST   /v1/auth/sign-in           { email, password }
POST   /v1/auth/sign-out
GET    /v1/session                -> { session, user }
GET    /v1/user                   -> full user
PATCH  /v1/user                   { firstName?, lastName?, avatarUrl? }
DELETE /v1/user                   -> delete account
POST   /v1/verification/verify    { code }
POST   /v1/password/forgot        { email }
POST   /v1/password/reset         { token, password }
GET    /v1/oauth/:provider        -> redirect to provider
GET    /v1/oauth/callback/:provider
`;

export default function Page() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: '"Space Grotesk",sans-serif', fontSize: 32, fontWeight: 700 }}>Auth API</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p style={{ color: '#7c8195', marginTop: 8, lineHeight: 1.7 }}>REST endpoints under <code>https://auth.slyxup.online/v1</code>. All requests/responses are JSON; sessions ride in an HttpOnly cookie — no bearer tokens in browser storage.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Endpoints</h2>
      <div style={{ border: '1px solid #232635', borderRadius: 12, overflow: 'hidden', marginTop: 12 }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#12141d', textAlign: 'left' }}><th style={{ padding: '10px 14px' }}>Method</th><th style={{ padding: '10px 14px' }}>Path</th><th style={{ padding: '10px 14px', color: '#7c8195' }}>Description</th></tr></thead>
          <tbody>
            {[
              ['POST', '/v1/auth/sign-up', 'Create user + session'],
              ['POST', '/v1/auth/sign-in', 'Sign in'],
              ['POST', '/v1/auth/sign-out', 'Revoke session + clear cookie'],
              ['GET', '/v1/session', 'Current session + user'],
              ['GET', '/v1/user', 'Full profile'],
              ['PATCH', '/v1/user', 'Update profile'],
              ['DELETE', '/v1/user', 'Delete account (cascades)'],
              ['POST', '/v1/verification/verify', 'Verify email with code'],
              ['POST', '/v1/password/forgot', 'Send reset email'],
              ['POST', '/v1/password/reset', 'Reset with token'],
              ['POST', '/v1/password/change', 'Change password (authed)'],
              ['GET', '/v1/oauth/google', 'Start Google OAuth'],
              ['GET', '/v1/oauth/github', 'Start GitHub OAuth'],
            ].map(([m, p, d]) => (
              <tr key={p + m} style={{ borderTop: '1px solid #1d2130' }}>
                <td style={{ padding: '8px 14px' }}><span className="mono" style={{ fontSize: 11, fontWeight: 700, color: m === 'GET' ? '#34d399' : m === 'DELETE' ? '#f87171' : '#a5b4fc' }}>{m}</span></td>
                <td style={{ padding: '8px 14px', fontFamily: '"JetBrains Mono",monospace', fontSize: 12 }}>{p}</td>
                <td style={{ padding: '8px 14px', color: '#7c8195' }}>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Example</h2>
      <CodeBlock>{`curl -X POST https://auth.slyxup.online/v1/auth/sign-in \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"ada@example.com","password":"password123"}'
# 200 -> Set-Cookie: slyxup_session=...; HttpOnly; Secure`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Errors</h2>
      <p style={{ color: '#9ca3b8', fontSize: 14, lineHeight: 1.7 }}><code>400</code> validation · <code>401</code> bad credentials/expired session · <code>403</code> blocked · <code>429</code> rate limit (20/min per IP) · errors are always <code>{`{ "error": { "code", "message" } }`}</code>.</p>
    </div>
  );
}
