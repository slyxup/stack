import { Nav, Footer } from '../../components/chrome';
import { DOCS_SIDEBAR } from '../../docs-site/sidebar';

export const metadata = {
  title: 'Documentation — SlyxUp',
  description: 'Complete documentation for SlyxUp Auth platform.',
};

export default function DocsPage() {
  return (
    <>
      <Nav />
      <div className="wrap" style={{ display: 'flex', gap: 40, padding: '48px 24px' }}>
        {/* Sidebar */}
        <aside style={{
          width: 220, flexShrink: 0,
          position: 'sticky', top: 84, alignSelf: 'flex-start',
          maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
        }}>
          {DOCS_SIDEBAR.map((section) => (
            <div key={section.section} style={{ marginBottom: 28 }}>
              <p className="mono" style={{ fontSize: 11, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>{section.section}</p>
              {section.items.map((item) => {
                const hash = `#${item.slug.replace('/docs/', '').replace(/\//g, '-') || 'top'}`;
                return (
                  <a
                    key={item.slug}
                    href={hash}
                    style={{
                      display: 'block', fontSize: 13.5, color: '#7c8195',
                      padding: '5px 0', transition: 'color .15s',
                    }}

                  >
                    {item.title}
                  </a>
                );
              })}
            </div>
          ))}
        </aside>

        {/* Content */}
        <article style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: '"Space Grotesk",sans-serif', fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>
            Documentation
          </h1>
          <p style={{ color: '#7c8195', fontSize: 16, marginBottom: 32 }}>
            Everything you need to integrate SlyxUp Auth into your application.
          </p>

          {/* Quick Start section */}
          <h2 id="quick-start" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 36, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,.06)', scrollMarginTop: 84 }}>
            Quick Start
          </h2>
          <p style={{ color: '#9ca3b8', fontSize: 15, lineHeight: 1.75, marginBottom: 14 }}>
            Get SlyxUp Auth running in your Next.js app in under a minute.
          </p>
          <div className="codeblock" style={{ margin: '16px 0' }}>
{`npx @slyxup/cli login
npx @slyxup/cli project create "My App"
npx @slyxup/cli keys create --project-id <id> --type publishable`}
          </div>

          <h3 style={{ fontSize: 17, fontWeight: 650, marginTop: 28, marginBottom: 12 }}>Install SDKs</h3>
          <div className="codeblock" style={{ margin: '16px 0' }}>
            npm install @slyxup/react @slyxup/ui @slyxup/core
          </div>

          <h3 style={{ fontSize: 17, fontWeight: 650, marginTop: 28, marginBottom: 12 }}>Add Provider</h3>
          <div className="codeblock" style={{ margin: '16px 0' }}>
{`import { SlyxUpProvider } from '@slyxup/react';

<SlyxUpProvider publishableKey="pk_test_xxx">
  <YourApp />
</SlyxUpProvider>`}
          </div>

          <h3 style={{ fontSize: 17, fontWeight: 650, marginTop: 28, marginBottom: 12 }}>Add Sign In</h3>
          <div className="codeblock" style={{ margin: '16px 0' }}>
{`import { SignIn } from '@slyxup/ui';

<SignIn />`}
          </div>

          <h3 style={{ fontSize: 17, fontWeight: 650, marginTop: 28, marginBottom: 12 }}>Read Session (Server)</h3>
          <div className="codeblock" style={{ margin: '16px 0' }}>
{`import { currentUser } from '@slyxup/nextjs/server';

const user = await currentUser();
if (!user) redirect('/sign-in');`}
          </div>

          {/* API Reference */}
          <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 44, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            API Reference
          </h2>

          <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 22, marginBottom: 10, color: '#9fa5fc' }}>Auth</h3>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', border: '1px solid #232635', borderRadius: 10 }}>
            <thead><tr style={{ background: '#12141d', textAlign: 'left' }}>
              <th style={{ padding: '9px 12px', fontWeight: 600 }}>Method</th>
              <th style={{ padding: '9px 12px', fontWeight: 600 }}>Path</th>
              <th style={{ padding: '9px 12px', fontWeight: 600, color: '#7c8195' }}>Description</th>
            </tr></thead>
            <tbody>
              {[
                ['POST', '/v1/auth/sign-up', 'Create user + session'],
                ['POST', '/v1/auth/sign-in', 'Sign in'],
                ['POST', '/v1/auth/sign-out', 'Clear session'],
                ['GET', '/v1/session', 'Current session'],
                ['GET', '/v1/user', 'Full user profile'],
                ['PATCH', '/v1/user', 'Update profile'],
                ['DELETE', '/v1/user', 'Delete account'],
              ].map(([method, path, desc]) => (
                <tr key={path + method} style={{ borderTop: '1px solid #1d2130' }}>
                  <td style={{ padding: '8px 12px' }}><span className="mono" style={{ fontSize: 11, fontWeight: 650, color: method === 'GET' ? '#34d399' : method === 'POST' ? '#a5b4fc' : '#fbbf24' }}>{method}</span></td>
                  <td style={{ padding: '8px 12px', fontFamily: '"JetBrains Mono",monospace', fontSize: 12 }}>{path}</td>
                  <td style={{ padding: '8px 12px', color: '#7c8195' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 28, marginBottom: 10, color: '#9fa5fc' }}>Billing (Paddle)</h3>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', border: '1px solid #232635', borderRadius: 10 }}>
            <thead><tr style={{ background: '#12141d', textAlign: 'left' }}>
              <th style={{ padding: '9px 12px', fontWeight: 600 }}>Method</th>
              <th style={{ padding: '9px 12px', fontWeight: 600 }}>Path</th>
              <th style={{ padding: '9px 12px', fontWeight: 600, color: '#7c8195' }}>Description</th>
            </tr></thead>
            <tbody>
              {[
                ['GET', '/v1/billing/plans', 'List plans'],
                ['POST', '/v1/billing/checkout', 'Create checkout'],
                ['GET', '/v1/billing/subscription', 'Get subscription'],
                ['POST', '/v1/billing/cancel', 'Cancel subscription'],
                ['GET', '/v1/billing/invoices', 'List invoices'],
                ['POST', '/v1/webhooks/paddle', 'Paddle webhook'],
              ].map(([method, path, desc]) => (
                <tr key={path + method} style={{ borderTop: '1px solid #1d2130' }}>
                  <td style={{ padding: '8px 12px' }}><span className="mono" style={{ fontSize: 11, fontWeight: 650, color: method === 'GET' ? '#34d399' : method === 'POST' ? '#a5b4fc' : '#fbbf24' }}>{method}</span></td>
                  <td style={{ padding: '8px 12px', fontFamily: '"JetBrains Mono",monospace', fontSize: 12 }}>{path}</td>
                  <td style={{ padding: '8px 12px', color: '#7c8195' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 28, marginBottom: 10, color: '#9fa5fc' }}>Admin &amp; Management</h3>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', border: '1px solid #232635', borderRadius: 10 }}>
            <thead><tr style={{ background: '#12141d', textAlign: 'left' }}>
              <th style={{ padding: '9px 12px', fontWeight: 600 }}>Method</th>
              <th style={{ padding: '9px 12px', fontWeight: 600 }}>Path</th>
              <th style={{ padding: '9px 12px', fontWeight: 600, color: '#7c8195' }}>Description</th>
            </tr></thead>
            <tbody>
              {[
                ['GET/POST', '/v1/projects', 'Manage projects'],
                ['GET/POST', '/v1/keys', 'Manage API keys'],
                ['POST', '/v1/admin/users/:id/block', 'Block user'],
                ['POST', '/v1/admin/users/:id/unblock', 'Unblock user'],
                ['POST', '/v1/admin/users/:id/role', 'Set role'],
                ['GET', '/v1/audit/logs', 'Audit logs'],
                ['GET/POST/DELETE', '/v1/webhooks/endpoints', 'Webhook endpoints'],
                ['PATCH', '/v1/projects/:id/domains', 'Manage CORS domains'],
                ['POST', '/v1/projects/:id/go-live', 'Upgrade to live'],
              ].map(([method, path, desc]) => (
                <tr key={path + method} style={{ borderTop: '1px solid #1d2130' }}>
                  <td style={{ padding: '8px 12px' }}><span className="mono" style={{ fontSize: 11, fontWeight: 650, color: method.includes('GET') ? '#34d399' : method.includes('DELETE') ? '#f87171' : '#a5b4fc' }}>{method}</span></td>
                  <td style={{ padding: '8px 12px', fontFamily: '"JetBrains Mono",monospace', fontSize: 12 }}>{path}</td>
                  <td style={{ padding: '8px 12px', color: '#7c8195' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>
      <Footer />
    </>
  );
}
