import { CodeBlock, CopyForLLM } from '../../copy';

const LLM = `# Management API
Projects, API keys, custom domains. Authenticate by signing in
(POST /v1/auth/sign-in) and sending the session token as
Authorization: Bearer <sessionToken>.

POST   /v1/projects                    { name, slug }
GET    /v1/projects                    -> your projects
GET    /v1/projects/:id                -> single project
POST   /v1/keys                        { projectId, name, type, environment }
GET    /v1/keys?projectId=             -> keys for a project
DELETE /v1/keys/:id                    -> revoke key
PATCH  /v1/projects/:id/domains        { action: 'add'|'remove', domain }
GET    /v1/projects/:id/domains        -> list domains
POST   /v1/projects/:id/go-live        -> upgrade test to live

# Project-scoped user management (dashboard model)
GET    /v1/projects/:id/users                 -> users in this project
GET    /v1/projects/:id/users/:userId         -> full user detail
PATCH  /v1/projects/:id/users/:userId         { firstName, lastName, role, blocked }
POST   /v1/projects/:id/users/:userId/block    -> block + revoke sessions
POST   /v1/projects/:id/users/:userId/unblock
DELETE /v1/projects/:id/users/:userId          -> remove user from project

Key formats: pk_test_/pk_live_ (frontend), sk_test_/sk_live_ (server).
`;

export default function Page() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: '"Space Grotesk",sans-serif', fontSize: 32, fontWeight: 700 }}>Management API</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p style={{ color: '#7c8195', marginTop: 8, lineHeight: 1.7 }}>Manage projects, API keys, and custom auth domains. This is what <code>@slyxup/cli</code> talks to — authenticate by signing in (<code>POST /v1/auth/sign-in</code>) and sending the session token as <code>Authorization: Bearer {'<sessionToken>'}</code>.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Endpoints</h2>
      <div style={{ border: '1px solid #232635', borderRadius: 12, overflow: 'hidden', marginTop: 12 }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#12141d', textAlign: 'left' }}><th style={{ padding: '10px 14px' }}>Method</th><th style={{ padding: '10px 14px' }}>Path</th><th style={{ padding: '10px 14px', color: '#7c8195' }}>Description</th></tr></thead>
          <tbody>
            {[
              ['POST', '/v1/projects', 'Create project'],
              ['GET', '/v1/projects', 'List your projects'],
              ['GET', '/v1/projects/:id', 'Get project details'],
              ['POST', '/v1/keys', 'Create pk_/sk_ key'],
              ['GET', '/v1/keys?projectId=', 'List keys for a project'],
              ['DELETE', '/v1/keys/:id', 'Revoke key'],
              ['PATCH', '/v1/projects/:id/domains', 'Add/remove CORS domain'],
              ['GET', '/v1/projects/:id/domains', 'List project domains'],
              ['POST', '/v1/projects/:id/go-live', 'Upgrade test to live'],
              ['GET', '/v1/projects/:id/users', 'List users in this project'],
              ['GET', '/v1/projects/:id/users/:userId', 'User detail (profile, sessions, oauth)'],
              ['PATCH', '/v1/projects/:id/users/:userId', 'Edit user (name, role, block)'],
              ['POST', '/v1/projects/:id/users/:userId/block', 'Block user + revoke sessions'],
              ['POST', '/v1/projects/:id/users/:userId/unblock', 'Unblock user'],
              ['DELETE', '/v1/projects/:id/users/:userId', 'Remove user from project'],
            ].map(([m, p, d]) => (
              <tr key={p + m} style={{ borderTop: '1px solid #1d2130' }}>
                <td style={{ padding: '8px 14px' }}><span className="mono" style={{ fontSize: 11, fontWeight: 700, color: m === 'GET' ? '#34d399' : m === 'DELETE' ? '#f87171' : 'var(--accent)' }}>{m}</span></td>
                <td style={{ padding: '8px 14px', fontFamily: '"JetBrains Mono",monospace', fontSize: 12 }}>{p}</td>
                <td style={{ padding: '8px 14px', color: '#7c8195' }}>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Example</h2>
      <CodeBlock>{`curl https://auth.slyxup.online/v1/projects \\
  -H "Authorization: Bearer <sessionToken>"`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Keys &amp; environments</h2>
      <p style={{ color: '#9ca3b8', fontSize: 14, lineHeight: 1.7 }}>
        Every project has test and live key pairs. Publishable keys (<code>pk_</code>) are safe in frontend code; secret keys (<code>sk_</code>) are server-only and shown once at creation. Test and live keys hit isolated CORS origin sets — a <code>pk_test</code> key simply won&apos;t work against a live domain.
      </p>
    </div>
  );
}
