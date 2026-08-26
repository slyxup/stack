import { Nav, Footer } from '../../components/chrome';
import { DOCS_SIDEBAR } from '../../docs-site/sidebar';
import { CopyForLLM, CodeBlock } from './copy';

export const metadata = {
  title: 'Documentation — SlyxUp',
  description: 'Complete documentation for SlyxUp Auth platform — SDKs, API, self-hosting.',
};

function Section({ id, kicker, title, subtitle, children }: { id: string; kicker: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 84, marginBottom: 48 }}>
      <p className="mono" style={{ fontSize: 11, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>{kicker}</p>
      <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>{title}</h2>
      <p style={{ color: '#7c8195', fontSize: 15, lineHeight: 1.7, marginBottom: 16 }}>{subtitle}</p>
      {children}
    </section>
  );
}

export default function DocsPage() {
  return (
    <>
      <Nav />
      <div className="wrap" style={{ display: 'flex', gap: 40, padding: '48px 24px' }}>
        <aside style={{ width: 240, flexShrink: 0, position: 'sticky', top: 84, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
          {DOCS_SIDEBAR.map((section) => (
            <div key={section.section} style={{ marginBottom: 28 }}>
              <p className="mono" style={{ fontSize: 11, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>{section.section}</p>
              {section.items.map((item) => {
                const hash = `#${item.slug.replace('/docs/', '').replace(/\//g, '-') || 'top'}`;
                return (
                  <a key={item.slug} href={hash} style={{ display: 'block', fontSize: 13.5, color: '#7c8195', padding: '5px 0' }}>
                    {item.title}
                  </a>
                );
              })}
            </div>
          ))}
        </aside>

        <article style={{ flex: 1, minWidth: 0, maxWidth: 720 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h1 style={{ fontFamily: '"Space Grotesk",sans-serif', fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em' }}>Documentation</h1>
            <CopyForLLM content={`# SlyxUp Docs\nhttps://stack.slyxup.online/docs\n${DOCS_SIDEBAR.map((s) => `## ${s.section}\n${s.items.map((i) => `- ${i.title}: ${i.desc} (${i.slug})`).join('\n')}`).join('\n')}`} />
          </div>
          <p style={{ color: '#7c8195', fontSize: 16, marginBottom: 32 }}>Everything you need to integrate SlyxUp Auth — from 30-second quick start to self-hosting on your own Cloudflare account. Copy any section for LLMs with one click.</p>

          <Section id="top" kicker="Getting Started" title="Introduction" subtitle="SlyxUp is an open-source auth platform that runs on Cloudflare Workers + D1. It's Clerk meets Supabase Auth, but self-hostable and edge-native.">
            <p style={{ color: '#9ca3b8', fontSize: 14, lineHeight: 1.7 }}>Choose your integration: <code>@slyxup/react</code> for any React app, <code>@slyxup/nextjs</code> for App Router SSR, or <code>@slyxup/ui</code> for prebuilt cards. All share the same <code>auth.slyxup.online</code> API or your self-hosted <code>auth.example.com</code>.</p>
          </Section>

          <Section id="quick-start" kicker="Getting Started" title="Quick Start — 30 seconds" subtitle="The fastest way to get working auth.">
            <CodeBlock copyContent={`npx @slyxup/cli login
npx @slyxup/cli project create "My App" --slug my-app
npx @slyxup/cli keys create --project-id <id> --type publishable`}>{`npx @slyxup/cli login
npx @slyxup/cli project create "My App" --slug my-app
npx @slyxup/cli keys create --project-id <id> --type publishable`}</CodeBlock>
            <CodeBlock copyContent={`npm install @slyxup/react @slyxup/ui
import { SlyxUpProvider } from '@slyxup/react';
<SlyxUpProvider publishableKey="pk_test_xxx"><SignIn /></SlyxUpProvider>`}>{`npm install @slyxup/react @slyxup/ui
import { SlyxUpProvider } from '@slyxup/react';
<SlyxUpProvider publishableKey="pk_test_xxx"><SignIn /></SlyxUpProvider>`}</CodeBlock>
          </Section>

          <Section id="installation" kicker="Getting Started" title="Installation" subtitle="Pick the packages you need. Tree-shakable ESM, works in browsers, Node, and Workers.">
            <CodeBlock copyContent={`npm install @slyxup/core
npm install @slyxup/react @slyxup/core
npm install @slyxup/nextjs
npm install @slyxup/ui @slyxup/react
npm install @slyxup/billing
npm install -g @slyxup/cli`}>{`npm install @slyxup/core          # HTTP client
npm install @slyxup/react          # hooks + provider
npm install @slyxup/nextjs         # server helpers + middleware
npm install @slyxup/ui             # SignIn/SignUp etc.
npm install @slyxup/billing        # BillingClient
npm install -g @slyxup/cli         # CLI`}</CodeBlock>
          </Section>

          <Section id="auth-email" kicker="Authentication" title="Email & Password" subtitle="Classic flow with secure hashing, verification, and HttpOnly sessions.">
            <CodeBlock copyContent={`const client = new SlyxupClient({ publishableKey: 'pk_test_xxx' });
await client.auth.signUp({ email, password, firstName });
await client.auth.signIn({ email, password });
const { user } = await client.sessions.get();`}>{`const client = new SlyxupClient({ publishableKey: 'pk_test_xxx' });
await client.auth.signUp({ email, password, firstName });
await client.auth.signIn({ email, password });
const { user } = await client.sessions.get();`}</CodeBlock>
            <p style={{ color: '#7c8195', fontSize: 13, marginTop: 8 }}>Validation: <code>email: z.string().email()</code> — <code>password: z.string().min(8).max(128)</code>. Rate limited 20/min per IP.</p>
          </Section>

          <Section id="auth-oauth" kicker="Authentication" title="OAuth — Google & GitHub" subtitle="Two apps per provider (DEV localhost + PROD auth.slyxup.online) — state + PKCE protected.">
            <CodeBlock copyContent={`// Client: redirect
window.location.href = 'https://auth.slyxup.online/v1/oauth/google';
// or
<SocialButtons providers={['google','github']} />
// Callback: https://auth.slyxup.online/v1/oauth/callback/google?code=...&state=...
// → sets slyxup_session cookie → redirects to ALLOWED_REDIRECT_ORIGINS`}>{`// Client: redirect
window.location.href = 'https://auth.slyxup.online/v1/oauth/google';
// or
<SocialButtons providers={['google','github']} />
// Callback: https://auth.slyxup.online/v1/oauth/callback/google?code=...&state=...
// → sets slyxup_session cookie → redirects to ALLOWED_REDIRECT_ORIGINS`}</CodeBlock>
          </Section>

          <Section id="auth-sessions" kicker="Authentication" title="Sessions" subtitle="DB-backed HttpOnly Secure SameSite=Lax cookies, 7-day expiry, crypto-random tokens, KV cache.">
            <CodeBlock copyContent={`'use client';
import { useSession } from '@slyxup/react';
const { session } = useSession(); // { id, expiresAt }

// Next.js server
import { auth } from '@slyxup/nextjs/server';
const session = await auth(); // null if not signed in
if (!session) redirect('/sign-in');`}>{`'use client';
import { useSession } from '@slyxup/react';
const { session } = useSession(); // { id, expiresAt }

// Next.js server
import { auth } from '@slyxup/nextjs/server';
const session = await auth(); // null if not signed in
if (!session) redirect('/sign-in');`}</CodeBlock>
          </Section>

          <Section id="auth-users" kicker="Authentication" title="User Management" subtitle="Profiles, blocking, roles — admin only.">
            <CodeBlock copyContent={`PATCH /v1/user -> { firstName, lastName, avatarUrl }
DELETE /v1/user -> deletes user + cascade sessions
POST /v1/admin/users/:id/block { reason } -> blocks + revokes sessions
POST /v1/admin/users/:id/role { role: 'user'|'admin' }`}>{`PATCH /v1/user -> { firstName, lastName, avatarUrl }
DELETE /v1/user -> deletes user + cascade sessions
POST /v1/admin/users/:id/block { reason } -> blocks + revokes sessions
POST /v1/admin/users/:id/role { role: 'user'|'admin' }`}</CodeBlock>
          </Section>

          <Section id="billing" kicker="Billing" title="Billing — Paddle" subtitle="Plans, checkout, subscriptions, invoices, webhooks — full SaaS billing on Paddle.">
            <CodeBlock copyContent={`import { BillingClient } from '@slyxup/billing';
const billing = new BillingClient();
const plans = await billing.listPlans(projectId);
const url = await billing.getCheckoutUrl(planId, sessionToken);
// redirect to url → Paddle → webhook creates subscription
// Webhook: POST /v1/webhooks/paddle { event_type: 'subscription.created' }`}>{`import { BillingClient } from '@slyxup/billing';
const billing = new BillingClient();
const plans = await billing.listPlans(projectId);
const url = await billing.getCheckoutUrl(planId, sessionToken);
// redirect to url → Paddle → webhook creates subscription
// Webhook: POST /v1/webhooks/paddle { event_type: 'subscription.created' }`}</CodeBlock>
          </Section>

          <Section id="sdk-core" kicker="SDK Reference" title="@slyxup/core" subtitle="Framework-agnostic HTTP client with cookie jar for Node/SSR.">
            <CodeBlock copyContent={`import { SlyxupClient, UnauthorizedError } from '@slyxup/core';
const client = new SlyxupClient({ publishableKey: 'pk_test_xxx' });
await client.auth.signIn({ email, password });
const me = await client.users.me();
await client.users.update({ firstName: 'Ada' });`}>{`import { SlyxupClient, UnauthorizedError } from '@slyxup/core';
const client = new SlyxupClient({ publishableKey: 'pk_test_xxx' });
await client.auth.signIn({ email, password });
const me = await client.users.me();
await client.users.update({ firstName: 'Ada' });`}</CodeBlock>
          </Section>

          <Section id="sdk-react" kicker="SDK Reference" title="@slyxup/react" subtitle="Provider + hooks, auto-refreshes every 5 min.">
            <CodeBlock copyContent={`<SlyxUpProvider publishableKey="pk_test_xxx"><App /></SlyxUpProvider>
const { isLoaded, isSignedIn, signIn, signOut } = useAuth();
const { user } = useUser();
const { session } = useSession();
const { plans } = usePlans(projectId); // billing hook`}>{`<SlyxUpProvider publishableKey="pk_test_xxx"><App /></SlyxUpProvider>
const { isLoaded, isSignedIn, signIn, signOut } = useAuth();
const { user } = useUser();
const { session } = useSession();
const { plans } = usePlans(projectId); // billing hook`}</CodeBlock>
          </Section>

          <Section id="api-auth" kicker="API Reference" title="Auth API" subtitle="All auth endpoints — Zod validated, rate limited, CORS localhost + custom domains (test vs live).">
            <div style={{ border: '1px solid #232635', borderRadius: 12, overflow: 'hidden', marginTop: 12 }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#12141d', textAlign: 'left' }}><th style={{ padding: '10px 14px' }}>Method</th><th style={{ padding: '10px 14px' }}>Path</th><th style={{ padding: '10px 14px', color: '#7c8195' }}>Description</th></tr></thead>
                <tbody>
                  {[
                    ['POST', '/v1/auth/sign-up', 'Create user + session'],
                    ['POST', '/v1/auth/sign-in', 'Sign in'],
                    ['POST', '/v1/auth/sign-out', 'Clear session'],
                    ['GET', '/v1/session', 'Current session'],
                    ['GET', '/v1/user', 'Full user'],
                    ['PATCH', '/v1/user', 'Update profile'],
                    ['DELETE', '/v1/user', 'Delete account'],
                    ['POST', '/v1/verification/verify', 'Verify email'],
                    ['POST', '/v1/password/forgot', 'Forgot password'],
                    ['POST', '/v1/password/reset', 'Reset password'],
                    ['GET', '/v1/oauth/google', 'Start Google OAuth'],
                    ['GET', '/v1/oauth/callback/google', 'OAuth callback'],
                  ].map(([m, p, d]) => (
                    <tr key={p + m} style={{ borderTop: '1px solid #1d2130' }}>
                      <td style={{ padding: '8px 14px' }}><span className="mono" style={{ fontSize: 11, fontWeight: 700, color: m === 'GET' ? '#34d399' : '#a5b4fc' }}>{m}</span></td>
                      <td style={{ padding: '8px 14px', fontFamily: '"JetBrains Mono",monospace', fontSize: 12 }}>{p}</td>
                      <td style={{ padding: '8px 14px', color: '#7c8195' }}>{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div style={{ marginTop: 48, padding: 20, background: 'rgba(99,102,241,.06)', border: '1px solid rgba(99,102,241,.15)', borderRadius: 12, textAlign: 'center' }}>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>Want the whole docs as markdown for an LLM?</p>
            <CopyForLLM content={`# SlyxUp Docs\nhttps://stack.slyxup.online/docs\n${DOCS_SIDEBAR.map((s) => `## ${s.section}\n${s.items.map((i) => `- ${i.title}: ${i.desc} (${i.slug})`).join('\n')}`).join('\n')}`} />
            <p style={{ fontSize: 12, color: '#7c8195', marginTop: 8 }}>This page + all code blocks — one click, paste into ChatGPT/Claude.</p>
          </div>
        </article>
      </div>
      <Footer />
    </>
  );
}
