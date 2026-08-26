import { CodeBlock, CopyForLLM } from '../../copy';

const LLM = `# @slyxup/nextjs
Server helpers + middleware for Next.js App Router.

Server Components / Route Handlers:
import { auth } from '@slyxup/nextjs/server';
const session = await auth();               // null if signed out

Middleware:
import { slyxupMiddleware } from '@slyxup/nextjs/middleware';
export default slyxupMiddleware({ publicPaths: ['/', '/pricing'] });

Cookie forwarding: reads slyxup_session from incoming cookies,
validates against auth.slyxup.online/v1/session on the server side.
`;

export default function Page() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: '"Space Grotesk",sans-serif', fontSize: 32, fontWeight: 700 }}>@slyxup/nextjs</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p style={{ color: '#7c8195', marginTop: 8, lineHeight: 1.7 }}>Server-side auth for the Next.js App Router — read sessions in Server Components, guard routes in middleware, no token ever exposed to client JS beyond what you render.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Read session on the server</h2>
      <CodeBlock>{`// app/dashboard/page.tsx
import { auth } from '@slyxup/nextjs/server';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const session = await auth();
  if (!session) redirect('/sign-in');
  return <h1>Welcome back</h1>;
}`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Route protection with middleware</h2>
      <CodeBlock>{`// middleware.ts
import { slyxupMiddleware } from '@slyxup/nextjs/middleware';

export default slyxupMiddleware({
  publicPaths: ['/', '/pricing', '/docs'],
  signInUrl: '/sign-in',
});

export const config = { matcher: ['/((?!_next|favicon).*)'] };`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>How cookies work</h2>
      <p style={{ color: '#9ca3b8', fontSize: 14, lineHeight: 1.7 }}>
        The session lives in an <code>HttpOnly</code> cookie set by <code>auth.slyxup.online</code>. The Next.js helpers forward incoming cookies to <code>GET /v1/session</code> server-side — so SSR pages see real auth state with zero client waterfall.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Install</h2>
      <CodeBlock copyContent={`npm install @slyxup/nextjs @slyxup/core`}>{`npm install @slyxup/nextjs @slyxup/core`}</CodeBlock>
    </div>
  );
}
