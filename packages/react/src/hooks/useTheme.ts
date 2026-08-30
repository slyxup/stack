'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'slyxup_theme';
const THEME_CLASS = 'dark';

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage unavailable — fall back to system
  }
  return 'system';
}

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

/**
 * System-first theme hook. Theming is opt-in: call it anywhere inside the
 * tree and it will apply a `dark` class on `document.documentElement` (which
 * host apps can already have set before first paint — this hook respects and
 * syncs with that). Preference persists as `slyxup_theme` in localStorage.
 *
 *   const { theme, resolvedTheme, setTheme } = useTheme();
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(() =>
    typeof window === 'undefined' ? 'system' : readStoredPreference()
  );

  const applyTheme = useCallback((next: ThemePreference) => {
    if (typeof document === 'undefined') return;
    const dark = next === 'dark' || (next === 'system' && prefersDark());
    document.documentElement.classList.toggle(THEME_CLASS, dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#12141b' : '#F6F5F1');
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Keep "system" mode live when the OS preference changes.
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme, applyTheme]);

  const setTheme = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persist best-effort; still apply for this session.
    }
    setThemeState(next);
  }, []);

  const resolvedTheme = useMemo(
    () =>
      theme === 'dark' || (theme === 'system' && prefersDark())
        ? 'dark'
        : 'light',
    [theme]
  );

  return { theme, resolvedTheme, setTheme };
}
