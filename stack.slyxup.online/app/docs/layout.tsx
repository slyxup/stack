import { Nav, Footer } from '../../components/chrome';
import { DOCS_SIDEBAR } from '../../../docs-site/sidebar';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <div className="wrap" style={{ display: 'flex', gap: 40, padding: '48px 24px' }}>
        <aside
          style={{
            width: 240,
            flexShrink: 0,
            position: 'sticky',
            top: 84,
            alignSelf: 'flex-start',
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
          }}
        >
          {DOCS_SIDEBAR.map((section) => (
            <div key={section.section} style={{ marginBottom: 28 }}>
              <p
                className="mono"
                style={{
                  fontSize: 11,
                  color: '#6366f1',
                  textTransform: 'uppercase',
                  letterSpacing: '.1em',
                  marginBottom: 10,
                }}
              >
                {section.section}
              </p>
              {section.items.map((item) => (
                <a
                  key={item.slug}
                  href={item.slug}
                  style={{
                    display: 'block',
                    fontSize: 13.5,
                    color: '#7c8195',
                    padding: '6px 0',
                    transition: 'color .15s',
                  }}
                >
                  {item.title}
                </a>
              ))}
            </div>
          ))}
        </aside>
        <article style={{ flex: 1, minWidth: 0, maxWidth: 720 }}>{children}</article>
      </div>
      <Footer />
    </>
  );
}
