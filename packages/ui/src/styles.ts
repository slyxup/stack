/**
 * SlyxUp UI — design tokens + stylesheet.
 * Injected automatically by every SlyxUp component. Theme by overriding
 * CSS variables on :root or .slyxup-scope.
 */

export const FONT_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">`;

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Space+Grotesk:wght@400;500;600;700&display=swap');

.slyxup-root {
  /* ── Tokens ── */
  --slx-accent: #5b5bd6;
  --slx-accent-hover: #4c4cc4;
  --slx-accent-soft: rgba(91, 91, 214, 0.12);
  --slx-bg: #ffffff;
  --slx-bg-subtle: #f7f7fb;
  --slx-bg-page: #e9eaf6;
  --slx-ink: #16161d;
  --slx-ink-strong: #0c0c12;
  --slx-muted: #6f6f7b;
  --slx-border: #e3e3ee;
  --slx-border-strong: #d3d3e2;
  --slx-danger: #d64550;
  --slx-success: #1f9d55;
  --slx-radius-sm: 8px;
  --slx-radius: 10px;
  --slx-radius-lg: 14px;
  --slx-font: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --slx-display: "Space Grotesk", "DM Sans", sans-serif;
  --slx-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
  --slx-shadow-card:
    0 1px 2px rgba(18,18,28,.05),
    0 8px 24px -6px rgba(18,18,28,.09),
    0 24px 64px -16px rgba(18,18,28,.13);
  --slx-shadow-pop:
    0 2px 6px rgba(18,18,28,.08),
    0 16px 48px -12px rgba(18,18,28,.18);

  font-family: var(--slx-font);
  color: var(--slx-ink);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  font-feature-settings: "cv11", "ss01";
}
@media (prefers-color-scheme: dark) {
  .slyxup-root:not(.slyxup-light) {
    --slx-accent: #8484f2;
    --slx-accent-hover: #9696f5;
    --slx-accent-soft: rgba(132, 132, 242, 0.16);
    --slx-bg: #17171f;
    --slx-bg-subtle: #1e1e28;
    --slx-bg-page: #101016;
    --slx-ink: #f0f0f4;
    --slx-ink-strong: #ffffff;
    --slx-muted: #9a9aa6;
    --slx-border: #292935;
    --slx-border-strong: #343442;
    --slx-danger: #f0737d;
    --slx-success: #4ade80;
    --slx-shadow-card:
      0 1px 2px rgba(0,0,0,.25),
      0 12px 32px -8px rgba(0,0,0,.5),
      0 32px 72px -20px rgba(0,0,0,.55);
    --slx-shadow-pop:
      0 4px 12px rgba(0,0,0,.4),
      0 24px 56px -12px rgba(0,0,0,.6);
  }
}

@keyframes slx-shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-4px); }
  40%, 60% { transform: translateX(4px); }
}
@keyframes slx-spin { to { transform: rotate(360deg); } }
@keyframes slx-rise {
  from { opacity: 0; transform: translateY(8px) scale(.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes slx-pop {
  0% { transform: scale(.5); opacity: 0; }
  60% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .slyxup-root * { animation: none !important; transition: none !important; }
}

/* ── Card ── */
.slx-card {
  width: 100%;
  max-width: 400px;
  background: var(--slx-bg);
  border: 1px solid var(--slx-border);
  border-radius: var(--slx-radius-lg);
  padding: 34px 34px 30px;
  box-shadow: var(--slx-shadow-card);
  box-sizing: border-box;
  animation: slx-rise .38s cubic-bezier(.22,.9,.32,1) both;
}
.slyxup-root:not(.slyxup-light) .slx-card,
.slx-card { color: var(--slx-ink); }
.slx-card-error { animation: slx-shake .45s cubic-bezier(.36,.07,.19,.97) both; }

/* ── Header / keyhole mark ── */
.slx-mark {
  width: 46px; height: 46px; border-radius: 13px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(140deg, var(--slx-accent) 0%, #8b5cf6 100%);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.28),
    0 6px 16px -6px rgba(91,91,214,.55);
  margin-bottom: 20px;
}
.slx-mark svg { display: block; filter: drop-shadow(0 1px 1px rgba(0,0,0,.18)); }
.slx-title {
  font-family: var(--slx-display);
  font-size: 21px; font-weight: 650; letter-spacing: -0.022em;
  color: var(--slx-ink-strong);
  margin: 0 0 6px;
}
.slx-subtitle { font-size: 13.5px; color: var(--slx-muted); margin: 0 0 24px; line-height: 1.55; }

/* ── Fields ── */
.slx-field { margin-bottom: 15px; }
.slx-row {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 6px;
}
.slx-label {
  display: inline-block;
  font-size: 12.5px; font-weight: 550; letter-spacing: 0.01em;
  color: var(--slx-ink);
}
.slx-input {
  width: 100%; box-sizing: border-box;
  font: inherit; font-size: 14px; line-height: 1.4; color: var(--slx-ink);
  background: var(--slx-bg-subtle);
  border: 1px solid var(--slx-border);
  border-radius: var(--slx-radius);
  padding: 10px 13px;
  outline: none;
  transition: border-color .15s, box-shadow .15s, background .15s;
}
.slx-input::placeholder { color: var(--slx-muted); opacity: .7; }
.slx-input:hover { border-color: var(--slx-border-strong); }
.slx-input:focus-visible {
  background: var(--slx-bg);
  border-color: var(--slx-accent);
  box-shadow: 0 0 0 3.5px var(--slx-accent-soft);
}
.slx-hint { font-size: 12px; color: var(--slx-muted); margin-top: 5px; }
.slx-error-text {
  font-size: 13px; color: var(--slx-danger);
  background: color-mix(in srgb, var(--slx-danger) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--slx-danger) 26%, transparent);
  border-left: 3px solid var(--slx-danger);
  border-radius: var(--slx-radius-sm);
  padding: 10px 12px; margin: 0 0 16px; line-height: 1.45;
}
.slx-setup-note {
  font-size: 12px; line-height: 1.45;
  color: #7a5c00;
  background: #fff7dc;
  border: 1px solid #f3e3a0;
  border-radius: var(--slx-radius-sm);
  padding: 9px 11px; margin: 0 0 16px;
}
.slyxup-root:not(.slyxup-light) .slx-setup-note {
  color: #f5d878; background: rgba(250,204,21,.07); border-color: rgba(250,204,21,.25);
}
.slx-setup-note code {
  font-family: var(--slx-mono); font-size: 11px;
  background: rgba(0,0,0,.05); border-radius: 4px; padding: 1px 4px;
}
.slyxup-root:not(.slyxup-light) .slx-setup-note code { background: rgba(255,255,255,.08); }

/* ── Primary button ── */
.slx-btn {
  width: 100%; box-sizing: border-box;
  font-family: var(--slx-font); font-size: 14px; font-weight: 600; letter-spacing: 0.01em;
  color: #fff; background: linear-gradient(180deg, #23232e 0%, #0a0a0f 100%);
  border: 1px solid #0a0a0f; border-radius: var(--slx-radius);
  padding: 11px 14px; cursor: pointer;
  box-shadow: 0 1px 2px rgba(10,10,15,.35), inset 0 1px 0 rgba(255,255,255,.08);
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  transition: filter .15s, transform .06s, box-shadow .15s;
}
.slx-btn:hover { filter: brightness(1.22); }
.slx-btn:active { transform: scale(.985); filter: brightness(.92); }
.slx-btn:focus-visible { outline: none; box-shadow: 0 0 0 3.5px rgba(10,10,15,.16), 0 0 0 1.5px #0a0a0f; }
.slx-btn[disabled] { opacity: .55; cursor: not-allowed; }
@media (prefers-color-scheme: dark) {
  .slyxup-root:not(.slyxup-light) .slx-btn {
    background: linear-gradient(180deg, #ffffff 0%, #ececf1 100%);
    color: #0a0a0f; border-color: #ececf1;
    box-shadow: 0 1px 2px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.9);
  }
  .slyxup-root:not(.slyxup-light) .slx-btn:hover { filter: brightness(.94); }
}
.slx-spinner {
  width: 15px; height: 15px; flex: none;
  border: 2px solid rgba(255,255,255,.35); border-top-color: #fff;
  border-radius: 50%; animation: slx-spin .7s linear infinite;
}
.slyxup-root:not(.slyxup-light) .slx-spinner { border-color: rgba(10,10,15,.25); border-top-color: #0a0a0f; }

/* ── Social ── */
.slx-social { display: grid; gap: 9px; margin-bottom: 4px; }
.slx-social-btn {
  width: 100%; box-sizing: border-box;
  font: inherit; font-size: 13.5px; font-weight: 550;
  color: var(--slx-ink); background: var(--slx-bg);
  border: 1px solid var(--slx-border-strong); border-radius: var(--slx-radius);
  padding: 10px 14px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  transition: background .15s, border-color .15s, transform .06s, box-shadow .15s;
}
.slx-social-btn:hover {
  background: var(--slx-bg-subtle);
  border-color: var(--slx-border-strong);
  box-shadow: 0 2px 8px -2px rgba(18,18,28,.12);
}
.slx-social-btn:active { transform: scale(.985); }
.slx-social-btn:focus-visible { outline: none; box-shadow: 0 0 0 3.5px var(--slx-accent-soft); }
.slx-social-btn svg { flex: none; }

/* ── Divider & footer ── */
.slx-divider {
  display: flex; align-items: center; gap: 14px;
  color: var(--slx-muted); font-size: 11.5px;
  letter-spacing: .04em; text-transform: uppercase;
  margin: 18px 0;
}
.slx-divider::before, .slx-divider::after {
  content: ""; height: 1px; flex: 1;
  background: linear-gradient(90deg, transparent, var(--slx-border-strong));
}
.slx-divider::after { background: linear-gradient(90deg, var(--slx-border-strong), transparent); }
.slx-footer { font-size: 13px; color: var(--slx-muted); margin-top: 22px; text-align: center; }
.slx-link {
  color: var(--slx-accent); font-weight: 600; text-decoration: none; cursor: pointer;
  background: none; border: none; font: inherit; font-size: inherit;
  padding: 0; margin: 0;
}
.slx-link:hover { text-decoration: underline; color: var(--slx-accent-hover); }
.slx-link:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--slx-accent-soft); border-radius: 4px; }
.slx-forgot { font-size: 12px; }

/* ── Success state ── */
.slx-success-icon {
  width: 48px; height: 48px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--slx-success) 12%, transparent);
  color: var(--slx-success); margin: 4px auto 18px;
  animation: slx-pop .45s cubic-bezier(.22,.9,.32,1) both;
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--slx-success) 6%, transparent);
}

/* ── User button ── */
.slx-userbtn-wrap { position: relative; display: inline-block; }
.slx-userbtn-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid var(--slx-border); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 650; color: #fff;
  background: linear-gradient(135deg, var(--slx-accent), #8b5cf6);
  padding: 0; overflow: hidden;
  transition: box-shadow .15s, transform .06s;
}
.slx-userbtn-avatar:hover { box-shadow: 0 0 0 3px var(--slx-accent-soft); }
.slx-userbtn-avatar:active { transform: scale(.96); }
.slx-userbtn-avatar img { width: 100%; height: 100%; object-fit: cover; }
.slx-userbtn-avatar:focus-visible { outline: none; box-shadow: 0 0 0 3.5px var(--slx-accent-soft); }
.slx-menu {
  position: absolute; right: 0; top: calc(100% + 8px);
  min-width: 240px;
  background: var(--slx-bg);
  border: 1px solid var(--slx-border);
  border-radius: var(--slx-radius-lg);
  box-shadow: var(--slx-shadow-pop);
  overflow: hidden; z-index: 1000;
  animation: slx-rise .22s cubic-bezier(.22,.9,.32,1) both;
}
.slx-menu-header { padding: 14px 16px; border-bottom: 1px solid var(--slx-border); background: var(--slx-bg-subtle); }
.slx-menu-name { font-size: 14px; font-weight: 600; margin: 0 0 2px; color: var(--slx-ink-strong); }
.slx-menu-email { font-size: 12.5px; color: var(--slx-muted); margin: 0; word-break: break-all; }
.slx-menu-item {
  display: block; width: 100%; text-align: left; box-sizing: border-box;
  font: inherit; font-size: 13.5px; color: var(--slx-ink);
  background: none; border: none; padding: 10px 16px; cursor: pointer;
  transition: background .12s;
}
.slx-menu-item:hover { background: color-mix(in srgb, var(--slx-ink) 4%, transparent); }
.slx-menu-item:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--slx-accent-soft); }
.slx-menu-item-danger { color: var(--slx-danger); }
.slx-menu-item-danger:hover { background: color-mix(in srgb, var(--slx-danger) 7%, transparent); }

/* ── Badge (verified etc.) ── */
.slx-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600; letter-spacing: .02em;
  padding: 2.5px 9px; border-radius: 999px;
  color: var(--slx-success);
  background: color-mix(in srgb, var(--slx-success) 9%, transparent);
  border: 1px solid color-mix(in srgb, var(--slx-success) 30%, transparent);
}
`;

let injected = false;

/** Inject the SlyxUp stylesheet + fonts once per document. Idempotent + SSR-safe. */
export function injectStyles(): void {
  if (typeof document === 'undefined') return;
  // Design tokens are scoped to .slyxup-root — apply to <html> so the
  // components work in ANY host app without a wrapper element.
  document.documentElement.classList.add('slyxup-root');
  if (!document.querySelector('style[data-slyxup="styles"]')) {
    if (!document.querySelector('link[href*="DM+Sans"]')) {
      const fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href =
        'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Space+Grotesk:wght@400;500;600;700&display=swap';
      document.head.appendChild(fontLink);
    }
    const style = document.createElement('style');
    style.setAttribute('data-slyxup', 'styles');
    style.textContent = CSS;
    document.head.appendChild(style);
    injected = true;
  } else {
    injected = true;
  }
}

/** Test hook — whether styles are present. */
export function stylesInjected(): boolean {
  return injected;
}
