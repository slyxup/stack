import { CopyForLLM, CodeBlock } from '../copy';

const LLM = `# Installation
npm install @slyxup/core @slyxup/react @slyxup/ui
# Next.js: npm install @slyxup/nextjs
# CLI: npm install -g @slyxup/cli
`;

export default function Installation() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: '"Space Grotesk",sans-serif', fontSize: 32, fontWeight: 700 }}>Installation</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p style={{ color: '#7c8195', marginTop: 8, lineHeight: 1.7 }}>Pick the packages you need. All are ESM, tree-shakable, and work in browsers, Node, and Workers.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Core</h2>
      <CodeBlock>{`npm install @slyxup/core
# provides SlyxupClient, errors, types`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>React</h2>
      <CodeBlock>{`npm install @slyxup/react @slyxup/core
# peer: react ^18 || ^19`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Next.js</h2>
      <CodeBlock>{`npm install @slyxup/nextjs
# peer: next ^14 || ^15`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>UI</h2>
      <CodeBlock>{`npm install @slyxup/ui @slyxup/react
# 8 components, zero CSS deps, DM Sans auto-injected`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>CLI</h2>
      <CodeBlock>{`npm install -g @slyxup/cli
slyxup --help`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Billing</h2>
      <CodeBlock>{`npm install @slyxup/billing
# BillingClient + usePlans/useSubscription hooks`}</CodeBlock>

      <div style={{ marginTop: 32, padding: 16, background: 'rgba(99,102,241,.06)', border: '1px solid rgba(99,102,241,.15)', borderRadius: 12 }}>
        <p style={{ fontSize: 14, lineHeight: 1.6 }}><strong>Tip:</strong> Use <code>pnpm add</code> or <code>yarn add</code> — all packages are <code>workspace:*</code> compatible for monorepos.</p>
      </div>
    </div>
  );
}
