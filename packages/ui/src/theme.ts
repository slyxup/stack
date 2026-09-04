/**
 * SlyxUp UI — runtime theme system.
 *
 * Three ways to theme, in order of precedence:
 *  1. `applyTheme({...})` — sets data attributes + CSS variables (JS API).
 *  2. Data attributes directly: `data-slyxup-theme`, `data-slyxup-accent`.
 *  3. Raw CSS variables (`--slx-*`) — always win, set them yourself.
 *
 * Scoping: pass a container element to style one subtree (e.g. a preview
 * panel) instead of the whole document. The container must carry the
 * `slyxup-root` class (added automatically).
 */

import { injectStyles } from './styles';

export type ThemeMode = 'light' | 'dark' | 'auto';

export type AccentName =
  | 'violet'
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'cyan';

export interface AccentDef {
  label: string;
  /** Primary accent (links, focus rings, badges, avatar gradients). */
  accent: string;
  /** Hover state for accent text/links. */
  accentHover: string;
  /** Soft tint for focus rings + highlighted surfaces. */
  accentSoft: string;
  /** Second stop of accent gradients (marks, avatars, popular badges). */
  gradientTo: string;
}

export const ACCENTS: Record<AccentName, AccentDef> = {
  violet: {
    label: 'Violet',
    accent: '#5b5bd6',
    accentHover: '#4c4cc4',
    accentSoft: 'rgba(91, 91, 214, 0.12)',
    gradientTo: '#8b5cf6',
  },
  blue: {
    label: 'Blue',
    accent: '#2563eb',
    accentHover: '#1d4ed8',
    accentSoft: 'rgba(37, 99, 235, 0.12)',
    gradientTo: '#60a5fa',
  },
  emerald: {
    label: 'Emerald',
    accent: '#059669',
    accentHover: '#047857',
    accentSoft: 'rgba(5, 150, 105, 0.12)',
    gradientTo: '#34d399',
  },
  amber: {
    label: 'Amber',
    accent: '#d97706',
    accentHover: '#b45309',
    accentSoft: 'rgba(217, 119, 6, 0.14)',
    gradientTo: '#fbbf24',
  },
  rose: {
    label: 'Rose',
    accent: '#e11d48',
    accentHover: '#be123c',
    accentSoft: 'rgba(225, 29, 72, 0.12)',
    gradientTo: '#fb7185',
  },
  cyan: {
    label: 'Cyan',
    accent: '#0891b2',
    accentHover: '#0e7490',
    accentSoft: 'rgba(8, 145, 178, 0.12)',
    gradientTo: '#22d3ee',
  },
};

export interface FontDef {
  label: string;
  body: string;
  display: string;
  mono?: string;
  /** Google Fonts stylesheet to load (skipped when absent). */
  href?: string;
}

const SYSTEM_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export const FONTS: Record<string, FontDef> = {
  default: {
    label: 'Default (inherit host)',
    body: 'inherit',
    display: 'inherit',
  },
  system: { label: 'System', body: SYSTEM_STACK, display: SYSTEM_STACK },
  dm: {
    label: 'DM Sans + Space Grotesk',
    body: "'DM Sans', sans-serif",
    display: "'Space Grotesk', sans-serif",
    href: 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Space+Grotesk:wght@400;500;600;700&display=swap',
  },
  inter: {
    label: 'Inter',
    body: "'Inter', sans-serif",
    display: "'Inter', sans-serif",
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  },
};

export interface CustomFont {
  body?: string;
  display?: string;
  mono?: string;
  /** Optional stylesheet URL for a custom webfont. */
  href?: string;
}

export interface SlyxUpTheme {
  /** 'auto' follows the OS (default). 'light'/'dark' force a mode. */
  mode?: ThemeMode;
  /** Preset name or any custom CSS color for full control. */
  accent?: AccentName | (string & {});
  /** Font preset name or a custom stack. Default: inherit the host app. */
  font?: keyof typeof FONTS | CustomFont;
  /** Base corner radius in px — sm/lg scale from it. Default 10. */
  radius?: number;
}

const VAR_ACCENT = '--slx-accent';
const VAR_ACCENT_HOVER = '--slx-accent-hover';
const VAR_ACCENT_SOFT = '--slx-accent-soft';
const VAR_ACCENT_2 = '--slx-accent-2';

function isBrowser(): boolean {
  return typeof document !== 'undefined';
}

function loadFontHref(href: string): void {
  if (!isBrowser() || !href) return;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function isAccentName(a: unknown): a is AccentName {
  return typeof a === 'string' && a in ACCENTS;
}

/**
 * Apply a theme. Targets `document.documentElement` by default — pass a
 * container to scope the theme to one subtree (it gets `slyxup-root` added).
 * Returns a cleanup function restoring previous values.
 */
export function applyTheme(theme: SlyxUpTheme, root?: HTMLElement): () => void {
  if (!isBrowser()) return () => {};
  injectStyles();
  const el = root ?? document.documentElement;
  el.classList.add('slyxup-root');

  const prev = {
    mode: el.getAttribute('data-slyxup-theme'),
    accent: el.getAttribute('data-slyxup-accent'),
    vars: [
      VAR_ACCENT,
      VAR_ACCENT_HOVER,
      VAR_ACCENT_SOFT,
      VAR_ACCENT_2,
      '--slx-font',
      '--slx-display',
      '--slx-mono',
      '--slx-radius',
      '--slx-radius-sm',
      '--slx-radius-lg',
    ].map((v) => [v, el.style.getPropertyValue(v)] as const),
  };

  // ── Mode ──
  if (theme.mode && theme.mode !== 'auto') {
    el.setAttribute('data-slyxup-theme', theme.mode);
  } else {
    el.removeAttribute('data-slyxup-theme');
  }

  // ── Accent ──
  if (theme.accent !== undefined) {
    if (isAccentName(theme.accent)) {
      el.setAttribute('data-slyxup-accent', theme.accent);
      el.style.removeProperty(VAR_ACCENT);
      el.style.removeProperty(VAR_ACCENT_HOVER);
      el.style.removeProperty(VAR_ACCENT_SOFT);
      el.style.removeProperty(VAR_ACCENT_2);
    } else if (typeof theme.accent === 'string' && theme.accent.trim()) {
      const hex = theme.accent.trim();
      el.removeAttribute('data-slyxup-accent');
      el.style.setProperty(VAR_ACCENT, hex);
      el.style.setProperty(VAR_ACCENT_HOVER, hex);
      el.style.setProperty(
        VAR_ACCENT_SOFT,
        `color-mix(in srgb, ${hex} 12%, transparent)`
      );
      el.style.setProperty(VAR_ACCENT_2, hex);
    }
  }

  // ── Font ──
  if (theme.font !== undefined) {
    const def: CustomFont =
      typeof theme.font === 'string'
        ? ((FONTS[theme.font] ?? FONTS.default) as FontDef)
        : theme.font;
    if (def.href) loadFontHref(def.href);
    if (def.body) el.style.setProperty('--slx-font', def.body);
    if (def.display) el.style.setProperty('--slx-display', def.display);
    if (def.mono) el.style.setProperty('--slx-mono', def.mono);
  }

  // ── Radius ──
  if (typeof theme.radius === 'number' && Number.isFinite(theme.radius)) {
    const r = Math.max(0, Math.min(24, theme.radius));
    el.style.setProperty('--slx-radius', `${r}px`);
    el.style.setProperty('--slx-radius-sm', `${Math.max(2, r - 2)}px`);
    el.style.setProperty('--slx-radius-lg', `${r + 4}px`);
  }

  return () => {
    if (prev.mode === null) el.removeAttribute('data-slyxup-theme');
    else el.setAttribute('data-slyxup-theme', prev.mode);
    if (prev.accent === null) el.removeAttribute('data-slyxup-accent');
    else el.setAttribute('data-slyxup-accent', prev.accent);
    for (const [v, val] of prev.vars) {
      if (!val) el.style.removeProperty(v);
      else el.style.setProperty(v, val);
    }
  };
}

/** Read the currently applied theme from an element (default: document root). */
export function getTheme(root?: HTMLElement): Required<
  Omit<SlyxUpTheme, 'font' | 'radius'>
> & {
  font: string;
  radius: string;
} {
  const fallback = {
    mode: 'auto' as const,
    accent: 'violet' as const,
    font: '',
    radius: '',
  };
  if (!isBrowser()) return fallback;
  const el = root ?? document.documentElement;
  const cs = window.getComputedStyle(el);
  return {
    mode: (el.getAttribute('data-slyxup-theme') as ThemeMode) || 'auto',
    accent:
      (el.getAttribute('data-slyxup-accent') as AccentName) ||
      cs.getPropertyValue(VAR_ACCENT).trim() ||
      'violet',
    font: cs.getPropertyValue('--slx-font').trim(),
    radius: cs.getPropertyValue('--slx-radius').trim(),
  };
}
