'use client';

import { useEffect, useSyncExternalStore } from 'react';

export type Framework = 'js' | 'react' | 'nextjs';

export const FRAMEWORKS: { id: Framework; label: string }[] = [
  { id: 'js', label: 'JavaScript' },
  { id: 'react', label: 'React' },
  { id: 'nextjs', label: 'Next.js' },
];

const STORAGE_KEY = 'slyxup-docs-framework';
const DEFAULT_FW: Framework = 'react';

let current: Framework = DEFAULT_FW;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Framework {
  return current;
}

function getServerSnapshot(): Framework {
  return DEFAULT_FW;
}

function setFramework(fw: Framework) {
  if (fw === current) return;
  current = fw;
  try {
    window.localStorage.setItem(STORAGE_KEY, fw);
  } catch {
    /* private mode */
  }
  listeners.forEach((l) => l());
}

/** Shared framework selection across all docs code blocks (no provider needed). */
export function useFramework(): { fw: Framework; setFw: (f: Framework) => void } {
  const fw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      /* private mode */
    }
    if ((saved === 'js' || saved === 'react' || saved === 'nextjs') && saved !== current) {
      current = saved;
      listeners.forEach((l) => l());
    }
  }, []);

  return { fw, setFw: setFramework };
}

export function FrameworkTabs() {
  const { fw, setFw } = useFramework();
  return (
    <div className="fw-tabs" role="tablist" aria-label="Framework">
      {FRAMEWORKS.map((f) => (
        <button
          key={f.id}
          role="tab"
          aria-selected={fw === f.id}
          onClick={() => setFw(f.id)}
          className={`fw-tab${fw === f.id ? ' on' : ''}`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
