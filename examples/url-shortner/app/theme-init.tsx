'use client';

import { applyTheme } from '@slyxup/ui';
import { useEffect } from 'react';

/**
 * Applies the Shrinkr brand theme to every @slyxup/ui component:
 * dark mode + emerald accent + Inter, matching this app's chrome.
 */
export default function ThemeInit() {
  useEffect(() => {
    const cleanup = applyTheme({ mode: 'dark', accent: 'emerald', font: 'inter', radius: 12 });
    return cleanup;
  }, []);
  return null;
}
