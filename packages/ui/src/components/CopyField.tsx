import { useState } from 'react';
import { CheckIcon } from '../icons';
import { injectStyles } from '../styles';

export interface CopyFieldProps {
  value: string;
  label?: string;
  /** Mask the middle of long values (ideal for API keys). Default true. */
  masked?: boolean;
}

/** Read-only value with a copy button — API keys, tokens, webhook secrets. */
export function CopyField({ value, label, masked = true }: CopyFieldProps) {
  injectStyles();
  const [copied, setCopied] = useState(false);

  const display =
    masked && value.length > 16
      ? `${value.slice(0, 10)}…${value.slice(-4)}`
      : value;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="slx-copyfield-wrap">
      {label && (
        <p className="slx-label" style={{ marginBottom: 6 }}>
          {label}
        </p>
      )}
      <div className="slx-copyfield">
        <code className="slx-copyfield-value" title={value}>
          {display}
        </code>
        <button
          type="button"
          className="slx-btn-secondary slx-copyfield-btn"
          onClick={copy}
          aria-live="polite"
        >
          {copied ? <CheckIcon /> : null}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
