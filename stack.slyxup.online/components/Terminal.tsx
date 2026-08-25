'use client';

import { useEffect, useState } from 'react';

const LINES: Array<[string, string]> = [
  ['$', 'npx @slyxup/cli init'],
  ['✓', 'Next.js detected · App Router · TypeScript'],
  ['✓', 'Project created: my-saas-app'],
  ['✓', 'Publishable key: pk_test_65e1…'],
  ['✓', '@slyxup/react installed'],
  ['✓', 'Environment configured'],
];

export default function Terminal() {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (lineIdx >= LINES.length) {
      setDone(true);
      return;
    }
    const [prefix, text] = LINES[lineIdx];
    const full = prefix === '$' ? text : `${prefix} ${text}`;
    if (charIdx < full.length) {
      const speed = prefix === '$' ? 55 : 18;
      const t = setTimeout(() => setCharIdx((c) => c + 1), speed);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setLineIdx((l) => l + 1);
      setCharIdx(0);
    }, prefix === '$' ? 350 : 120);
    return () => clearTimeout(t);
  }, [lineIdx, charIdx]);

  return (
    <div className="term" role="img" aria-label="Terminal showing slyxup init output">
      <div className="term-bar">
        <span className="term-dot" style={{ background: '#ff5f57' }} />
        <span className="term-dot" style={{ background: '#febc2e' }} />
        <span className="term-dot" style={{ background: '#28c840' }} />
        <span className="term-title">~/my-saas — zsh</span>
      </div>
      <div className="term-body">
        {LINES.slice(0, lineIdx + 1).map(([prefix, text], i) => {
          if (i < lineIdx) {
            return (
              <div key={i}>
                {prefix === '$' ? (
                  <>
                    <span className="t-prompt">➜ </span>
                    <span className="t-cmd">{text}</span>
                  </>
                ) : (
                  <span className={i === 3 ? 't-info' : 't-ok'}>{prefix} {text}</span>
                )}
              </div>
            );
          }
          // current typing line
          const typed = (prefix === '$' ? text : `${prefix} ${text}`).slice(0, charIdx);
          return (
            <div key={i}>
              {prefix === '$' ? <span className="t-prompt">➜ </span> : null}
              <span className={prefix === '$' ? 't-cmd' : i === 3 ? 't-info' : 't-ok'}>{typed}</span>
              {!done && <span className="cursor" />}
            </div>
          );
        })}
        {done && (
          <div>
            <span className="t-prompt">➜ </span>
            <span className="cursor" />
          </div>
        )}
        {done && (
          <div style={{ marginTop: 10 }}>
            <span className="t-dim">{'# ready. that\'s the whole setup.'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
