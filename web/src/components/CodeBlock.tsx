import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { HighlighterCore } from 'shiki/core';

/** Singleton Shiki highlighter — core + JS engine + 5 lazy langs, loaded once.
 *  (Never import 'shiki' root here: it eagerly bundles every language.) */
let hlPromise: Promise<HighlighterCore> | null = null;
function getHighlighter(): Promise<HighlighterCore> {
  if (!hlPromise) {
    hlPromise = (async () => {
      const [
        { createHighlighterCore },
        { createJavaScriptRegexEngine },
        { default: tsx },
        { default: typescript },
        { default: bash },
        { default: json },
        { default: markdown },
        { default: githubDark },
      ] = await Promise.all([
        import('shiki/core'),
        import('shiki/engine/javascript'),
        import('shiki/dist/langs/tsx.mjs'),
        import('shiki/dist/langs/typescript.mjs'),
        import('shiki/dist/langs/bash.mjs'),
        import('shiki/dist/langs/json.mjs'),
        import('shiki/dist/langs/markdown.mjs'),
        import('shiki/dist/themes/github-dark.mjs'),
      ]);
      return createHighlighterCore({
        themes: [githubDark],
        langs: [tsx, typescript, bash, json, markdown],
        engine: createJavaScriptRegexEngine(),
      });
    })();
  }
  return hlPromise;
}

const LANG_ALIAS: Record<string, string> = {
  tsx: 'tsx',
  ts: 'typescript',
  typescript: 'typescript',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
  json: 'json',
  md: 'markdown',
  markdown: 'markdown',
  html: 'tsx',
  jsx: 'tsx',
};

export function CodeBlock({
  title,
  code,
  lang = 'bash',
}: {
  title: string;
  code: string;
  lang?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [html, setHtml] = useState<string | null>(null);

  const shikiLang = LANG_ALIAS[lang] ?? 'typescript';

  useEffect(() => {
    let live = true;
    setHtml(null);
    getHighlighter()
      .then((hl) => {
        if (!live) return;
        setHtml(
          hl.codeToHtml(code, {
            lang: shikiLang,
            theme: 'github-dark',
          })
        );
      })
      .catch(() => {
        if (live) setHtml(null);
      });
    return () => {
      live = false;
    };
  }, [code, shikiLang]);

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
    <div className="codeblock overflow-hidden rounded-xl border border-[#232329] bg-[#0d0d13] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]">
      <div className="flex items-center gap-2 border-b border-white/10 px-3.5 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <i className="block size-2.5 rounded-full bg-[#ff5f56]" />
          <i className="block size-2.5 rounded-full bg-[#ffbd2e]" />
          <i className="block size-2.5 rounded-full bg-[#27c93f]" />
        </span>
        <span className="ml-1 truncate font-mono text-[11px] text-white/50">
          {title}
        </span>
        <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white/45">
          {lang}
        </span>
        <button
          type="button"
          onClick={copy}
          className="ml-auto flex shrink-0 items-center gap-1 rounded-full px-2 py-1 font-mono text-[11px] text-white/60 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
        >
          {copied ? (
            <Check className="size-3 text-emerald-400" />
          ) : (
            <Copy className="size-3" />
          )}
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      {html ? (
        <div
          className="shiki-wrap overflow-x-auto p-4 font-mono text-[12.5px] leading-[1.75]"
          // Shiki output is generated from our own trusted code strings.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-[1.75] text-[#d6d6e0]">
          {code}
        </pre>
      )}
    </div>
  );
}
