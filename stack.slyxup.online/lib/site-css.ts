export const SITE_CSS = `
:root { color-scheme: dark; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: #0b0d14;
  color: #eef0f6;
  -webkit-font-smoothing: antialiased;
  line-height: 1.6;
}
code, pre, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
a { color: inherit; text-decoration: none; }

.wrap { max-width: 1080px; margin: 0 auto; padding: 0 24px; }

/* ── Nav ── */
.nav {
  position: sticky; top: 0; z-index: 50;
  backdrop-filter: blur(12px);
  background: rgba(11,13,20,.78);
  border-bottom: 1px solid #1d2130;
}
.nav-in { display: flex; align-items: center; justify-content: space-between; height: 64px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 700; letter-spacing: -0.02em; font-size: 16px; }
.brand-mark {
  width: 28px; height: 28px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #6c6ce8, #9a6cf0);
  font-size: 14px;
}
.nav-links { display: flex; gap: 26px; font-size: 14px; color: #8a90a3; }
.nav-links a:hover { color: #eef0f6; }
.nav-cta {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13.5px; font-weight: 600;
  background: linear-gradient(135deg, #6c6ce8, #9a6cf0);
  padding: 8px 16px; border-radius: 10px;
}
.nav-cta:hover { filter: brightness(1.1); }
@media (max-width: 720px) { .nav-links { display: none; } }

/* ── Hero ── */
.hero { position: relative; padding: 96px 0 72px; text-align: center; overflow: hidden; }
.hero::before {
  content: ""; position: absolute; inset: -40% -20% auto;
  height: 700px;
  background:
    radial-gradient(600px 300px at 30% 20%, rgba(108,108,232,.18), transparent),
    radial-gradient(500px 260px at 70% 10%, rgba(154,108,240,.14), transparent);
  pointer-events: none;
}
.hero > * { position: relative; }
.eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12.5px; color: #9fa5ff;
  border: 1px solid #2b2f45; border-radius: 999px;
  padding: 6px 14px; margin-bottom: 26px;
  background: rgba(108,108,232,.07);
}
.eyebrow .dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; }
h1.display {
  font-size: clamp(38px, 6vw, 62px);
  line-height: 1.06; letter-spacing: -0.03em; font-weight: 750;
  margin-bottom: 20px;
}
.grad {
  background: linear-gradient(100deg, #6c6ce8 10%, #9a6cf0 55%, #e879f9 95%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.hero-sub { font-size: 17.5px; color: #8a90a3; max-width: 620px; margin: 0 auto 34px; }
.hero-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; margin-bottom: 64px; }
.btn-primary {
  display: inline-flex; align-items: center; gap: 9px;
  font-size: 15px; font-weight: 650; color: #fff;
  background: linear-gradient(135deg, #6c6ce8, #9a6cf0);
  padding: 13px 24px; border-radius: 12px;
  transition: transform .08s, filter .15s;
}
.btn-primary:hover { filter: brightness(1.12); }
.btn-primary:active { transform: scale(.98); }
.btn-ghost {
  display: inline-flex; align-items: center; gap: 9px;
  font-size: 15px; font-weight: 550; color: #eef0f6;
  border: 1px solid #2b2f45; padding: 13px 22px; border-radius: 12px;
}
.btn-ghost:hover { border-color: #3a3f58; background: rgba(255,255,255,.02); }

/* ── Terminal ── */
.term {
  max-width: 720px; margin: 0 auto; text-align: left;
  background: #10121b;
  border: 1px solid #232635; border-radius: 14px;
  box-shadow: 0 24px 80px rgba(108,108,232,.12), 0 4px 16px rgba(0,0,0,.4);
  overflow: hidden;
}
.term-bar {
  display: flex; align-items: center; gap: 7px;
  padding: 12px 16px; border-bottom: 1px solid #232635;
}
.term-dot { width: 11px; height: 11px; border-radius: 50%; }
.term-title { margin-left: 10px; font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: #565c73; }
.term-body {
  padding: 20px 22px; min-height: 250px;
  font-family: ui-monospace, Menlo, monospace; font-size: 13.5px; line-height: 1.75;
}
.t-prompt { color: #4ade80; }
.t-cmd { color: #eef0f6; }
.t-ok { color: #4ade80; }
.t-dim { color: #565c73; }
.t-info { color: #9fa5ff; }
.cursor { display: inline-block; width: 8px; height: 15px; background: #9fa5ff; vertical-align: text-bottom; animation: blink 1s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }

/* ── Stats strip ── */
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 720px; margin: -30px auto 0; position: relative; z-index: 2; padding: 0 24px;}
.stat { background: #12141d; border: 1px solid #232635; border-radius: 14px; padding: 18px 10px; text-align: center; }
.stat-num { font-size: 24px; font-weight: 750; letter-spacing: -0.02em; }
.stat-lbl { font-size: 12.5px; color: #8a90a3; font-family: ui-monospace, Menlo, monospace; }
@media (max-width: 640px) { .stats { grid-template-columns: 1fr; } }

/* ── Sections ── */
.section { padding: 88px 0; }
.sec-head { text-align: center; margin-bottom: 54px; }
.sec-kicker { font-family: ui-monospace, Menlo, monospace; font-size: 12.5px; color: #6c6ce8; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 12px; }
.sec-title { font-size: clamp(28px, 4vw, 40px); font-weight: 720; letter-spacing: -0.025em; margin-bottom: 14px; }
.sec-sub { color: #8a90a3; font-size: 16px; max-width: 560px; margin: 0 auto; }

.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
@media (max-width: 900px) { .grid3 { grid-template-columns: 1fr; } .grid2 { grid-template-columns: 1fr; } }

.card {
  background: #12141d; border: 1px solid #232635; border-radius: 16px;
  padding: 26px; transition: border-color .2s, transform .2s;
}
.card:hover { border-color: #3a3f58; transform: translateY(-2px); }
.card-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(108,108,232,.12); color: #9fa5ff;
  font-size: 19px; margin-bottom: 16px;
}
.card h3 { font-size: 16px; font-weight: 650; margin-bottom: 8px; letter-spacing: -0.01em; }
.card p { font-size: 14px; color: #8a90a3; line-height: 1.65; }

/* ── Code block ── */
.codeblock {
  background: #10121b; border: 1px solid #232635; border-radius: 14px;
  padding: 20px 22px;
  font-family: ui-monospace, Menlo, monospace; font-size: 13px; line-height: 1.7;
  overflow-x: auto; white-space: pre;
}
.c-kw { color: #c792ea; } .c-str { color: #a5d6a7; } .c-fn { color: #82aaff; } .c-cm { color: #565c73; } .c-pr { color: #f78c6c; }

/* ── Pricing ── */
.price-card { text-align: left; display: flex; flex-direction: column; }
.price-card.hot { border-color: #6c6ce8; box-shadow: 0 0 60px rgba(108,108,232,.12); position: relative; }
.badge-hot {
  position: absolute; top: -11px; right: 20px;
  font-family: ui-monospace, Menlo, monospace; font-size: 11px;
  background: linear-gradient(135deg, #6c6ce8, #9a6cf0); color: #fff;
  padding: 3px 10px; border-radius: 999px;
}
.price { font-size: 40px; font-weight: 750; letter-spacing: -0.03em; margin: 6px 0 2px; }
.price small { font-size: 14.5px; font-weight: 450; color: #8a90a3; letter-spacing: 0; }
.feat-list { list-style: none; margin: 18px 0 26px; flex: 1; }
.feat-list li { font-size: 14px; color: #b6bac9; padding: 6px 0 6px 26px; position: relative; }
.feat-list li::before { content: "✓"; position: absolute; left: 2px; color: #4ade80; font-weight: 700; }
.btn-block { display: block; width: 100%; text-align: center; }

/* ── CTA band ── */
.cta-band {
  text-align: center;
  border-top: 1px solid #1d2130;
  padding: 80px 0;
  background: radial-gradient(500px 200px at 50% 100%, rgba(108,108,232,.12), transparent);
}

/* ── Footer ── */
footer { border-top: 1px solid #1d2130; padding: 44px 0; color: #565c73; font-size: 13.5px; }
.foot-in { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.foot-links { display: flex; gap: 22px; }
.foot-links a:hover { color: #eef0f6; }
`;
