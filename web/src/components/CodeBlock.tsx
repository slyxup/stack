import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

export function CodeBlock({
  title,
  code,
  lang = 'bash',
}: { title: string; code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#232329] bg-[#121218]">
      <div className="flex items-center gap-2 border-b border-white/10 px-3.5 py-2.5">
        <span className="flex gap-1.5">
          <i className="block size-2.5 rounded-full bg-[#ff5f56]" />
          <i className="block size-2.5 rounded-full bg-[#ffbd2e]" />
          <i className="block size-2.5 rounded-full bg-[#27c93f]" />
        </span>
        <span className="ml-1 font-mono text-[11px] text-white/50">
          {title} · {lang}
        </span>
        <button
          type="button"
          onClick={copy}
          className="ml-auto flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[11px] text-white/60 hover:bg-white/10 hover:text-white"
        >
          {copied ? (
            <Check className="size-3 text-emerald-400" />
          ) : (
            <Copy className="size-3" />
          )}
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-[12px] leading-[1.7] text-[#d6d6e0]">
        {code}
      </pre>
    </div>
  );
}
