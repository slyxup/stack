export const SITE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root { color-scheme: dark; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #09090f;
  color: #eceef2;
  -webkit-font-smoothing: antialiased;
  line-height: 1.6;
}
code, pre, .mono { font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
a { color: inherit; text-decoration: none; }
h1,h2,h3,h4 { font-family: "Space Grotesk", "DM Sans", sans-serif; }

.wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }

/* Nav */
.nav {
  position: sticky; top: 0; z-index: 50;
  backdrop-filter: blur(16px) saturate(1.4);
  background: rgba(9,9,15,.72);
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.nav-in { display: flex; align-items: center; justify-content: space-between; height: 60px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 700; letter-spacing: -0.02em; font-size: 16px; font-family:"Space Grotesk",sans-serif; }
.brand-mark {
  width: 26px; height: 26px; border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #6366f1, #a855f7);
}
.brand-mark svg { width: 14px; height: 14px; }
.nav-links { display: flex; gap: 28px; font-size: 14px; color: #7c8195; font-weight: 450; }
.nav-links a:hover { color: #eceef2; }
.nav-cta {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 13px; font-weight: 600; font-family:"JetBrains Mono",monospace;
  background: #6366f1; padding: 7px 14px; border-radius: 8px;
  transition: background .15s;
}
.nav-cta:hover { background: #4f52e0; }
@media (max-width: 720px) { .nav-links { display: none; } }

/* Hero */
.hero { position: relative; padding: 100px 0 64px; text-align: center; overflow: hidden; }
.hero::before {
  content: ""; position: absolute; inset: -30% -20% auto;
  height: 800px;
  background:
    radial-gradient(ellipse 700px 400px at 25% 15%, rgba(99,102,241,.12), transparent),
    radial-gradient(ellipse 600px 350px at 75% 5%, rgba(168,85,247,.09), transparent);
  pointer-events: none;
}
.hero > * { position: relative; }
.eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: "JetBrains Mono", monospace;
  font-size: 11.5px; color: #a5b4fc;
  border: 1px solid rgba(99,102,241,.25); border-radius: 999px;
  padding: 5px 14px; margin-bottom: 28px;
  background: rgba(99,102,241,.06);
  text-transform: uppercase; letter-spacing: 0.08em;
}
.eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; box-shadow: 0 0 8px rgba(52,211,153,.6); }
h1.display {
  font-size: clamp(42px, 6.5vw, 68px);
  line-height: 1.04; letter-spacing: -0.035em; font-weight: 650;
  margin-bottom: 22px; color:#fff;
}
.grad {
  background: linear-gradient(105deg, #818cf8 0%, #a78bfa 40%, #e879f9 80%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.hero-sub { font-size: 17px; color: #7c8195; max-width: 580px; margin: 0 auto 38px; line-height:1.65; }
.hero-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 68px; }
.btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 600; font-family:"JetBrains Mono",monospace;
  color: #fff; background: linear-gradient(135deg, #6366f1, #8b5cf6);
  padding: 13px 26px; border-radius: 10px;
  transition: transform .08s, filter .15s, box-shadow .2s;
  box-shadow: 0 4px 20px rgba(99,102,241,.18);
}
.btn-primary:hover { filter: brightness(1.1); box-shadow: 0 0 0 1px rgba(99,102,241,.3), 0 6px 32px rgba(99,102,241,.28); }
.btn-primary:active { transform: scale(.98); }
.btn-secondary {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 550; color: #b6bac9;
  border: 1px solid rgba(255,255,255,.12); padding: 13px 22px; border-radius: 10px;
  transition: border-color .15s, background .15s;
}
.btn-secondary:hover { border-color: rgba(255,255,255,.25); background: rgba(255,255,255,.03); }

/* Terminal */
.term {
  max-width: 720px; margin: 0 auto; text-align: left;
  background: #0e101a;
  border: 1px solid #232635; border-radius: 14px;
  box-shadow: 0 32px 100px rgba(99,102,241,.1), 0 4px 16px rgba(0,0,0,.5);
  overflow: hidden;
}
.term-bar {
  display: flex; align-items: center; gap: 7px;
  padding: 12px 16px; border-bottom: 1px solid #1d2130;
}
.term-dot { width: 11px; height: 11px; border-radius: 50%; }
.term-title { margin-left: 10px; font-family: "JetBrains Mono", monospace; font-size: 11.5px; color: #4b5069; }
.term-body {
  padding: 20px 22px; min-height: 250px;
  font-family: "JetBrains Mono", monospace; font-size: 13px; line-height: 1.8;
}
.t-prompt { color: #34d399; }
.t-cmd { color: #eceef2; }
.t-ok { color: #34d399; }
.t-dim { color: #4b5069; }
.t-info { color: #a5b4fc; }
.cursor { display: inline-block; width: 8px; height: 15px; background: #a5b4fc; vertical-align: text-bottom; animation: blink 1s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }

/* Stats */
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; max-width: 720px; margin: -30px auto 0; position: relative; z-index: 2; padding: 0 24px;}
.stat { background: #10121b; border: 1px solid #1d2130; border-radius: 14px; padding: 18px 10px; text-align: center; }
.stat-num { font-size: 26px; font-weight: 750; letter-spacing: -0.02em; font-family:"Space Grotesk",sans-serif; }
.stat-lbl { font-size: 12px; color: #7c8195; font-family:"JetBrains Mono",monospace; }
@media (max-width: 640px) { .stats { grid-template-columns: 1fr; } }

/* Sections */
.section { padding: 96px 0; }
.sec-head { text-align: center; margin-bottom: 56px; }
.sec-kicker { font-family: "JetBrains Mono", monospace; font-size: 11.5px; color: #6366f1; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 14px; }
.sec-title { font-size: clamp(30px, 4vw, 42px); font-weight: 650; letter-spacing: -0.03em; margin-bottom: 14px; }
.sec-sub { color: #7c8195; font-size: 16px; max-width: 540px; margin: 0 auto; line-height:1.65; }

.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
@media (max-width: 900px) { .grid3 { grid-template-columns: 1fr; } .grid2 { grid-template-columns: 1fr; } }

.card {
  background: #10121b; border: 1px solid #1d2130; border-radius: 16px;
  padding: 26px; transition: border-color .25s, transform .25s;
}
.card:hover { border-color: rgba(99,102,241,.35); transform: translateY(-3px); }
.card-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(99,102,241,.1); color: #a5b4fc;
  margin-bottom: 18px;
}
.card-icon svg { width: 19px; height: 19px; }
.card h3 { font-size: 15.5px; font-weight: 600; margin-bottom: 8px; letter-spacing: -0.01em; }
.card p { font-size: 13.5px; color: #7c8195; line-height: 1.65; }

/* Code block */
.codeblock {
  background: #0e101a; border: 1px solid #1d2130; border-radius: 14px;
  padding: 20px 22px;
  font-family: "JetBrains Mono", monospace; font-size: 13px; line-height: 1.75;
  overflow-x: auto; white-space: pre;
}
.c-kw { color: #c792ea; } .c-str { color: #a5d6a7; } .c-fn { color: #82aaff; } .c-cm { color: #4b5069; }

/* Pricing */
.price-card { text-align: left; display: flex; flex-direction: column; }
.price-card.hot { border-color: rgba(99,102,241,.5); box-shadow: 0 0 60px rgba(99,102,241,.08); position: relative; }
.badge-hot {
  position: absolute; top: -11px; right: 20px;
  font-family: "JetBrains Mono", monospace; font-size: 10.5px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff;
  padding: 3px 10px; border-radius: 999px;
}
.price { font-size: 42px; font-weight: 750; letter-spacing: -0.03em; margin: 8px 0 2px; font-family:"Space Grotesk",sans-serif; }
.price small { font-size: 14px; font-weight: 400; color: #7c8195; letter-spacing: 0; }
.feat-list { list-style: none; margin: 18px 0 26px; flex: 1; }
.feat-list li { font-size: 13.5px; color: #9ca3b8; padding: 6px 0 6px 26px; position: relative; }
.feat-list li::before { content: ""; position: absolute; left: 2px; top: 11px; width: 14px; height: 14px; border-radius: 50%; background: rgba(52,211,153,.12); }
.feat-list li::after { content: ""; position: absolute; left: 5.5px; top: 14.5px; width: 7px; height: 4px; border-left: 1.8px solid #34d399; border-bottom: 1.8px solid #34d399; transform: rotate(-45deg); }
.btn-block { display: block; width: 100%; text-align: center; }

/* CTA band */
.cta-band {
  text-align: center;
  border-top: 1px solid rgba(255,255,255,.06);
  padding: 88px 0;
  background: radial-gradient(ellipse 500px 250px at 50% 100%, rgba(99,102,241,.1), transparent);
}

/* Footer */
footer { border-top: 1px solid rgba(255,255,255,.06); padding: 44px 0; color: #4b5069; font-size: 13px; }
.foot-in { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.foot-links { display: flex; gap: 22px; }
.foot-links a:hover { color: #eceef2; }
`;
