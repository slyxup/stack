import { CodeBlock, CopyForLLM } from '../../copy';

const LLM = `# Sessions
DB-backed sessions, HttpOnly Secure SameSite=Lax cookie "slyxup_session".
Token: crypto-random (256-bit), stored hashed in D1, cached in KV.
Expiry: 7 days, sliding refresh on activity.

GET    /v1/session                -> current session + user
POST   /v1/auth/sign-out          -> revoke current session
DELETE /v1/sessions               -> revoke all other devices (keeps current)
`;

export default function Page() {
  return (
    <div>
      <div className="fw-head">
        <h1 className="h-doc">Sessions</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p className="prose-p">
        Every sign-in creates a DB-backed session. The cookie is{' '}
        <code className="inl">HttpOnly; Secure; SameSite=Lax</code> — JavaScript can never read it.
      </p>

      <h2 className="h-sec">How it works</h2>
      <CodeBlock>{`token   = crypto.getRandomValues(256 bits)  # never Math.random()
cookie  = slyxup_session=<token>; HttpOnly; Secure; SameSite=Lax; Max-Age=604800
storage = D1 sessions table (hashed token) + KV cache for hot reads
expiry  = 7 days, refreshed on activity`}</CodeBlock>

      <h2 className="h-sec">Read the current session</h2>
      <CodeBlock
        variants={{
          js: `const { session, user } = await slyxup.sessions.get();
// session: { id, userId, expiresAt } | null (401 handled by SDK)`,
          react: `'use client';
import { useSession } from '@slyxup/react';

function Header() {
  const { session, isLoaded } = useSession();
  if (!isLoaded) return <Spinner />;
  return session ? <Avatar /> : <a href="/sign-in">Sign in</a>;
}`,
          nextjs: `import { auth } from '@slyxup/nextjs/server';
import { redirect } from 'next/navigation';

export default async function Layout({ children }) {
  const session = await auth();
  if (!session) redirect('/sign-in');
  return <AppShell>{children}</AppShell>;
}`,
        }}
      />

      <h2 className="h-sec">Sign out</h2>
      <CodeBlock
        variants={{
          js: `await slyxup.auth.signOut();        // this device
await slyxup.sessions.revokeOthers();  // every other device`,
          react: `const { signOut } = useAuth();
<button onClick={() => signOut()}>Sign out</button>`,
          nextjs: `'use server';
import { cookies } from 'next/headers';

export async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('slyxup_session');
  redirect('/');
}`,
        }}
      />

      <div className="prose-note">
        <b>Instant revocation:</b> sessions live in D1 — not stateless JWTs. Revoking deletes the row and purges KV;
        the very next request with that cookie gets a <code className="inl">401</code>. Blocking a user cascades to all
        their sessions.
      </div>
    </div>
  );
}
