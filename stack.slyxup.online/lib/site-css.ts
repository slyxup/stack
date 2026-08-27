export const SITE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=JetBrains+Mono:wght@400;500;600&display=swap');

/* ── Theme tokens ──
   Dark  (default): dark bg + WHITE primary buttons (dark text on white)
   Light          : light bg + DARK  primary buttons (white text on dark)  */
:root, [data-theme="dark"] {
  color-scheme: dark;
  --bg: #0b0b10;
  --bg-elev: #131319;
  --bg-card: #131319;
  --bg-inset: #0e0e14;
  --border: rgba(255,255,255,.10);
  --border-strong: rgba(255,255,255,.16);
  --text: #f4f5f7;
  --text-dim: #9aa0b0;
  --text-faint: #6b7080;
  --primary: #ffffff;
  --primary-text: #0b0b10;
  --primary-hover: #e7e8ec;
  --primary-weak: rgba(255,255,255,.08);
  --primary-weak-2: rgba(255,255,255,.14);
  --nav-bg: rgba(11,11,16,.72);
  --accent: #c9ccd6;
  --accent-weak: rgba(255,255,255,.06);
  --focus-ring: rgba(255,255,255,.22);
  --glow1: rgba(255,255,255,.05);
  --glow2: rgba(255,255,255,.03);
  --success: #34d399;
  --danger: #f0737d;
  --warn: #f5c451;
}
[data-theme="light"] {
  color-scheme: light;
  --bg: #f5f6f8;
  --bg-elev: #ffffff;
  --bg-card: #ffffff;
  --bg-inset: #eef0f3;
  --border: rgba(10,10,18,.10);
  --border-strong: rgba(10,10,18,.18);
  --text: #14161d;
  --text-dim: #565b69;
  --text-faint: #8b90a0;
  --primary: #0b0b10;
  --primary-text: #ffffff;
  --primary-hover: #2a2d38;
  --primary-weak: rgba(10,10,18,.06);
  --primary-weak-2: rgba(10,10,18,.12);
  --nav-bg: rgba(255,255,255,.78);
  --accent: #4b5060;
  --accent-weak: rgba(10,10,18,.05);
  --focus-ring: rgba(10,10,18,.20);
  --glow1: rgba(10,10,18,.04);
  --glow2: rgba(10,10,18,.025);
  --success: #0f9d6b;
  --danger: #d23b47;
  --warn: #b07a12;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  line-height: 1.6;
  transition: background .2s, color .2s;
}
code, pre, .mono { font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
a { color: inherit; text-decoration: none; }
h1,h2,h3,h4 { font-family: "Space Grotesk", "DM Sans", sans-serif; }

.wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }

/* Nav */
.nav {
  position: sticky; top: 0; z-index: 50;
  backdrop-filter: blur(16px) saturate(1.4);
  background: var(--nav-bg);
  border-bottom: 1px solid var(--border);
}
.nav-in { display: flex; align-items: center; justify-content: space-between; height: 60px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 700; letter-spacing: -0.02em; font-size: 16px; font-family:"Space Grotesk",sans-serif; }
.brand-mark {
  width: 26px; height: 26px; border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  background: var(--primary);
}
.brand-mark svg { width: 14px; height: 14px; }
.brand-mark svg path, .brand-mark svg { stroke: var(--primary-text); }
.nav-links { display: flex; gap: 28px; font-size: 14px; color: var(--text-dim); font-weight: 450; }
.nav-links a:hover { color: var(--text); }
.nav-cta {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 13px; font-weight: 600; font-family:"JetBrains Mono",monospace;
  background: var(--primary); color: var(--primary-text); padding: 7px 14px; border-radius: 8px;
  transition: background .15s;
}
.nav-cta:hover { background: var(--primary-hover); }
.nav-right { display:flex; align-items:center; gap:14px; }
.theme-toggle {
  width:34px; height:34px; border-radius:8px; cursor:pointer;
  display:inline-flex; align-items:center; justify-content:center;
  background: var(--primary-weak); border:1px solid var(--border); color: var(--text);
  transition: border-color .15s, background .15s;
}
.theme-toggle:hover { border-color: var(--border-strong); background: var(--primary-weak-2); }
.theme-toggle svg { width:16px; height:16px; }
@media (max-width: 720px) { .nav-links { display: none; } }

/* Hero */
.hero { position: relative; padding: 100px 0 64px; text-align: center; overflow: hidden; }
.hero::before {
  content: ""; position: absolute; inset: -30% -20% auto;
  height: 800px;
  background:
    radial-gradient(ellipse 700px 400px at 25% 15%, var(--glow1), transparent),
    radial-gradient(ellipse 600px 350px at 75% 5%, var(--glow2), transparent);
  pointer-events: none;
}
.hero > * { position: relative; }
.eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: "JetBrains Mono", monospace;
  font-size: 11.5px; color: var(--text-dim);
  border: 1px solid var(--border-strong); border-radius: 999px;
  padding: 5px 14px; margin-bottom: 28px;
  background: var(--primary-weak);
  text-transform: uppercase; letter-spacing: 0.08em;
}
.eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); box-shadow: 0 0 8px var(--success); }
h1.display {
  font-size: clamp(42px, 6.5vw, 68px);
  line-height: 1.04; letter-spacing: -0.035em; font-weight: 650;
  margin-bottom: 22px; color: var(--text);
}
.grad {
  background: linear-gradient(105deg, var(--text), var(--text-faint));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.hero-sub { font-size: 17px; color: var(--text-dim); max-width: 580px; margin: 0 auto 38px; line-height:1.65; }
.hero-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 68px; }
.btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 600; font-family:"JetBrains Mono",monospace;
  color: var(--primary-text); background: var(--primary);
  padding: 13px 26px; border-radius: 10px; border: 1px solid transparent;
  transition: transform .08s, background .15s, box-shadow .2s;
  box-shadow: 0 2px 10px rgba(0,0,0,.12);
}
.btn-primary:hover { background: var(--primary-hover); box-shadow: 0 4px 18px rgba(0,0,0,.18); }
.btn-primary:active { transform: scale(.98); }
.btn-secondary {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 550; color: var(--text);
  border: 1px solid var(--border-strong); padding: 13px 22px; border-radius: 10px;
  background: var(--primary-weak);
  transition: border-color .15s, background .15s;
}
.btn-secondary:hover { border-color: var(--text-faint); background: var(--primary-weak-2); }

/* Terminal */
.term {
  max-width: 720px; margin: 0 auto; text-align: left;
  background: var(--bg-inset);
  border: 1px solid var(--border-strong); border-radius: 14px;
  box-shadow: 0 32px 100px rgba(0,0,0,.18);
  overflow: hidden;
}
.term-bar {
  display: flex; align-items: center; gap: 7px;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
}
.term-dot { width: 11px; height: 11px; border-radius: 50%; }
.term-title { margin-left: 10px; font-family: "JetBrains Mono", monospace; font-size: 11.5px; color: var(--text-faint); }
.term-body {
  padding: 20px 22px; min-height: 250px;
  font-family: "JetBrains Mono", monospace; font-size: 13px; line-height: 1.8;
}
.t-prompt { color: var(--success); }
.t-cmd { color: var(--text); }
.t-ok { color: var(--success); }
.t-dim { color: var(--text-faint); }
.t-info { color: var(--accent); }
.cursor { display: inline-block; width: 8px; height: 15px; background: var(--accent); vertical-align: text-bottom; animation: blink 1s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }

/* Stats */
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; max-width: 720px; margin: -30px auto 0; position: relative; z-index: 2; padding: 0 24px;}
.stat { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 18px 10px; text-align: center; }
.stat-num { font-size: 26px; font-weight: 750; letter-spacing: -0.02em; font-family:"Space Grotesk",sans-serif; color: var(--text); }
.stat-lbl { font-size: 12px; color: var(--text-dim); font-family:"JetBrains Mono",monospace; }
@media (max-width: 640px) { .stats { grid-template-columns: 1fr; } }

/* Sections */
.section { padding: 96px 0; }
.sec-head { text-align: center; margin-bottom: 56px; }
.sec-kicker { font-family: "JetBrains Mono", monospace; font-size: 11.5px; color: var(--text-dim); letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 14px; }
.sec-title { font-size: clamp(30px, 4vw, 42px); font-weight: 650; letter-spacing: -0.03em; margin-bottom: 14px; color: var(--text); }
.sec-sub { color: var(--text-dim); font-size: 16px; max-width: 540px; margin: 0 auto; line-height:1.65; }

.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
@media (max-width: 900px) { .grid3 { grid-template-columns: 1fr; } .grid2 { grid-template-columns: 1fr; } }

.card {
  background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px;
  padding: 26px; transition: border-color .25s, transform .25s;
}
.card:hover { border-color: var(--border-strong); transform: translateY(-3px); }
.card-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: var(--primary-weak); color: var(--accent);
  margin-bottom: 18px;
}
.card-icon svg { width: 19px; height: 19px; }
.card h3 { font-size: 15.5px; font-weight: 600; margin-bottom: 8px; letter-spacing: -0.01em; color: var(--text); }
.card p { font-size: 13.5px; color: var(--text-dim); line-height: 1.65; }

/* Code block */
.codeblock {
  background: var(--bg-inset); border: 1px solid var(--border); border-radius: 14px;
  padding: 20px 22px;
  font-family: "JetBrains Mono", monospace; font-size: 13px; line-height: 1.75;
  overflow-x: auto; white-space: pre; color: var(--text);
}
.c-kw { color: #c792ea; } .c-str { color: #a5d6a7; } .c-fn { color: #82aaff; } .c-cm { color: var(--text-faint); }

/* Pricing */
.price-card { text-align: left; display: flex; flex-direction: column; }
.price-card.hot { border-color: var(--border-strong); box-shadow: 0 0 60px rgba(0,0,0,.10); position: relative; }
.badge-hot {
  position: absolute; top: -11px; right: 20px;
  font-family: "JetBrains Mono", monospace; font-size: 10.5px;
  background: var(--primary); color: var(--primary-text);
  padding: 3px 10px; border-radius: 999px;
}
.price { font-size: 42px; font-weight: 750; letter-spacing: -0.03em; margin: 8px 0 2px; font-family:"Space Grotesk",sans-serif; color: var(--text); }
.price small { font-size: 14px; font-weight: 400; color: var(--text-dim); letter-spacing: 0; }
.feat-list { list-style: none; margin: 18px 0 26px; flex: 1; }
.feat-list li { font-size: 13.5px; color: var(--text-dim); padding: 6px 0 6px 26px; position: relative; }
.feat-list li::before { content: ""; position: absolute; left: 2px; top: 11px; width: 14px; height: 14px; border-radius: 50%; background: var(--primary-weak); }
.feat-list li::after { content: ""; position: absolute; left: 5.5px; top: 14.5px; width: 7px; height: 4px; border-left: 1.8px solid var(--success); border-bottom: 1.8px solid var(--success); transform: rotate(-45deg); }
.btn-block { display: block; width: 100%; text-align: center; }

/* CTA band */
.cta-band {
  text-align: center;
  border-top: 1px solid var(--border);
  padding: 88px 0;
  background: radial-gradient(ellipse 500px 250px at 50% 100%, var(--glow1), transparent);
}

/* Footer */
footer { border-top: 1px solid var(--border); padding: 44px 0; color: var(--text-faint); font-size: 13px; }
.foot-in { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.foot-links { display: flex; gap: 22px; }
.foot-links a:hover { color: var(--text); }

/* Docs shell */
.docs-shell { display: flex; gap: 44px; padding: 40px 24px 80px; align-items: flex-start; }
.docs-side {
  width: 252px; flex-shrink: 0; position: sticky; top: 84px;
  max-height: calc(100vh - 120px); overflow-y: auto;
  scrollbar-width: thin; scrollbar-color: var(--border-strong) transparent;
}
.doc-search { position: relative; margin-bottom: 22px; }
.doc-search input {
  width: 100%; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
  color: var(--text); font-size: 13px; padding: 9px 12px 9px 33px; outline: none;
  font-family: "DM Sans", sans-serif; transition: border-color .15s, box-shadow .15s;
}
.doc-search input::placeholder { color: var(--text-faint); }
.doc-search input:focus { border-color: var(--border-strong); box-shadow: 0 0 0 3px var(--focus-ring); }
.doc-search svg { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; color: var(--text-faint); pointer-events: none; }
.side-sec { margin-bottom: 28px; }
.side-kicker { font-family: "JetBrains Mono", monospace; font-size: 10.5px; color: var(--text-dim); text-transform: uppercase; letter-spacing: .12em; margin-bottom: 8px; padding-left: 10px; }
.side-link {
  display: block; font-size: 13.5px; color: var(--text-dim); padding: 6px 10px; border-radius: 8px;
  transition: color .15s, background .15s;
}
.side-link:hover { color: var(--text); background: var(--primary-weak); }
.side-link.on { color: var(--text); background: var(--primary-weak-2); font-weight: 500; }
.side-empty { font-size: 12.5px; color: var(--text-faint); padding: 6px 10px; }
.docs-article { flex: 1; min-width: 0; max-width: 760px; }
.docs-article > div > h2, .docs-article h2 { scroll-margin-top: 84px; }
@media (max-width: 920px) {
  .docs-shell { flex-direction: column; gap: 28px; }
  .docs-side { position: static; width: 100%; max-height: none; }
}

/* Framework switcher */
.fw-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.fw-tabs { display: inline-flex; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 3px; gap: 2px; }
.fw-tab {
  font-family: "JetBrains Mono", monospace; font-size: 11.5px; font-weight: 550; color: var(--text-dim);
  border: none; background: transparent; border-radius: 7px; padding: 5px 12px; cursor: pointer;
  transition: color .15s, background .15s;
}
.fw-tab:hover { color: var(--text); }
.fw-tab.on { color: var(--primary-text); background: var(--primary); }
.fw-note { font-family: "JetBrains Mono", monospace; font-size: 11px; color: var(--text-faint); margin-top: -8px; margin-bottom: 20px; }

/* Docs landing cards */
.d-section { margin-bottom: 44px; }
.d-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
@media (max-width: 720px) { .d-grid { grid-template-columns: 1fr; } }
.d-card {
  position: relative; display: block; background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 14px; padding: 18px 42px 18px 20px;
  transition: border-color .2s, transform .2s, box-shadow .2s;
}
.d-card:hover { border-color: var(--border-strong); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,.10); }
.d-card h3 { font-size: 14.5px; font-weight: 600; margin-bottom: 5px; letter-spacing: -.01em; color: var(--text); }
.d-card p { font-size: 13px; color: var(--text-dim); line-height: 1.55; }
.d-card .arr {
  position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
  color: var(--text-faint); font-size: 16px; transition: color .2s, transform .2s;
}
.d-card:hover .arr { color: var(--accent); transform: translateY(-50%) translateX(3px); }

/* Prev / Next pager */
.pager { display: flex; gap: 14px; margin-top: 60px; }
.pager a {
  flex: 1; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px;
  padding: 14px 18px; transition: border-color .2s;
}
.pager a:hover { border-color: var(--border-strong); }
.pager .dir { display: block; font-family: "JetBrains Mono", monospace; font-size: 10.5px; color: var(--text-dim); text-transform: uppercase; letter-spacing: .1em; margin-bottom: 4px; }
.pager .ttl { font-size: 14px; font-weight: 600; color: var(--text); }
.pager .nx { text-align: right; }
.pager .sgl { flex: 1; }
.pager .empty { flex: 1; visibility: hidden; }

/* Docs prose polish */
.prose-p { color: var(--text-dim); line-height: 1.75; margin: 10px 0 18px; font-size: 14.5px; }
.prose-note {
  background: var(--primary-weak); border: 1px solid var(--border);
  border-radius: 12px; padding: 14px 18px; font-size: 13.5px; color: var(--text);
  line-height: 1.65; margin: 20px 0;
}
.prose-note b { color: var(--text); }
code.inl {
  font-family: "JetBrains Mono", monospace; font-size: 12px; color: var(--text);
  background: var(--primary-weak); border: 1px solid var(--border);
  border-radius: 6px; padding: 1.5px 6px;
}
.h-doc { font-family: "Space Grotesk", sans-serif; font-size: 32px; font-weight: 700; letter-spacing: -.03em; color: var(--text); }
.h-sec { font-size: 19px; font-weight: 700; margin-top: 36px; letter-spacing: -.01em; color: var(--text); }

/* ── Shared form controls (used in dashboard) ── */
.input, .cin {
  width:100%; box-sizing:border-box; font:inherit; font-size:14px; color: var(--text);
  background: var(--bg-inset); border:1px solid var(--border); border-radius:10px; padding:10px 12px; outline:none;
  transition: border-color .15s, box-shadow .15s;
}
.input:focus, .cin:focus { border-color: var(--border-strong); box-shadow:0 0 0 3px var(--focus-ring); }
.select {
  width:100%; box-sizing:border-box; font:inherit; font-size:14px; color: var(--text);
  background: var(--bg-inset); border:1px solid var(--border); border-radius:10px; padding:10px 12px; outline:none;
}
.label { display:block; font-size:12.5px; color: var(--text-dim); margin-bottom:6px; font-weight:500; }
.hint { font-size:12px; color: var(--text-faint); }
.err { color: var(--danger); font-size:13px; }
.msg { background: var(--primary-weak); border:1px solid var(--border); color: var(--text); font-size:13.5px; border-radius:10px; padding:10px 14px; }
`;
