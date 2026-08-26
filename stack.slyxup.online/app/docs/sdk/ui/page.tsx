import { CodeBlock, CopyForLLM } from '../../copy';

const LLM = `# @slyxup/ui
Prebuilt auth components on top of @slyxup/react.

import { SignIn, SignUp, SocialButtons, UserButton } from '@slyxup/ui';

<SignIn />            -> email/password card, error + loading states
<SignUp />            -> registration card with validation
<SocialButtons />     -> Google/GitHub OAuth buttons (providers prop)
<UserButton />        -> avatar menu: profile, sessions, sign out

Dependency chain: @slyxup/ui -> @slyxup/react -> @slyxup/core
`;

export default function Page() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: '"Space Grotesk",sans-serif', fontSize: 32, fontWeight: 700 }}>@slyxup/ui</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p style={{ color: '#7c8195', marginTop: 8, lineHeight: 1.7 }}>Drop-in auth components — forms with validation, loading and error states already handled. Built on <code>@slyxup/react</code>, so they work inside your existing provider.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Sign-in / Sign-up cards</h2>
      <CodeBlock>{`import { SignIn, SignUp } from '@slyxup/ui';

export default function Page() {
  return (
    <>
      <SignIn onFinish={() => router.push('/dashboard')} />
      {/* or */}
      <SignUp onFinish={() => router.push('/welcome')} />
    </>
  );
}`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Social buttons</h2>
      <CodeBlock>{`import { SocialButtons } from '@slyxup/ui';
<SocialButtons providers={['google', 'github']} />`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>User button</h2>
      <CodeBlock>{`import { UserButton } from '@slyxup/ui';
// avatar -> dropdown with profile link,
// active sessions, and sign out.
<UserButton />`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Install</h2>
      <CodeBlock copyContent={`npm install @slyxup/ui @slyxup/react @slyxup/core`}>{`npm install @slyxup/ui @slyxup/react @slyxup/core`}</CodeBlock>
    </div>
  );
}
