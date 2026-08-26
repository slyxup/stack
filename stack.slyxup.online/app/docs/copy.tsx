'use client';

import { useState } from 'react';

export function CopyForLLM({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await (navigator as unknown as { clipboard: { writeText: (s: string) => Promise<void> } }).clipboard.writeText(content);
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

export function CodeBlock({ children, copyContent }: { children: string; copyContent?: string }) {
  const [copied, setCopied] = useState(false);
  const text = copyContent ?? children;

  const copy = async () => {
    await (navigator as unknown as { clipboard: { writeText: (s: string) => Promise<void> } }).clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: 'relative', margin: '16px 0' }}>
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
        {children}
      </pre>
    </div>
  );
}
