import Terminal from '../components/Terminal';
import { Nav, Footer } from '../components/chrome';
import { BoltIcon, CookieIcon, PackageIcon, LayoutIcon, UnlockIcon, ShieldIcon } from '../components/icons';

const FEATURES = [
  { icon: <BoltIcon />, title: 'Edge-native', text: 'Runs on Cloudflare Workers with D1 at the edge. No cold starts, no servers to patch, sub-50ms auth checks worldwide.' },
  { icon: <ShieldIcon />, title: 'Email + OAuth built in', text: 'Email/password with PBKDF2 hashing, Google and GitHub sign-in with CSRF state validation — configured once, done.' },
  { icon: <CookieIcon />, title: 'Sessions done right', text: 'DB-backed sessions in HttpOnly, Secure, SameSite cookies. Revoke any session. Tokens from crypto.getRandomValues().' },
  { icon: <PackageIcon />, title: 'SDKs for your stack', text: '@slyxup/core, react, nextjs — a typed client, hooks like useAuth() and currentUser(), middleware for route protection.' },
  { icon: <LayoutIcon />, title: 'Prebuilt UI, yours to theme', text: 'SignIn, SignUp, UserButton components that look great by default. CSS variables for brand colors, dark mode automatic.' },
  { icon: <UnlockIcon />, title: 'Open source & self-hostable', text: 'MIT licensed monorepo. Clone it, point it at your own D1 and Brevo keys, run wrangler dev. No lock-in, ever.' },
];

export default function Home() {
  return (
    <>
      <Nav />
      <header className="hero">
        <div className="wrap">
          <div className="eyebrow"><span className="dot" /> open-source · MIT · runs on Cloudflare</div>
          <h1 className="display">Auth that lives on the <span className="grad">edge</span>,<br />set up in one command.</h1>
          <p className="hero-sub">SlyxUp is an open-source authentication platform for Cloudflare Workers. Email + OAuth, DB-backed sessions, React/Next.js SDKs and prebuilt UI — self-hostable from day one.</p>
          <div className="hero-actions">
            <a className="btn-primary" href="#get-started">$ npx @slyxup/cli init</a>
            <a className="btn-secondary" href="https://github.com/slyxup/stack" target="_blank" rel="noreferrer">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 4 }}><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
              Star on GitHub
            </a>
          </div>
          <Terminal />
        </div>
      </header>

      <section aria-label="stats">
        <div className="stats">
          <div className="stat"><div className="stat-num">6</div><div className="stat-lbl">npm SDKs published</div></div>
          <div className="stat"><div className="stat-num">30s</div><div className="stat-lbl">setup to working auth</div></div>
          <div className="stat"><div className="stat-num">0</div><div className="stat-lbl">servers to manage</div></div>
        </div>
      </section>

      <main>
        <section className="section" id="features">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-kicker">// everything included</div>
              <h2 className="sec-title">What you get out of the box</h2>
              <p className="sec-sub">Not an auth library — a complete platform. The boring parts are already done.</p>
            </div>
            <div className="grid3">
              {FEATURES.map((f) => (
                <div className="card" key={f.title}>
                  <div className="card-icon">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 20 }}>
          <div className="wrap grid2" style={{ alignItems: 'center', gap: 40 }}>
            <div>
              <div className="sec-kicker" style={{ textAlign: 'left' }}>// developer experience</div>
              <h2 className="sec-title" style={{ textAlign: 'left' }}>Auth in five lines of client code</h2>
              <p style={{ color: 'var(--text-dim)', fontSize: 15.5 }}>No SDK ceremony. One client, typed end to end, cookie sessions handled for you — including SSR in Next.js via <code style={{ color: 'var(--accent)' }}>currentUser()</code>.</p>
              <p style={{ marginTop: 18 }}><a className="btn-secondary" href="/features">Explore all features &rarr;</a></p>
            </div>
            <div className="codeblock">
              <span className="c-kw">import</span> {'{'} <span className="c-fn">SlyxupClient</span> {'}'} <span className="c-kw">from</span> <span className="c-str">'@slyxup/core'</span>;{'\n\n'}
              <span className="c-kw">const</span> client = <span className="c-kw">new</span> <span className="c-fn">SlyxupClient</span>({'{'}{'\n'}
              {'  '}publishableKey: <span className="c-str">'pk_test_xxx'</span>,{'\n'}
              {'});'}{'\n\n'}
              <span className="c-cm">// sign a user in — cookie handled</span>{'\n'}
              <span className="c-kw">await</span> client.auth.<span className="c-fn">signIn</span>({'{'} email, password {'}'});{'\n\n'}
              <span className="c-cm">// read them back anywhere</span>{'\n'}
              <span className="c-kw">const</span> {'{'} user {'}'} = <span className="c-kw">await</span> client.sessions.<span className="c-fn">get</span>();
            </div>
          </div>
        </section>

        <section className="section" id="self-hosting" style={{ background: 'var(--bg-inset)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div className="wrap grid2" style={{ alignItems: 'center', gap: 40 }}>
            <div className="codeblock">
              <span className="c-cm"># self-host in three commands</span>{'\n'}
              git clone https://github.com/slyxup/stack.git{'\n'}
              cp .env.example auth.slyxup.online/.dev.vars{'\n'}
              pnpm install && pnpm dev{'\n\n'}
              <span className="t-ok">&#10003;</span> auth running on http://localhost:8787{'\n'}
              <span className="t-ok">&#10003;</span> D1 migrations applied (11 tables){'\n'}
              <span className="t-ok">&#10003;</span> your keys, your data, your infra
            </div>
            <div>
              <div className="sec-kicker" style={{ textAlign: 'left' }}>// no lock-in</div>
              <h2 className="sec-title" style={{ textAlign: 'left' }}>Self-host the whole platform</h2>
              <p style={{ color: 'var(--text-dim)', fontSize: 15.5 }}>The hosted version runs the same code in this repo. Bring your own Cloudflare account, D1 database, Brevo sender and OAuth apps. Your users never touch our infrastructure unless you want them to.</p>
              <p style={{ marginTop: 18 }}><a className="btn-secondary" href="https://github.com/slyxup/stack" target="_blank" rel="noreferrer">Read the source &rarr;</a></p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="wrap sec-head">
            <div className="sec-kicker">// pricing</div>
            <h2 className="sec-title">Free while we&apos;re young</h2>
            <p className="sec-sub">V1 is free — self-host or use ours. Paid tiers come later, with a real migration path.</p>
            <p style={{ marginTop: 22 }}><a className="btn-secondary" href="/pricing">See pricing &rarr;</a></p>
          </div>
        </section>

        <section className="cta-band" id="get-started">
          <div className="wrap">
            <h2 className="sec-title">Ship auth today.</h2>
            <p className="sec-sub" style={{ marginBottom: 34 }}>One command stands between you and working authentication.</p>
            <a className="btn-primary" href="https://www.npmjs.com/package/@slyxup/cli" target="_blank" rel="noreferrer">$ npx @slyxup/cli init</a>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
