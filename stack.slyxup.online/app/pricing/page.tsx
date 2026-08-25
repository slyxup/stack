import { Nav, Footer } from '../../components/chrome';

export const metadata = {
  title: 'Pricing — SlyxUp',
  description: 'SlyxUp Auth pricing: free and open source while in V1, self-host or use ours.',
};

const TIERS = [
  {
    name: 'Self-hosted',
    price: 'Free',
    per: 'forever · MIT',
    hot: false,
    cta: { label: 'Clone the repo', href: 'https://github.com/slyxup/stack' },
    features: [
      'Unlimited projects & users',
      'Your Cloudflare account + D1',
      'Your Brevo sender & OAuth apps',
      'Full source code access',
      'Community support (GitHub)',
    ],
  },
  {
    name: 'Hosted (V1)',
    price: 'Free',
    per: 'during early access',
    hot: true,
    cta: { label: 'Start with the CLI', href: '#start' },
    features: [
      'auth.slyxup.online managed for you',
      'Unlimited projects during V1',
      'All SDKs & prebuilt UI',
      'Email deliverability included',
      'Edge network, zero maintenance',
      'Export / migrate any time',
    ],
  },
  {
    name: 'Teams (later)',
    price: 'TBA',
    per: 'after V1 stabilises',
    hot: false,
    cta: { label: 'Read the roadmap', href: 'https://github.com/slyxup/stack/blob/main/ROADMAP.md' },
    features: [
      'Organizations & team roles',
      'Audit logs',
      'Webhooks',
      'Priority support',
      'SLA-backed uptime',
    ],
  },
];

export default function Pricing() {
  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="wrap">
            <div className="sec-head">
              <div className="sec-kicker">// pricing</div>
              <h1 className="sec-title">Honest pricing for an honest product</h1>
              <p className="sec-sub">
                Free now because we&apos;re building in the open. When paid tiers arrive,
                self-hosting stays free forever — that&apos;s the point of open source.
              </p>
            </div>

            <div className="grid3">
              {TIERS.map((t) => (
                <div key={t.name} className={`card price-card${t.hot ? ' hot' : ''}`}>
                  {t.hot && <span className="badge-hot">current</span>}
                  <h3 style={{ fontSize: 15, color: '#8a90a3', fontWeight: 550 }}>{t.name}</h3>
                  <div className="price">
                    {t.price} <small>{t.per}</small>
                  </div>
                  <ul className="feat-list">
                    {t.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <a
                    href={t.cta.href}
                    target={t.cta.href.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer"
                    className={`btn-primary btn-block mono${t.hot ? '' : ' btn-ghost'}`}
                    style={t.hot ? {} : { background: 'transparent', border: '1px solid #2b2f45' }}
                  >
                    {t.cta.label}
                  </a>
                </div>
              ))}
            </div>

            <div className="sec-head" id="start" style={{ marginTop: 70 }}>
              <p className="sec-sub" style={{ marginBottom: 26 }}>
                Every tier starts the same way:
              </p>
              <a className="btn-primary mono" href="https://www.npmjs.com/package/@slyxup/cli" target="_blank" rel="noreferrer">
                $ npx @slyxup/cli init
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
