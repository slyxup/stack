/**
 * SlyxUp UI — design tokens + stylesheet.
 * Injected once via <SlyxUpStyles />. Theme with CSS variables on :root or .slyxup-scope.
 */

export const FONT_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">`;

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=Space+Grotesk:wght@400;500;600;700&display=swap');

.slyxup-root {
  --slx-accent: #5b5bd6;
  --slx-accent-hover: #4c4cc4;
  --slx-accent-soft: rgba(91, 91, 214, 0.14);
  --slx-bg: #ffffff;
  --slx-bg-page: #e9eaf6;
  --slx-ink: #16161d;
  --slx-muted: #6f6f7b;
  --slx-border: #d8d8e8;
  --slx-danger: #d64550;
  --slx-radius: 12px;
  --slx-font: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --slx-display: "Space Grotesk", "DM Sans", sans-serif;
  --slx-mono: ui-monospace, SFMono-Regular, Menlo, monospace;

  font-family: var(--slx-font);
  color: var(--slx-ink);
  -webkit-font-smoothing: antialiased;
}
@media (prefers-color-scheme: dark) {
  .slyxup-root:not(.slyxup-light) {
    --slx-accent: #8484f2;
    --slx-accent-hover: #9696f5;
    --slx-accent-soft: rgba(132, 132, 242, 0.14);
    --slx-bg: #191920;
    --slx-bg-page: #121218;
    --slx-ink: #f2f2f5;
    --slx-muted: #9a9aa6;
    --slx-border: #2c2c36;
    --slx-danger: #f0737d;
  }
}

@keyframes slx-shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-4px); }
  40%, 60% { transform: translateX(4px); }
}
@keyframes slx-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .slyxup-root * { animation: none !important; transition: none !important; }
}

/* ── Card ── */
.slx-card {
  width: 100%;
  max-width: 380px;
  background: var(--slx-bg);
  border: 1px solid var(--slx-border);
  border-radius: calc(var(--slx-radius) + 4px);
  padding: 32px;
  box-shadow: 0 4px 12px rgba(16,16,29,.08), 0 16px 40px rgba(16,16,29,.12), 0 0 0 1px rgba(16,16,29,.04);
  box-sizing: border-box;
}
.slyxup-root .slx-card { background: #ffffff; }
.slx-card-error { animation: slx-shake .45s cubic-bezier(.36,.07,.19,.97) both; }

/* ── Header / keyhole mark ── */
.slx-mark {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--slx-accent), #9a6cf0);
  margin-bottom: 18px;
}
.slx-mark svg { display: block; }
.slx-title { font-family: var(--slx-display); font-size: 20px; font-weight: 650; letter-spacing: -0.02em; margin: 0 0 6px; }
.slx-subtitle { font-size: 13.5px; color: var(--slx-muted); margin: 0 0 22px; line-height: 1.5; }

/* ── Fields ── */
.slx-field { margin-bottom: 14px; }
.slx-label { display: block; font-size: 12.5px; font-weight: 550; margin-bottom: 6px; letter-spacing: 0.01em; }
.slx-input {
  width: 100%; box-sizing: border-box;
  font: inherit; font-size: 14px; color: var(--slx-ink);
  background: transparent;
  border: 1px solid var(--slx-border);
  border-radius: var(--slx-radius);
  padding: 10px 12px;
  outline: none;
  transition: border-color .15s, box-shadow .15s;
}
.slx-input::placeholder { color: var(--slx-muted); opacity: .75; }
.slx-input:focus-visible {
  border-color: var(--slx-accent);
  box-shadow: 0 0 0 3px var(--slx-accent-soft);
}
.slx-hint { font-size: 12px; color: var(--slx-muted); margin-top: 5px; }
.slx-error-text {
  font-size: 13px; color: var(--slx-danger);
  background: color-mix(in srgb, var(--slx-danger) 9%, transparent);
  border-radius: 8px; padding: 9px 11px; margin: 0 0 14px; line-height: 1.4;
}

/* ── Button ── */
.slx-btn {
  width: 100%; box-sizing: border-box;
  font-family: var(--slx-font); font-size: 14px; font-weight: 600; letter-spacing: 0.01em;
  color: #fff; background: var(--slx-accent);
  border: none; border-radius: var(--slx-radius);
  padding: 11px 14px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  transition: background .15s, transform .06s;
}
.slx-btn:hover { background: var(--slx-accent-hover); }
.slx-btn:active { transform: scale(.985); }
.slx-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--slx-accent-soft), 0 0 0 1px var(--slx-accent); }
.slx-btn[disabled] { opacity: .6; cursor: not-allowed; }
.slx-spinner {
  width: 15px; height: 15px; flex: none;
  border: 2px solid rgba(255,255,255,.35); border-top-color: #fff;
  border-radius: 50%; animation: slx-spin .7s linear infinite;
}

/* ── Social ── */
.slx-social { display: grid; gap: 10px; margin-bottom: 16px; }
.slx-social-btn {
  width: 100%; box-sizing: border-box;
  font: inherit; font-size: 13.5px; font-weight: 550;
  color: var(--slx-ink); background: var(--slx-bg);
  border: 1px solid var(--slx-border); border-radius: var(--slx-radius);
  padding: 10px 14px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  transition: background .15s, border-color .15s;
}
.slx-social-btn:hover { background: color-mix(in srgb, var(--slx-ink) 4%, var(--slx-bg)); }
.slx-social-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--slx-accent-soft); }

/* ── Divider & footer ── */
.slx-divider {
  display: flex; align-items: center; gap: 12px;
  color: var(--slx-muted); font-size: 12px;
  margin: 18px 0;
}
.slx-divider::before, .slx-divider::after {
  content: ""; height: 1px; flex: 1; background: var(--slx-border);
}
.slx-footer { font-size: 13px; color: var(--slx-muted); margin-top: 20px; text-align: center; }
.slx-link {
  color: var(--slx-accent); font-weight: 600; text-decoration: none; cursor: pointer;
  background: none; border: none; font: inherit; font-size: inherit;
  padding: 0; margin: 0;
}
.slx-link:hover { text-decoration: underline; color: var(--slx-accent-hover); }
.slx-link:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--slx-accent-soft); border-radius: 4px; }

/* ── Success state ── */
.slx-success-icon {
  width: 46px; height: 46px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, #34a853 12%, transparent);
  color: #34a853; margin: 4px auto 18px;
}

/* ── User button ── */
.slx-userbtn-wrap { position: relative; display: inline-block; }
.slx-userbtn-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid var(--slx-border); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 650; color: #fff;
  background: linear-gradient(135deg, var(--slx-accent), #9a6cf0);
  padding: 0; overflow: hidden;
}
.slx-userbtn-avatar img { width: 100%; height: 100%; object-fit: cover; }
.slx-userbtn-avatar:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--slx-accent-soft); }
.slx-menu {
  position: absolute; right: 0; top: calc(100% + 8px);
  min-width: 230px;
  background: var(--slx-bg);
  border: 1px solid var(--slx-border);
  border-radius: var(--slx-radius);
  box-shadow: 0 8px 30px rgba(10,10,20,.14);
  overflow: hidden; z-index: 1000;
}
.slx-menu-header { padding: 14px 16px; border-bottom: 1px solid var(--slx-border); }
.slx-menu-name { font-size: 14px; font-weight: 600; margin: 0 0 2px; }
.slx-menu-email { font-size: 12.5px; color: var(--slx-muted); margin: 0; word-break: break-all; }
.slx-menu-item {
  display: block; width: 100%; text-align: left; box-sizing: border-box;
  font: inherit; font-size: 13.5px; color: var(--slx-ink);
  background: none; border: none; padding: 10px 16px; cursor: pointer;
}
.slx-menu-item:hover { background: color-mix(in srgb, var(--slx-ink) 5%, transparent); }
.slx-menu-item:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--slx-accent-soft); }
.slx-menu-item-danger { color: var(--slx-danger); }
`;

let injected = false;

/** Inject the SlyxUp stylesheet + DM Sans font once per document. */
export function injectStyles(): void {
  if (injected || typeof document === 'undefined') return;
  // DM Sans font link
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
}
