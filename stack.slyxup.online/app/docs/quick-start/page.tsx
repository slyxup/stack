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
      <div className="fw-head" style={{ marginBottom: 8 }}>
        <h1 className="h-doc">Quick Start</h1>
        <CopyForLLM content={QUICK_START_LLM} />
      </div>
      <p className="prose-p" style={{ fontSize: 16 }}>
        Working auth in under a minute. Switch the framework tab on any code block — your choice follows you across every docs page.
      </p>

      <h2 className="h-sec">1. Create a project</h2>
      <p className="prose-p">
        The CLI creates your project and prints a publishable key. It auto-detects your framework and package manager.
      </p>
      <CodeBlock>{`npx @slyxup/cli login
npx @slyxup/cli project create "My App" --slug my-app
npx @slyxup/cli keys create --project-id <id> --type publishable`}</CodeBlock>
      <p className="prose-p">Copy the <code className="inl">pk_test_...</code> key — you'll need it next.</p>

      <h2 className="h-sec">2. Install the SDK</h2>
      <CodeBlock
        variants={{
          js: `npm install @slyxup/core`,
          react: `npm install @slyxup/react @slyxup/core`,
          nextjs: `npm install @slyxup/nextjs @slyxup/core`,
        }}
      />

      <h2 className="h-sec">3. Configure the client</h2>
      <CodeBlock
        variants={{
          js: `import { SlyxupClient } from '@slyxup/core';

export const slyxup = new SlyxupClient({
  publishableKey: process.env.SLYXUP_PUBLISHABLE_KEY,
});`,
          react: `// main.tsx
import { SlyxUpProvider } from '@slyxup/react';

createRoot(document.getElementById('root')!).render(
  <SlyxUpProvider publishableKey={import.meta.env.VITE_SLYXUP_PUBLISHABLE_KEY}>
    <App />
  </SlyxUpProvider>
);`,
          nextjs: `// app/layout.tsx
import { SlyxUpProvider } from '@slyxup/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <SlyxUpProvider publishableKey={process.env.NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY!}>
          {children}
        </SlyxUpProvider>
      </body>
    </html>
  );
}`,
        }}
      />

      <h2 className="h-sec">4. Add sign-in</h2>
      <CodeBlock
        variants={{
          js: `const { user } = await slyxup.auth.signIn({
  email: 'ada@example.com',
  password: 'password123',
});
// session cookie is set by the API — you're done`,
          react: `import { SignIn } from '@slyxup/ui';

export default function Page() {
  return <SignIn onFinish={() => router.push('/dashboard')} />;
}`,
          nextjs: `// app/sign-in/page.tsx
'use client';
import { SignIn } from '@slyxup/ui';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  return <SignIn onFinish={() => router.push('/dashboard')} />;
}`,
        }}
      />

      <h2 className="h-sec">5. Read the user</h2>
      <CodeBlock
        variants={{
          js: `const { user } = await slyxup.users.me();
if (!user) redirect('/sign-in');`,
          react: `'use client';
import { useUser } from '@slyxup/react';

function Profile() {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return <Spinner />;
  return user ? <h1>Hi, {user.firstName}</h1> : <a href="/sign-in">Sign in</a>;
}`,
          nextjs: `// app/dashboard/page.tsx (server component)
import { currentUser } from '@slyxup/nextjs/server';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const user = await currentUser();
  if (!user) redirect('/sign-in');
  return <h1>Welcome back, {user.firstName}</h1>;
}`,
        }}
      />

      <div className="prose-note">
        <b>Next steps:</b> custom forms in the <a href="/docs/auth/email" style={{ color: '#818cf8' }}>Email &amp; Password guide</a>,
        social login in <a href="/docs/auth/oauth" style={{ color: '#818cf8' }}>OAuth</a>, or browse{' '}
        <a href="/docs/sdk/ui" style={{ color: '#818cf8' }}>@slyxup/ui</a> components.
      </div>
    </div>
  );
}
