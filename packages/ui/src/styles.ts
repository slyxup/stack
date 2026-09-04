/**
 * SlyxUp UI — design tokens + stylesheet.
 * Injected automatically by every SlyxUp component. Theme by overriding
 * CSS variables on :root or .slyxup-scope.
 */

export const FONT_LINK = '';

export const CSS = `
.slyxup-root {
  /* ── Tokens ── */
  --slx-accent: #5b5bd6;
  --slx-accent-hover: #4c4cc4;
  --slx-accent-soft: rgba(91, 91, 214, 0.12);
  --slx-accent-2: #8b5cf6;
  --slx-bg: #ffffff;
  --slx-bg-subtle: #f7f7fb;
  --slx-bg-page: #e9eaf6;
  --slx-ink: #16161d;
  --slx-ink-strong: #0c0c12;
  --slx-muted: #6f6f7b;
  --slx-border: #e3e3ee;
  --slx-border-strong: #d3d3e2;
  --slx-danger: #cc333f;
  --slx-success: #177245;
  --slx-radius-sm: 8px;
  --slx-radius: 10px;
  --slx-radius-lg: 14px;
  --slx-font: inherit;
  --slx-display: inherit;
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
  .slyxup-root:not(.slyxup-light):not([data-slyxup-theme='light']):not([data-slyxup-theme='light']) {
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
.slyxup-root:not(.slyxup-light):not([data-slyxup-theme='light']) .slx-card,
.slx-card { color: var(--slx-ink); }
.slx-card-error { animation: slx-shake .45s cubic-bezier(.36,.07,.19,.97) both; }

/* ── Header / keyhole mark ── */
.slx-mark {
  width: 46px; height: 46px; border-radius: 13px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(140deg, color-mix(in srgb, var(--slx-accent) 78%, #0c0c12) 0%, color-mix(in srgb, var(--slx-accent-2) 55%, #0c0c12) 100%);
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
.slyxup-root:not(.slyxup-light):not([data-slyxup-theme='light']) .slx-setup-note {
  color: #f5d878; background: rgba(250,204,21,.07); border-color: rgba(250,204,21,.25);
}
.slx-setup-note code {
  font-family: var(--slx-mono); font-size: 11px;
  background: rgba(0,0,0,.05); border-radius: 4px; padding: 1px 4px;
}
.slyxup-root:not(.slyxup-light):not([data-slyxup-theme='light']) .slx-setup-note code { background: rgba(255,255,255,.08); }

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
  .slyxup-root:not(.slyxup-light):not([data-slyxup-theme='light']) .slx-btn {
    background: linear-gradient(180deg, #ffffff 0%, #ececf1 100%);
    color: #0a0a0f; border-color: #ececf1;
    box-shadow: 0 1px 2px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.9);
  }
  .slyxup-root:not(.slyxup-light):not([data-slyxup-theme='light']) .slx-btn:hover { filter: brightness(.94); }
}
.slx-spinner {
  width: 15px; height: 15px; flex: none;
  border: 2px solid rgba(255,255,255,.35); border-top-color: #fff;
  border-radius: 50%; animation: slx-spin .7s linear infinite;
}
.slyxup-root:not(.slyxup-light):not([data-slyxup-theme='light']) .slx-spinner { border-color: rgba(10,10,15,.25); border-top-color: #0a0a0f; }

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
  background: linear-gradient(135deg, color-mix(in srgb, var(--slx-accent) 78%, #0c0c12), color-mix(in srgb, var(--slx-accent-2) 55%, #0c0c12));
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
.slx-badge-ok { color: var(--slx-success); background: color-mix(in srgb, var(--slx-success) 9%, transparent); border-color: color-mix(in srgb, var(--slx-success) 30%, transparent); }
.slx-badge-warn { color: #b45309; background: color-mix(in srgb, #f59e0b 10%, transparent); border-color: color-mix(in srgb, #f59e0b 30%, transparent); }
.slx-badge-accent { color: var(--slx-accent); background: var(--slx-accent-soft); border-color: color-mix(in srgb, var(--slx-accent) 30%, transparent); }
.slyxup-root:not(.slyxup-light):not([data-slyxup-theme='light']) .slx-badge-warn { color: #fbbf24; }

/* ── Modal overlay ── */
.slx-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(12, 12, 18, 0.55);
  backdrop-filter: blur(6px);
  animation: slx-rise .2s cubic-bezier(.22,.9,.32,1) both;
  padding: 16px;
  overflow-y: auto;
  box-sizing: border-box;
}

/* ── UserProfile ── */
.slx-profile-modal {
  display: flex; flex-direction: column;
  width: 720px; max-width: calc(100vw - 32px);
  max-height: min(85vh, 720px);
  background: var(--slx-bg);
  border-radius: var(--slx-radius-lg);
  box-shadow: var(--slx-shadow-pop);
  overflow: hidden;
  animation: slx-rise .28s cubic-bezier(.22,.9,.32,1) both;
  box-sizing: border-box;
}
.slx-profile-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 22px 28px 18px;
  border-bottom: 1px solid var(--slx-border);
  flex-shrink: 0;
  background: var(--slx-bg);
  position: relative;
  z-index: 1;
}
.slx-profile-title {
  font-family: var(--slx-display);
  font-size: 18px; font-weight: 650; letter-spacing: -0.02em;
  color: var(--slx-ink-strong);
  margin: 0;
}
.slx-profile-close {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  background: none; border: 1px solid var(--slx-border);
  color: var(--slx-muted); cursor: pointer; font-size: 16px;
  transition: background .12s, color .12s, border-color .12s;
  position: relative;
  z-index: 2;
  pointer-events: auto;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.slx-profile-close:hover { background: var(--slx-bg-subtle); color: var(--slx-ink); border-color: var(--slx-border-strong); }
.slx-profile-close:active { transform: scale(.95); }
.slx-profile-close:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--slx-accent-soft); }

.slx-profile-body {
  display: flex; flex: 1; min-height: 380px;
  overflow: hidden;
  min-width: 0;
}

/* ── Left nav ── */
.slx-profile-nav {
  width: 200px; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 2px;
  padding: 12px 8px;
  border-right: 1px solid var(--slx-border);
  background: var(--slx-bg-subtle);
}
.slx-profile-nav-btn {
  display: flex; align-items: center; gap: 9px;
  font: inherit; font-size: 13.5px; font-weight: 500;
  color: var(--slx-muted); background: none; border: none;
  border-radius: var(--slx-radius-sm);
  padding: 9px 12px; cursor: pointer; text-align: left;
  transition: background .12s, color .12s;
}
.slx-profile-nav-btn:hover { background: color-mix(in srgb, var(--slx-ink) 5%, transparent); color: var(--slx-ink); }
.slx-profile-nav-btn.on { background: var(--slx-bg); color: var(--slx-ink-strong); font-weight: 600; box-shadow: 0 1px 3px rgba(18,18,28,.06); }
.slx-profile-nav-btn:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--slx-accent-soft); }

/* ── Content area ── */
.slx-profile-content {
  flex: 1; overflow-y: auto; padding: 24px 28px 28px;
}
.slx-profile-sec { margin-bottom: 28px; }
.slx-profile-sec:last-child { margin-bottom: 0; }
.slx-sec-title {
  font-family: var(--slx-display);
  font-size: 14px; font-weight: 600; letter-spacing: -0.01em;
  color: var(--slx-ink-strong);
  margin: 0 0 14px; padding-bottom: 10px;
  border-bottom: 1px solid var(--slx-border);
}

/* ── Avatar ── */
.slx-avatar-row {
  display: flex; align-items: center; gap: 16px;
  margin-bottom: 20px;
}
.slx-avatar-lg {
  width: 64px; height: 64px; border-radius: 50%;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; font-weight: 700; color: #fff;
  background: linear-gradient(135deg, color-mix(in srgb, var(--slx-accent) 78%, #0c0c12), color-mix(in srgb, var(--slx-accent-2) 55%, #0c0c12));
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(91,91,214,.3);
}
.slx-avatar-lg img { width: 100%; height: 100%; object-fit: cover; }

/* ── Row (email etc.) ── */
.slx-row-value { font-size: 14px; font-weight: 500; color: var(--slx-ink-strong); margin: 0; }
.slx-row-label { font-size: 12px; color: var(--slx-muted); margin: 2px 0 0; }

/* ── Sessions ── */
.slx-session {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; border-radius: var(--slx-radius-sm);
  border: 1px solid var(--slx-border);
  background: var(--slx-bg-subtle);
  margin-bottom: 8px;
  transition: border-color .12s;
}
.slx-session:hover { border-color: var(--slx-border-strong); }
.slx-session-meta { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.slx-session-device { font-size: 13.5px; font-weight: 550; color: var(--slx-ink); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.slx-session-sub { font-size: 12px; color: var(--slx-muted); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Pagination ── */
.slx-pagination {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  margin-top: 14px; padding-top: 14px;
  border-top: 1px solid var(--slx-border);
}
.slx-pagination-info { font-size: 12.5px; color: var(--slx-muted); white-space: nowrap; }

/* ── Danger zone ── */
.slx-danger-zone {
  border: 1px solid color-mix(in srgb, var(--slx-danger) 30%, transparent);
  border-radius: var(--slx-radius);
  padding: 18px 20px;
  background: color-mix(in srgb, var(--slx-danger) 4%, transparent);
}
.slx-danger-title {
  font-size: 14px; font-weight: 650; color: var(--slx-danger);
  margin: 0 0 6px;
}
.slx-danger-desc {
  font-size: 13px; color: var(--slx-muted); line-height: 1.5;
  margin: 0 0 16px;
}
.slx-btn-danger-outline {
  font: inherit; font-size: 13px; font-weight: 550;
  color: var(--slx-danger); background: none;
  border: 1px solid color-mix(in srgb, var(--slx-danger) 35%, transparent);
  border-radius: var(--slx-radius-sm);
  padding: 7px 14px; cursor: pointer;
  transition: background .12s, border-color .12s;
}
.slx-btn-danger-outline:hover { background: color-mix(in srgb, var(--slx-danger) 8%, transparent); border-color: var(--slx-danger); }
.slx-btn-danger-outline:active { transform: scale(.98); }
.slx-btn-danger-outline:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--slx-danger) 20%, transparent); }
.slx-btn-danger-outline[disabled] { opacity: .5; cursor: not-allowed; }

/* ── Billing (inside UserProfile) ── */
.slx-billing-card {
  border: 1px solid var(--slx-border);
  border-radius: var(--slx-radius);
  padding: 18px 20px;
  background: var(--slx-bg-subtle);
  margin-bottom: 16px;
}
.slx-billing-plan { font-size: 15px; font-weight: 650; color: var(--slx-ink-strong); margin: 0 0 4px; }
.slx-billing-detail { font-size: 13px; color: var(--slx-muted); margin: 2px 0; }
.slx-billing-status { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; }
.slx-billing-status-active { color: var(--slx-success); }
.slx-billing-status-trialing { color: var(--slx-accent); }
.slx-billing-status-canceled { color: var(--slx-danger); }
.slx-invoice-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 0; border-bottom: 1px solid var(--slx-border);
  font-size: 13px;
  gap: 8px;
  flex-wrap: wrap;
}
.slx-invoice-row:last-child { border-bottom: none; }
.slx-invoice-date { color: var(--slx-muted); }
.slx-invoice-amount { font-weight: 600; color: var(--slx-ink-strong); }

/* ── Billing plans grid (responsive) ── */
.slx-billing-plans {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 12px;
}
.slx-plan-card {
  border: 1px solid var(--slx-border);
  border-radius: var(--slx-radius);
  padding: 16px;
  background: var(--slx-bg);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: border-color .15s, box-shadow .15s;
}
.slx-plan-card:hover { border-color: var(--slx-border-strong); box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.slx-plan-card.popular { border-color: var(--slx-accent); box-shadow: 0 0 0 1px var(--slx-accent-soft); }
.slx-plan-badge {
  position: absolute; top: -10px; right: 12px;
  font-size: 10px; font-weight: 700; letter-spacing: .05em;
  color: #fff; background: linear-gradient(135deg, color-mix(in srgb, var(--slx-accent) 78%, #0c0c12), color-mix(in srgb, var(--slx-accent-2) 55%, #0c0c12));
  padding: 3px 8px; border-radius: 999px;
}
.slx-plan-name { font-size: 14px; font-weight: 600; color: var(--slx-ink-strong); margin: 0 0 6px; }
.slx-plan-price { font-size: 22px; font-weight: 750; letter-spacing: -0.02em; color: var(--slx-ink-strong); }
.slx-plan-interval { font-size: 13px; color: var(--slx-muted); font-weight: 400; }
.slx-plan-features { list-style: none; margin: 12px 0 16px; padding: 0; flex: 1; }
.slx-plan-features li { font-size: 13px; color: var(--slx-ink); padding: 4px 0 4px 20px; position: relative; line-height: 1.45; }
.slx-plan-features li::before { content: "✓"; position: absolute; left: 0; color: var(--slx-success); font-weight: 700; font-size: 12px; }
.slx-plan-cta { width: 100%; margin-top: auto; }
.slx-billing-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.slx-btn-secondary {
  font: inherit; font-size: 13px; font-weight: 550;
  color: var(--slx-ink); background: var(--slx-bg);
  border: 1px solid var(--slx-border-strong); border-radius: var(--slx-radius-sm);
  padding: 8px 14px; cursor: pointer;
  transition: background .12s, border-color .12s;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
}
.slx-btn-secondary:hover { background: var(--slx-bg-subtle); }
.slx-btn-secondary:active { transform: scale(.98); }
.slx-btn-secondary:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--slx-accent-soft); }
.slx-btn-secondary[disabled] { opacity: .55; cursor: not-allowed; }
.slx-billing-empty { text-align: center; padding: 24px 16px; color: var(--slx-muted); font-size: 13px; line-height: 1.5; }

/* ── Mobile friendliness for UserProfile ── */
@media (max-width: 680px) {
  .slx-overlay { align-items: flex-start; padding: 12px; }
  .slx-profile-modal {
    width: 100%; max-width: 100%;
    max-height: calc(100vh - 24px);
    max-height: calc(100dvh - 24px);
    margin: auto;
    border-radius: var(--slx-radius-lg);
  }
  .slx-profile-body { flex-direction: column; min-height: 0; overflow-y: auto; overflow-x: hidden; }
  .slx-profile-nav {
    width: auto; flex-direction: row; overflow-x: auto; overflow-y: hidden;
    border-right: none; border-bottom: 1px solid var(--slx-border);
    padding: 8px; gap: 6px; scrollbar-width: none; -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
    flex-shrink: 0;
  }
  .slx-profile-nav::-webkit-scrollbar { display: none; }
  .slx-profile-nav-btn { white-space: nowrap; flex-shrink: 0; font-size: 13px; padding: 8px 12px; }
  .slx-profile-content { padding: 16px; overflow: visible; }
  .slx-profile-head { padding: 16px 16px 12px; }
  .slx-profile-close { width: 40px; height: 40px; min-width: 40px; min-height: 40px; font-size: 18px; border-radius: 10px; }
  .slx-avatar-row { gap: 12px; flex-wrap: wrap; }
  .slx-billing-plans { grid-template-columns: 1fr; }
  .slx-session { flex-direction: column; align-items: flex-start; gap: 10px; }
  .slx-session .slx-btn-danger-outline { align-self: stretch; text-align: center; justify-content: center; }
  .slx-pagination { flex-wrap: wrap; gap: 6px; }
  .slx-pagination .slx-btn-secondary { font-size: 12px; padding: 4px 10px; }
  .slx-invoice-row { flex-wrap: wrap; gap: 6px; }
}
/* ── Explicit theme mode (wins over OS preference) ── */
.slyxup-root[data-slyxup-theme='dark'] {
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
.slyxup-root[data-slyxup-theme='dark'] .slx-btn {
  background: linear-gradient(180deg, #ffffff 0%, #ececf1 100%);
  color: #0a0a0f; border-color: #ececf1;
  box-shadow: 0 1px 2px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.9);
}
.slyxup-root[data-slyxup-theme='dark'] .slx-btn:hover { filter: brightness(.94); }
.slyxup-root[data-slyxup-theme='dark'] .slx-spinner { border-color: rgba(10,10,15,.25); border-top-color: #0a0a0f; }
.slyxup-root[data-slyxup-theme='dark'] .slx-setup-note {
  color: #f5d878; background: rgba(250,204,21,.07); border-color: rgba(250,204,21,.25);
}
.slyxup-root[data-slyxup-theme='dark'] .slx-setup-note code { background: rgba(255,255,255,.08); }
.slyxup-root[data-slyxup-theme='dark'] .slx-badge-warn { color: #fbbf24; }
.slyxup-root[data-slyxup-theme='light'] {
  --slx-bg: #ffffff;
  --slx-bg-subtle: #f7f7fb;
  --slx-bg-page: #e9eaf6;
  --slx-ink: #16161d;
  --slx-ink-strong: #0c0c12;
  --slx-muted: #6f6f7b;
  --slx-border: #e3e3ee;
  --slx-border-strong: #d3d3e2;
  --slx-danger: #cc333f;
  --slx-success: #177245;
}

/* ── Accent presets (applyTheme or data-slyxup-accent) ── */
.slyxup-root[data-slyxup-accent='mono'] {
  --slx-accent: #101014;
  --slx-accent-hover: #000000;
  --slx-accent-soft: rgba(16, 16, 20, 0.08);
  --slx-accent-2: #3f3f48;
}
@media (prefers-color-scheme: dark) {
  .slyxup-root[data-slyxup-accent='mono']:not([data-slyxup-theme='light']) {
    --slx-accent: #fafafa;
    --slx-accent-hover: #ffffff;
    --slx-accent-soft: rgba(250, 250, 250, 0.14);
    --slx-accent-2: #a1a1aa;
  }
}
.slyxup-root[data-slyxup-theme='dark'][data-slyxup-accent='mono'] {
  --slx-accent: #fafafa;
  --slx-accent-hover: #ffffff;
  --slx-accent-soft: rgba(250, 250, 250, 0.14);
  --slx-accent-2: #a1a1aa;
}
.slyxup-root[data-slyxup-accent='violet'] { --slx-accent: #5b5bd6; --slx-accent-hover: #4c4cc4; --slx-accent-soft: rgba(91,91,214,.12); --slx-accent-2: #8b5cf6; }
.slyxup-root[data-slyxup-accent='blue'] { --slx-accent: #2563eb; --slx-accent-hover: #1d4ed8; --slx-accent-soft: rgba(37,99,235,.12); --slx-accent-2: #60a5fa; }
.slyxup-root[data-slyxup-accent='emerald'] { --slx-accent: #059669; --slx-accent-hover: #047857; --slx-accent-soft: rgba(5,150,105,.12); --slx-accent-2: #34d399; }
.slyxup-root[data-slyxup-accent='amber'] { --slx-accent: #d97706; --slx-accent-hover: #b45309; --slx-accent-soft: rgba(217,119,6,.14); --slx-accent-2: #fbbf24; }
.slyxup-root[data-slyxup-accent='rose'] { --slx-accent: #e11d48; --slx-accent-hover: #be123c; --slx-accent-soft: rgba(225,29,72,.12); --slx-accent-2: #fb7185; }
.slyxup-root[data-slyxup-accent='cyan'] { --slx-accent: #0891b2; --slx-accent-hover: #0e7490; --slx-accent-soft: rgba(8,145,178,.12); --slx-accent-2: #22d3ee; }

/* ── Accent primary button (alternative to the default ink button) ── */
.slx-btn-accent {
  background: linear-gradient(180deg, color-mix(in srgb, var(--slx-accent-hover) 78%, #0c0c12) 0%, color-mix(in srgb, var(--slx-accent-2) 55%, #0c0c12) 100%);
  border-color: var(--slx-accent);
  color: #fff;
  box-shadow: 0 1px 2px rgba(18,18,28,.3), inset 0 1px 0 rgba(255,255,255,.18);
}
.slx-btn-accent:hover { filter: brightness(1.07); }
.slx-btn-accent:active { transform: scale(.985); filter: brightness(.95); }
.slx-btn-accent:focus-visible { outline: none; box-shadow: 0 0 0 3.5px var(--slx-accent-soft); }
.slx-btn-accent .slx-spinner { border-color: rgba(255,255,255,.35); border-top-color: #fff; }

/* ── Primary buttons in brand accent (opt-in via data-slyxup-primary='accent') ── */
.slyxup-root[data-slyxup-primary='accent'] .slx-btn {
  background: linear-gradient(180deg, color-mix(in srgb, var(--slx-accent-hover) 78%, #0c0c12) 0%, color-mix(in srgb, var(--slx-accent-2) 55%, #0c0c12) 100%);
  border-color: var(--slx-accent);
  color: #fff;
  box-shadow: 0 1px 2px rgba(18, 18, 28, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.18);
}
.slyxup-root[data-slyxup-primary='accent'] .slx-btn:hover { filter: brightness(1.07); }
.slyxup-root[data-slyxup-primary='accent'] .slx-btn:active { filter: brightness(0.95); }
.slyxup-root[data-slyxup-primary='accent'] .slx-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3.5px var(--slx-accent-soft);
}
.slyxup-root[data-slyxup-primary='accent'] .slx-btn .slx-spinner {
  border-color: rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
}

/* ── Auth layouts: centered (default) / split / minimal ── */
.slx-form-full { display: contents; }
.slx-card.slx-layout-split {
  max-width: 780px;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1.05fr;
  overflow: hidden;
}
.slx-split-brand {
  background: linear-gradient(150deg, color-mix(in srgb, var(--slx-accent) 78%, #0c0c12) 0%, color-mix(in srgb, var(--slx-accent-2) 55%, #0c0c12) 130%);
  color: #fff;
  padding: 40px 36px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0;
  position: relative;
  overflow: hidden;
}
.slx-split-brand::after {
  content: '';
  position: absolute;
  width: 280px;
  height: 280px;
  right: -90px;
  bottom: -90px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.09);
  pointer-events: none;
}
.slx-split-mark {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 22px;
}
.slx-split-title {
  font-family: var(--slx-display);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.15;
  margin: 0 0 10px;
}
.slx-split-sub { font-size: 14px; line-height: 1.6; opacity: 0.85; margin: 0 0 24px; }
.slx-split-points { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.slx-split-points li {
  font-size: 13.5px;
  font-weight: 500;
  padding-left: 28px;
  position: relative;
  line-height: 1.45;
}
.slx-split-points li::before {
  content: '✓';
  position: absolute;
  left: 0;
  top: 0;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}
.slx-split-form { padding: 36px 36px 32px; min-width: 0; }
.slx-card.slx-layout-minimal {
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 10px 6px;
  max-width: 380px;
  animation: none;
}
.slx-card.slx-layout-minimal .slx-mark { width: 40px; height: 40px; border-radius: 11px; margin-bottom: 16px; }
.slx-card.slx-layout-minimal .slx-subtitle { margin-bottom: 20px; }
.slx-card.slx-layout-minimal .slx-input { background: var(--slx-bg); }
@media (max-width: 680px) {
  .slx-card.slx-layout-split { grid-template-columns: 1fr; max-width: 440px; }
  .slx-split-brand { padding: 26px 24px; }
  .slx-split-brand::after { display: none; }
  .slx-split-title { font-size: 21px; }
  .slx-split-sub { margin-bottom: 0; }
  .slx-split-points { display: none; }
  .slx-split-form { padding: 26px 22px 24px; }
}

/* ── Password field with reveal toggle ── */
.slx-input-wrap { position: relative; }
.slx-input-wrap .slx-input { padding-right: 42px; }
.slx-pw-toggle {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--slx-muted);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.slx-pw-toggle:hover { color: var(--slx-ink); background: color-mix(in srgb, var(--slx-ink) 5%, transparent); }
.slx-pw-toggle:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--slx-accent-soft); }

/* ── Compact density (opt-in via data-slyxup-density='compact') ── */
.slyxup-root[data-slyxup-density='compact'] .slx-card { padding: 24px 24px 20px; }
.slyxup-root[data-slyxup-density='compact'] .slx-mark { width: 38px; height: 38px; margin-bottom: 14px; }
.slyxup-root[data-slyxup-density='compact'] .slx-title { font-size: 19px; }
.slyxup-root[data-slyxup-density='compact'] .slx-subtitle { margin-bottom: 16px; }
.slyxup-root[data-slyxup-density='compact'] .slx-field { margin-bottom: 10px; }
.slyxup-root[data-slyxup-density='compact'] .slx-input { padding: 8px 11px; font-size: 13.5px; }
.slyxup-root[data-slyxup-density='compact'] .slx-btn { padding: 9px 14px; }
.slyxup-root[data-slyxup-density='compact'] .slx-divider { margin: 14px 0; }
.slyxup-root[data-slyxup-density='compact'] .slx-footer { margin-top: 16px; }
.slyxup-root[data-slyxup-density='compact'] .slx-split-form { padding: 24px; }

/* ── Small-screen polish for auth cards & menus ── */
@media (max-width: 460px) {
  .slx-card { padding: 26px 22px 24px; border-radius: var(--slx-radius-lg); }
  .slx-title { font-size: 19px; }
  .slx-menu { min-width: 210px; max-width: calc(100vw - 32px); }
  .slx-social-btn { font-size: 13px; padding: 11px 12px; }
}
@media (max-width: 380px) {
  .slx-profile-content { padding: 12px; }
  .slx-profile-head { padding: 12px 12px 10px; }
  .slx-profile-title { font-size: 16px; }
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
