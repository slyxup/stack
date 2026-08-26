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
      <div className="fw-head">
        <h1 className="h-doc">Email &amp; Password</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p className="prose-p">
        The classic auth flow — Argon2id hashing, email verification, and HttpOnly session cookies handled for you.
        Switch the framework tab to see the same flow in your stack.
      </p>

      <h2 className="h-sec">Sign up</h2>
      <CodeBlock
        variants={{
          js: `import { SlyxupClient } from '@slyxup/core';

const slyxup = new SlyxupClient({ publishableKey: 'pk_test_xxx' });

await slyxup.auth.signUp({
  email: 'ada@example.com',
  password: 'password123',
  firstName: 'Ada',
}); // -> sets HttpOnly cookie slyxup_session`,
          react: `import { useAuth } from '@slyxup/react';

function SignUpForm() {
  const { signUp, isLoaded } = useAuth();
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      await signUp({
        email: fd.get('email') as string,
        password: fd.get('password') as string,
      });
    }}>
      <input name="email" type="email" required />
      <input name="password" type="password" minLength={8} required />
      <button disabled={!isLoaded}>Create account</button>
    </form>
  );
}`,
          nextjs: `// app/sign-up/actions.ts (server action)
'use server';
import { slyxupServer } from '@slyxup/nextjs/server';

export async function signUp(fd: FormData) {
  await slyxupServer().auth.signUp({
    email: fd.get('email') as string,
    password: fd.get('password') as string,
  });
  redirect('/welcome');
}`,
        }}
      />

      <h2 className="h-sec">Sign in</h2>
      <CodeBlock
        variants={{
          js: `await slyxup.auth.signIn({ email, password });
// throws UnauthorizedError (401) on bad credentials
// throws RateLimitError   (429) after 20/min per IP`,
          react: `import { useAuth } from '@slyxup/react';

const { signIn } = useAuth();
await signIn({ email, password }); // redirects handled by your code`,
          nextjs: `// middleware.ts — protect routes before they render
import { slyxupMiddleware } from '@slyxup/nextjs/middleware';

export default slyxupMiddleware({
  publicPaths: ['/', '/sign-in', '/pricing'],
});`,
        }}
      />

      <h2 className="h-sec">Sign out</h2>
      <CodeBlock
        variants={{
          js: `await slyxup.auth.signOut();`,
          react: `const { signOut } = useAuth();
<button onClick={() => signOut()}>Sign out</button>`,
          nextjs: `'use server';
import { slyxupServer } from '@slyxup/nextjs/server';

export async function signOutAction() {
  await slyxupServer().auth.signOut();
  redirect('/');
}`,
        }}
      />

      <h2 className="h-sec">Validation rules</h2>
      <p className="prose-p">
        Email: <code className="inl">z.string().email().max(255)</code> — Password:{' '}
        <code className="inl">z.string().min(8).max(128)</code>. Both trimmed and lowercased server-side; passwords are
        hashed with Argon2id and never logged.
      </p>

      <div className="prose-note">
        <b>Email verification:</b> new accounts get a 6-digit code. Verify via{' '}
        <a href="/docs/api/auth" style={{ color: '#818cf8' }}>POST /v1/verification/verify</a> or the prebuilt{' '}
        <code className="inl">EmailVerification</code> component.
      </div>
    </div>
  );
}
