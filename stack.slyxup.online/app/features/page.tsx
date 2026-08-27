import { Nav, Footer } from '../../components/chrome';

const FEATURES: Array<{ group: string; items: Array<[string, string]> }> = [
  {
    group: 'Authentication',
    items: [
      ['Email + password', 'PBKDF2 100k hashing, timing-safe verification, auto sign-in on sign-up.'],
      ['Google OAuth', 'Full redirect flow with CSRF state validation and account linking.'],
      ['GitHub OAuth', 'Same hardened flow — two apps (dev/prod), one callback pattern.'],
      ['Email verification', 'Token-based links via Brevo, 24h expiry, resend without user enumeration.'],
    ],
  },
  {
    group: 'Sessions',
    items: [
      ['DB-backed sessions', 'Every session is a row in D1 — list, revoke, audit. Not opaque JWTs.'],
      ['Hardened cookies', 'HttpOnly · Secure · SameSite=Lax, 7-day expiry, crypto-random tokens.'],
      ['SSR reads', 'currentUser() in Next.js server components — no client round-trip needed.'],
      ['Route middleware', 'One factory protects route groups and redirects with return URLs.'],
    ],
  },
  {
    group: 'Platform',
    items: [
      ['Projects & keys', 'pk_test/pk_live publishable keys and sk_ secrets, hashed at rest.'],
      ['Edge runtime', 'Cloudflare Workers + D1 — zero cold start, ~50ms auth checks globally.'],
      ['Self-hosting', 'The hosted service runs the same MIT-licensed code in this repo.'],
      ['CI/CD included', 'Conventional commits, changesets to npm, wrangler deploys — pipeline in the repo.'],
    ],
  },
];

export const metadata = {
  title: 'Features — SlyxUp',
  description: 'Everything SlyxUp Auth includes: email/password, OAuth, sessions, SDKs, prebuilt UI, self-hosting on Cloudflare Workers.',
};

export default function Features() {
  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-kicker">// features</div>
              <h1 className="sec-title">Everything auth needs. Nothing it doesn&apos;t.</h1>
              <p className="sec-sub">
                V1 covers the 90% case completely instead of the 100% case badly.
              </p>
            </div>

            {FEATURES.map((group) => (
              <div key={group.group} style={{ marginBottom: 56 }}>
                <h2
                  style={{
                    fontFamily: 'ui-monospace, Menlo, monospace',
                    fontSize: 14,
                    color: 'var(--accent)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: 20,
                  }}
                >
                  {'// '}
                  {group.group}
                </h2>
                <div className="grid2">
                  {group.items.map(([title, text]) => (
                    <div className="card" key={title}>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="sec-head" style={{ marginTop: 40 }}>
              <h2 className="sec-title">Not in V1 (on purpose)</h2>
              <p className="sec-sub">
                Organizations, SAML/SCIM, passkeys — planned, but not shipped half-baked.
                Billing and subscriptions are available in the dashboard.
                V1 does fewer things properly.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
