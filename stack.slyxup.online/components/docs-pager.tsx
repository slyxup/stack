'use client';

import { usePathname } from 'next/navigation';
import { DOCS_SIDEBAR } from '../lib/sidebar';

const FLAT = DOCS_SIDEBAR.flatMap((s) => s.items);

export function DocsPager() {
  const pathname = usePathname();
  const idx = FLAT.findIndex((i) => i.slug === pathname);
  if (idx === -1) return null;

  const prev = idx > 0 ? FLAT[idx - 1] : null;
  const next = idx < FLAT.length - 1 ? FLAT[idx + 1] : null;

  return (
    <nav className="pager" aria-label="Docs pagination">
      {prev ? (
        <a href={prev.slug}>
          <span className="dir">← Previous</span>
          <span className="ttl">{prev.title}</span>
        </a>
      ) : (
        <span className="empty" />
      )}
      {next ? (
        <a href={next.slug} className="nx">
          <span className="dir">Next →</span>
          <span className="ttl">{next.title}</span>
        </a>
      ) : (
        <span className="empty" />
      )}
    </nav>
  );
}
