import { CodeBlock, CopyForLLM } from '../../copy';

const LLM = `# Management API
Projects, API keys, custom domains. Authenticated with the sk_ secret
key from the CLI login (Authorization: Bearer sk_test_...).

POST   /v1/projects                    { name, slug }
GET    /v1/projects                    -> your projects
DELETE /v1/projects/:id
POST   /v1/projects/:id/keys           { type: 'publishable' | 'secret' }
GET    /v1/projects/:id/keys           -> keys (secret keys masked)
DELETE /v1/projects/:id/keys/:keyId
PUT    /v1/projects/:id/domains        { hostname }  # auth.example.com
GET    /v1/projects/:id/members

Key formats: pk_test_/pk_live_ (frontend), sk_test_/sk_live_ (server).
`;

export default function Page() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: '"Space Grotesk",sans-serif', fontSize: 32, fontWeight: 700 }}>Management API</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p style={{ color: '#7c8195', marginTop: 8, lineHeight: 1.7 }}>Manage projects, API keys, and custom auth domains. This is what <code>@slyxup/cli</code> talks to — authenticate with a secret key (<code>sk_…</code>) as a bearer token.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Endpoints</h2>
      <div style={{ border: '1px solid #232635', borderRadius: 12, overflow: 'hidden', marginTop: 12 }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#12141d', textAlign: 'left' }}><th style={{ padding: '10px 14px' }}>Method</th><th style={{ padding: '10px 14px' }}>Path</th><th style={{ padding: '10px 14px', color: '#7c8195' }}>Description</th></tr></thead>
          <tbody>
            {[
              ['POST', '/v1/projects', 'Create project'],
              ['GET', '/v1/projects', 'List your projects'],
              ['DELETE', '/v1/projects/:id', 'Delete project'],
              ['POST', '/v1/projects/:id/keys', 'Create pk_/sk_ key'],
              ['GET', '/v1/projects/:id/keys', 'List keys (secrets masked)'],
              ['DELETE', '/v1/projects/:id/keys/:keyId', 'Revoke key'],
              ['PUT', '/v1/projects/:id/domains', 'Add custom auth domain'],
              ['GET', '/v1/projects/:id/members', 'List project members'],
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
      <CodeBlock>{`curl https://auth.slyxup.online/v1/projects \\
  -H "Authorization: Bearer sk_test_xxx"`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Keys &amp; environments</h2>
      <p style={{ color: '#9ca3b8', fontSize: 14, lineHeight: 1.7 }}>
        Every project has test and live key pairs. Publishable keys (<code>pk_</code>) are safe in frontend code; secret keys (<code>sk_</code>) are server-only and shown once at creation. Test and live keys hit isolated CORS origin sets — a <code>pk_test</code> key simply won&apos;t work against a live domain.
      </p>
    </div>
  );
}
