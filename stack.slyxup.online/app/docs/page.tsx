import { DOCS_SIDEBAR } from '../../lib/sidebar';
import { CopyForLLM } from './copy';

export default function DocsPage() {
  return (
    <div>
      <div className="fw-head" style={{ marginBottom: 8 }}>
        <h1 className="h-doc">Documentation</h1>
        <CopyForLLM
          content={`# SlyxUp Docs\nhttps://stack.slyxup.online/docs\n${DOCS_SIDEBAR.map(
            (s) => `## ${s.section}\n${s.items.map((i) => `- ${i.title}: ${i.desc} (${i.slug})`).join('\n')}`
          ).join('\n')}`}
        />
      </div>
      <p className="prose-p" style={{ fontSize: 15.5, maxWidth: 640 }}>
        Everything you need to integrate SlyxUp Auth — from a 30-second quick start to billing and the full REST API.
        Pick your framework once (JavaScript, React, or Next.js) and every code example across these docs follows you.
      </p>

      {DOCS_SIDEBAR.map((section) => (
        <section key={section.section} className="d-section">
          <p className="side-kicker">{section.section}</p>
          <div className="d-grid">
            {section.items.map((item) => (
              <a key={item.slug} href={item.slug} className="d-card">
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <span className="arr">→</span>
              </a>
            ))}
          </div>
        </section>
      ))}

      <div
        style={{
          marginTop: 48,
          padding: 20,
          background: 'rgba(99,102,241,.06)',
          border: '1px solid rgba(99,102,241,.15)',
          borderRadius: 12,
          textAlign: 'center',
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: 6 }}>Feeding an LLM?</p>
        <CopyForLLM
          content={`# SlyxUp Docs\nhttps://stack.slyxup.online/docs\n${DOCS_SIDEBAR.map(
            (s) => `## ${s.section}\n${s.items.map((i) => `- ${i.title}: ${i.desc} (${i.slug})`).join('\n')}`
          ).join('\n')}`}
        />
        <p style={{ fontSize: 12, color: '#7c8195', marginTop: 8 }}>
          Copies the full docs index — paste into ChatGPT/Claude, then grab any page&apos;s code with its own copy buttons.
        </p>
      </div>
    </div>
  );
}
