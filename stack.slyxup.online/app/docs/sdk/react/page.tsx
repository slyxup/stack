import { CodeBlock, CopyForLLM } from '../../copy';

const LLM = `# @slyxup/react
Provider + hooks. Auto-refreshes session every 5 min.

Setup:
import { SlyxUpProvider } from '@slyxup/react';
<SlyxUpProvider publishableKey="pk_test_xxx"><App /></SlyxUpProvider>

Hooks:
useAuth()    -> { isLoaded, isSignedIn, signIn, signUp, signOut }
useUser()    -> { user, isLoaded }
useSession() -> { session, isLoaded }
usePlans(projectId)       -> { plans }       // billing
useSubscription()         -> { subscription }

Dependency: wraps @slyxup/core.
`;

export default function Page() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: '"Space Grotesk",sans-serif', fontSize: 32, fontWeight: 700 }}>@slyxup/react</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p style={{ color: '#7c8195', marginTop: 8, lineHeight: 1.7 }}>Provider and hooks for any React app (Vite, Remix, Expo Web…). Wraps <code>@slyxup/core</code> and auto-refreshes the session every 5 minutes.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Wrap your app</h2>
      <CodeBlock>{`import { SlyxUpProvider } from '@slyxup/react';

<SlyxUpProvider publishableKey="pk_test_xxx">
  <App />
</SlyxUpProvider>`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Hooks</h2>
      <CodeBlock>{`const { isLoaded, isSignedIn, signIn, signUp, signOut } = useAuth();
const { user } = useUser();          // profile object | null
const { session } = useSession();    // { id, expiresAt } | null

await signIn({ email, password });   // sets HttpOnly cookie via API`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Conditional rendering</h2>
      <CodeBlock>{`if (!isLoaded) return <Spinner />;
return isSignedIn ? <Dashboard /> : <Marketing />;`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Billing hooks</h2>
      <CodeBlock>{`import { usePlans, useSubscription } from '@slyxup/react';
const { plans } = usePlans('prj_your-project-id');
const { subscription } = useSubscription();`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Install</h2>
      <CodeBlock copyContent={`npm install @slyxup/react @slyxup/core`}>{`npm install @slyxup/react @slyxup/core`}</CodeBlock>
    </div>
  );
}
