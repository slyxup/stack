import { CodeBlock, CopyForLLM } from '../../copy';

const LLM = `# @slyxup/cli
npx @slyxup/cli <command>

Auth:
npx @slyxup/cli login                  # browser-based login
npx @slyxup/cli signup                 # create platform account

Projects & keys:
npx @slyxup/cli project create "My App" --slug my-app
npx @slyxup/cli keys create --project-id <id> --type publishable
npx @slyxup/cli env push               # sync .env from dashboard

Utilities:
npx @slyxup/cli init                   # scaffold config in an app
npx @slyxup/cli doctor                 # diagnose setup issues
`;

export default function Page() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: '"Space Grotesk",sans-serif', fontSize: 32, fontWeight: 700 }}>@slyxup/cli</h1>
        <CopyForLLM content={LLM} />
      </div>
      <p style={{ color: '#7c8195', marginTop: 8, lineHeight: 1.7 }}>Everything you do in a dashboard, from the terminal. Login once, then manage projects, API keys, and env vars without leaving your editor.</p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Login</h2>
      <CodeBlock copyContent={`npx @slyxup/cli login`}>{`npx @slyxup/cli login
# opens browser -> device code flow -> stores sk-scoped token locally
npx @slyxup/cli whoami`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Projects &amp; keys</h2>
      <CodeBlock>{`npx @slyxup/cli project create "My App" --slug my-app
npx @slyxup/cli keys create --project-id prj_xxx --type publishable
# pk_test_... (frontend)   sk_test_... (server, never commit)`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Init a new app</h2>
      <CodeBlock copyContent={`npx @slyxup/cli init`}>{`npx @slyxup/cli init
# detects framework (Next.js/Vite), installs the right SDKs,
# writes .env.local with NEXT_PUBLIC_SLYXUP_PUBLISHABLE_KEY`}</CodeBlock>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32 }}>Doctor</h2>
      <CodeBlock copyContent={`npx @slyxup/cli doctor`}>{`npx @slyxup/cli doctor
# ✓ publishable key present
# ✗ .env.local missing  -> run: npx @slyxup/cli env push
# ✓ API reachable (42ms)`}</CodeBlock>
    </div>
  );
}
