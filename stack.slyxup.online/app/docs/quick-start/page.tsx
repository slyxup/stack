import { CodeBlock, CopyForLLM } from '../copy';

const QUICK_START_LLM = `# SlyxUp Quick Start
npx @slyxup/cli login
npx @slyxup/cli project create "My App"
npx @slyxup/cli keys create --project-id <id> --type publishable
NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY=pk_test_xxx
npm install @slyxup/react @slyxup/ui
<SlyxUpProvider publishableKey="pk_test_xxx"><SignIn /></SlyxUpProvider>
`;

export default function QuickStart() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1 style={{ fontFamily: '"Space Grotesk",sans-serif', fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em' }}>Quick Start</h1>
        <CopyForLLM content={QUICK_START_LLM} />
      </div>
      <p style={{ color: '#7c8195', fontSize: 16, marginBottom: 32 }}>Get SlyxUp Auth running in your Next.js app in under a minute.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 12 }}>1. Create a project</h2>
      <p style={{ color: '#9ca3b8', fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>Use the CLI to create a project and get your publishable key. This works for any framework — the CLI detects Next.js, React, and package manager automatically.</p>
      <CodeBlock>{`npx @slyxup/cli login
npx @slyxup/cli project create "My App" --slug my-app
npx @slyxup/cli keys create --project-id <id> --type publishable`}</CodeBlock>
      <p style={{ color: '#7c8195', fontSize: 13, marginTop: 8 }}>Copy the <code>pk_test_...</code> key — you&apos;ll need it next.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 12 }}>2. Install SDKs</h2>
      <p style={{ color: '#9ca3b8', fontSize: 14, marginBottom: 12 }}>Install the React SDK and prebuilt UI. For Next.js, also add the Next.js helper.</p>
      <CodeBlock>{`npm install @slyxup/react @slyxup/ui @slyxup/core
# Next.js:
npm install @slyxup/nextjs`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 12 }}>3. Add the provider</h2>
      <p style={{ color: '#9ca3b8', fontSize: 14, marginBottom: 12 }}>Wrap your app once at the root. The provider handles session state, auto-refresh, and cookie management.</p>
      <CodeBlock>{`import { SlyxUpProvider } from '@slyxup/react';

export default function RootLayout({ children }) {
  return (
    <SlyxUpProvider publishableKey={process.env.NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY!}>
      {children}
    </SlyxUpProvider>
  );
}`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 12 }}>4. Add sign-in</h2>
      <p style={{ color: '#9ca3b8', fontSize: 14, marginBottom: 12 }}>Drop in the prebuilt card — it handles email/password + Google/GitHub OAuth, validation, and errors with zero config.</p>
      <CodeBlock>{`import { SignIn } from '@slyxup/ui';

export default function Page() {
  return <SignIn onSuccess={() => router.push('/dashboard')} />;
}`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 12 }}>5. Read the session</h2>
      <p style={{ color: '#9ca3b8', fontSize: 14, marginBottom: 12 }}>On the client, use hooks. On the server (Next.js), use the server helper — no client JS needed.</p>
      <CodeBlock>{`'use client';
import { useUser } from '@slyxup/react';
const { user } = useUser(); // { id, email, firstName, ... }

---
// app/dashboard/page.tsx (server)
import { currentUser } from '@slyxup/nextjs/server';
const user = await currentUser();
if (!user) redirect('/sign-in');`}</CodeBlock>

      <div style={{ marginTop: 40, padding: 20, background: 'rgba(99,102,241,.06)', border: '1px solid rgba(99,102,241,.15)', borderRadius: 12 }}>
        <p style={{ fontWeight: 600, marginBottom: 6 }}>Next steps</p>
        <p style={{ fontSize: 14, color: '#7c8195', lineHeight: 1.6 }}>
          Try the <a href="/docs/auth/email" style={{ color: '#6366f1' }}>Email & Password guide</a> for custom forms, or <a href="/docs/sdk/ui" style={{ color: '#6366f1' }}>@slyxup/ui</a> for all components. For self-hosting, see <a href="/docs/installation" style={{ color: '#6366f1' }}>Installation</a>.
        </p>
      </div>
    </div>
  );
}
