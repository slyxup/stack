'use client';

import { useEffect, useRef } from 'react';
import { type SlyxUpTheme, applyTheme } from '../theme';

/**
 * Apply a SlyxUp theme to exactly one component subtree.
 * Uses the same engine as global `applyTheme()` — accent, mode, radius,
 * primary style, density — scoped to the returned ref's element (which gets
 * `slyxup-root` automatically). No global leakage: siblings and the host
 * app are untouched. Pass `theme` straight from component props.
 */
export function useScopedTheme<T extends HTMLElement = HTMLDivElement>(
  theme?: SlyxUpTheme
) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!theme || !ref.current) return;
    return applyTheme(theme, ref.current);
  }, [theme]);
  return ref;
}
