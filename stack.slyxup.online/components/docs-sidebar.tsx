'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { DOCS_SIDEBAR } from '../lib/sidebar';

export function DocsSidebar() {
  const [q, setQ] = useState('');
  const pathname = usePathname();
  const query = q.trim().toLowerCase();

  const sections = useMemo(
    () =>
      DOCS_SIDEBAR.map((s) => ({
        ...s,
        items: s.items.filter(
          (i) => !query || i.title.toLowerCase().includes(query) || i.desc.toLowerCase().includes(query)
        ),
      })).filter((s) => s.items.length > 0),
    [query]
  );

  return (
    <aside className="docs-side">
      <div className="doc-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search docs…"
          aria-label="Search documentation"
        />
      </div>

      {sections.length === 0 && <p className="side-empty">No pages match “{q}”.</p>}

      {sections.map((section) => (
        <div key={section.section} className="side-sec">
          <p className="side-kicker">{section.section}</p>
          {section.items.map((item) => (
            <a
              key={item.slug}
              href={item.slug}
              className={`side-link${pathname === item.slug ? ' on' : ''}`}
              aria-current={pathname === item.slug ? 'page' : undefined}
              dangerouslySetInnerHTML={{ __html: highlight(item.title, query) }}
            />
          ))}
        </div>
      ))}
    </aside>
  );
}

function highlight(title: string, query: string): string {
  if (!query) return escapeHtml(title);
  const idx = title.toLowerCase().indexOf(query);
  if (idx === -1) return escapeHtml(title);
  return (
    escapeHtml(title.slice(0, idx)) +
    '<mark style="background:rgba(99,102,241,.25);color:#c7d2fe;border-radius:3px;padding:0 1px">' +
    escapeHtml(title.slice(idx, idx + query.length)) +
    '</mark>' +
    escapeHtml(title.slice(idx + query.length))
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
