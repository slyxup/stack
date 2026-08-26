import { CopyForLLM, CodeBlock } from '../copy';

const LLM = `# Installation
npm install @slyxup/core @slyxup/react @slyxup/ui
# Next.js: npm install @slyxup/nextjs
# CLI: npm install -g @slyxup/cli
`;

export default function Installation() {
  return (
    <div>
      <div className="fw-head">
        <h1 className="h-doc">Installation</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p className="prose-p">
        Pick the packages for your stack — ESM, tree-shakable, works in browsers, Node, and Cloudflare Workers.
        The tab below installs exactly what each framework needs.
      </p>

      <h2 className="h-sec">Packages</h2>
      <CodeBlock
        variants={{
          js: `npm install @slyxup/core            # SlyxupClient, errors, types`,
          react: `npm install @slyxup/react @slyxup/core   # hooks + provider (peer: react ^18 || ^19)`,
          nextjs: `npm install @slyxup/nextjs @slyxup/core  # server helpers + middleware (peer: next ^14 || ^15)`,
        }}
      />
      <CodeBlock>{`# Optional extras, any framework:
npm install @slyxup/ui               # prebuilt SignIn/SignUp/UserButton (needs @slyxup/react)
npm install @slyxup/billing          # BillingClient + plans/subscriptions
npm install -g @slyxup/cli           # projects, keys, env, doctor`}</CodeBlock>

      <h2 className="h-sec">What each package gives you</h2>
      <div style={{ border: '1px solid #232635', borderRadius: 12, overflow: 'hidden', margin: '14px 0 24px' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#12141d', textAlign: 'left' }}>
              <th style={{ padding: '10px 14px' }}>Package</th>
              <th style={{ padding: '10px 14px', color: '#7c8195' }}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['@slyxup/core', 'Typed HTTP client, cookie jar, error classes'],
              ['@slyxup/react', 'Provider, useAuth/useUser/useSession, auto-refresh'],
              ['@slyxup/nextjs', 'Server auth(), middleware, App Router helpers'],
              ['@slyxup/ui', 'Drop-in SignIn, SignUp, SocialButtons, UserButton'],
              ['@slyxup/billing', 'Paddle checkout, plans, subscription state'],
              ['@slyxup/cli', 'login, init, project/keys/env management'],
            ].map(([p, d]) => (
              <tr key={p} style={{ borderTop: '1px solid #1d2130' }}>
                <td style={{ padding: '8px 14px', fontFamily: '"JetBrains Mono",monospace', fontSize: 12 }}>{p}</td>
                <td style={{ padding: '8px 14px', color: '#7c8195' }}>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="h-sec">Environment variable</h2>
      <CodeBlock>{`# .env.local (or .env for Vite with VITE_ prefix)
NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY=pk_test_xxx`}</CodeBlock>

      <div className="prose-note">
        <b>Monorepo?</b> All packages are workspace-compatible — swap <code className="inl">npm install</code> for{' '}
        <code className="inl">pnpm add</code> / <code className="inl">yarn add</code>.
      </div>
    </div>
  );
}
