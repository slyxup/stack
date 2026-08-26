'use client';

import { useState, type ReactNode } from 'react';
import { useFramework, FrameworkTabs, FRAMEWORKS, type Framework } from '../../components/docs-framework';

export function CopyForLLM({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 550,
        fontFamily: '"JetBrains Mono", monospace',
        color: copied ? '#34d399' : '#6366f1',
        background: copied ? 'rgba(52,211,153,.1)' : 'rgba(99,102,241,.08)',
        border: `1px solid ${copied ? 'rgba(52,211,153,.2)' : 'rgba(99,102,241,.15)'}`,
        borderRadius: 8,
        padding: '6px 12px',
        cursor: 'pointer',
        transition: 'all .15s',
      }}
    >
      {copied ? '✓ Copied!' : '⎘ Copy for LLM'}
    </button>
  );
}

export type CodeVariants = Partial<Record<Framework, string>>;

function pickVariant(variants: CodeVariants, fw: Framework): { code: string; exact: boolean } {
  if (variants[fw]) return { code: variants[fw]!, exact: true };
  const order: Framework[] = ['js', 'react', 'nextjs'];
  for (const f of order) {
    if (variants[f]) return { code: variants[f]!, exact: false };
  }
  return { code: '', exact: false };
}

export function CodeBlock({
  children,
  copyContent,
  variants,
}: {
  children?: string;
  copyContent?: string;
  variants?: CodeVariants;
}) {
  const { fw } = useFramework();
  const [copied, setCopied] = useState(false);

  let text: string;
  let active: Framework | null = null;
  let showNote = false;

  if (variants) {
    const picked = pickVariant(variants, fw);
    text = picked.code;
    active = fw;
    showNote = !picked.exact && Object.keys(variants).length > 0 && !!picked.code;
  } else {
    text = children ?? '';
  }

  const copy = async () => {
    await navigator.clipboard.writeText(copyContent ?? text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ margin: '16px 0' }}>
      {variants && (
        <div className="fw-head" style={{ marginBottom: 10 }}>
          <FrameworkTabs />
        </div>
      )}
      {showNote && (
        <p className="fw-note">No dedicated {FRAMEWORKS.find((f) => f.id === active)?.label} example yet — showing the closest one.</p>
      )}
      <div style={{ position: 'relative' }}>
        <button
          onClick={copy}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            fontSize: 11,
            fontFamily: '"JetBrains Mono", monospace',
            background: copied ? '#34d399' : '#232635',
            color: copied ? '#fff' : '#9ca3b8',
            border: 'none',
            borderRadius: 6,
            padding: '5px 10px',
            cursor: 'pointer',
            zIndex: 2,
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <pre
          style={{
            background: '#10121b',
            border: '1px solid #232635',
            borderRadius: 12,
            padding: '16px 20px',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 13,
            lineHeight: 1.7,
            overflowX: 'auto',
            whiteSpace: 'pre',
            color: '#e6e6ec',
          }}
        >
          {text}
        </pre>
      </div>
    </div>
  );
}
