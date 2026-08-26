import { CodeBlock, CopyForLLM } from '../../copy';

const LLM = `# Email & Password
await client.auth.signUp({ email, password, firstName });
await client.auth.signIn({ email, password });
await client.auth.signOut();
const { user } = await client.sessions.get();
`;

export default function Page() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: '"Space Grotesk",sans-serif', fontSize: 32, fontWeight: 700 }}>Email & Password</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p style={{ color: '#7c8195', marginTop: 8, lineHeight: 1.7 }}>The classic auth flow — with secure hashing, verification, and session cookies handled for you.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Sign up</h2>
      <CodeBlock>{`import { SlyxupClient } from '@slyxup/core';
const client = new SlyxupClient({ publishableKey: 'pk_test_xxx' });
await client.auth.signUp({
  email: 'ada@example.com',
  password: 'password123',
  firstName: 'Ada',
}); // → sets HttpOnly cookie slyxup_session`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Sign in</h2>
      <CodeBlock>{`await client.auth.signIn({ email, password });
// throws UnauthorizedError (401) on bad credentials
// throws RateLimitError (429) after 20/min per IP`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>React</h2>
      <CodeBlock>{`import { useAuth } from '@slyxup/react';
const { signIn, signUp, isLoaded, isSignedIn } = useAuth();
await signIn({ email, password });`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Validation</h2>
      <p style={{ color: '#7c8195', fontSize: 14, lineHeight: 1.7 }}>Email: <code>z.string().email().max(255)</code> — Password: <code>z.string().min(8).max(128)</code>. Both trimmed and lowercased.</p>
    </div>
  );
}
