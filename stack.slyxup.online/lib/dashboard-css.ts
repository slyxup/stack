export const DASHBOARD_CSS = `
.dash { display:flex; min-height:100vh; background:var(--bg); }
.dash-side {
  width:262px; flex-shrink:0; background:var(--bg-elev); border-right:1px solid var(--border);
  position:sticky; top:0; height:100vh; overflow-y:auto; display:flex; flex-direction:column;
  padding:18px 16px; scrollbar-width:thin; scrollbar-color:var(--border-strong) transparent;
}
.dash-brand { display:flex; align-items:center; gap:10px; font-weight:700; font-family:"Space Grotesk",sans-serif; font-size:16px; padding:6px 8px 16px; }
.dash-brand .brand-mark { width:26px; height:26px; border-radius:7px; display:flex; align-items:center; justify-content:center; background:var(--primary); }
.dash-brand .brand-mark svg { width:14px; height:14px; }
.side-section { margin-bottom:18px; }
.side-kicker { font-family:"JetBrains Mono",monospace; font-size:10px; text-transform:uppercase; letter-spacing:.12em; color:var(--text-faint); padding:0 8px 8px; }
.nav-item {
  display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:9px;
  font-size:13.5px; color:var(--text-dim); transition:background .15s,color .15s; margin-bottom:2px;
}
.nav-item:hover { background:var(--primary-weak); color:var(--text); }
.nav-item.on { background:var(--primary-weak-2); color:var(--text); font-weight:550; }
.nav-item svg { width:16px; height:16px; }
.mini-user {
  display:flex; align-items:center; gap:9px; padding:7px 10px; border-radius:9px; color:var(--text-dim);
  font-size:13px; transition:background .15s,color .15s;
}
.mini-user:hover { background:var(--primary-weak); color:var(--text); }
.mini-av { width:24px; height:24px; border-radius:50%; background:var(--primary-weak-2); color:var(--accent); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; flex-shrink:0; }
.mini-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mini-blocked { margin-left:auto; width:7px; height:7px; border-radius:50%; background:var(--danger); }

.dash-main { flex:1; min-width:0; display:flex; flex-direction:column; }
.dash-top {
  height:60px; position:sticky; top:0; z-index:20; display:flex; align-items:center; justify-content:space-between;
  padding:0 28px; background:var(--nav-bg); backdrop-filter:blur(16px) saturate(1.4); border-bottom:1px solid var(--border);
}
.dash-top .who { font-family:"JetBrains Mono",monospace; font-size:13px; color:var(--text-dim); }
.proj-switch {
  font:inherit; font-size:13px; color:var(--text); background:var(--bg-inset);
  border:1px solid var(--border); border-radius:9px; padding:7px 12px; max-width:280px; cursor:pointer;
}
.top-actions { display:flex; align-items:center; gap:10px; }
.dash-content { padding:30px 28px 70px; max-width:1120px; width:100%; }
.crumb { font-family:"JetBrains Mono",monospace; font-size:11.5px; color:var(--text-faint); margin-bottom:18px; }
.crumb a:hover { color:var(--text); }
.page-title { font-size:26px; font-weight:650; letter-spacing:-.02em; margin-bottom:4px; }
.page-sub { color:var(--text-dim); font-size:14px; margin-bottom:24px; }

.panel { background:var(--bg-card); border:1px solid var(--border); border-radius:14px; padding:20px; margin-bottom:18px; }
.panel h3 { font-size:15px; font-weight:600; margin-bottom:14px; }
.panel-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; flex-wrap:wrap; }
.panel-head h3 { margin-bottom:0; }

.stat-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:14px; margin-bottom:18px; }
.stat { background:var(--bg-card); border:1px solid var(--border); border-radius:14px; padding:16px 18px; }
.stat-label { font-size:11px; color:var(--text-faint); text-transform:uppercase; letter-spacing:.08em; margin-bottom:6px; }
.stat-value { font-family:"Space Grotesk",sans-serif; font-size:24px; font-weight:650; }

.dtable { width:100%; border-collapse:collapse; font-size:13px; }
.dtable th { text-align:left; color:var(--text-faint); font-weight:500; font-size:11px; text-transform:uppercase; letter-spacing:.06em; padding:9px 12px; border-bottom:1px solid var(--border); }
.dtable td { padding:11px 12px; border-bottom:1px solid var(--border); vertical-align:middle; }
.dtable tr:last-child td { border-bottom:none; }
.dtable tbody tr:hover { background:var(--primary-weak); }
.cell-main { font-weight:550; color:var(--text); }
.cell-sub { color:var(--text-faint); font-size:12px; }

.pill { display:inline-block; font-size:11px; padding:2px 9px; border-radius:999px; border:1px solid var(--border-strong); color:var(--text-dim); }
.pill.good { color:var(--success); border-color:var(--success); }
.pill.bad { color:var(--danger); border-color:var(--danger); }
.pill.warn { color:var(--warn); border-color:var(--warn); }
.pill.info { color:var(--accent); border-color:var(--accent); }

.row-actions { display:flex; gap:8px; flex-wrap:wrap; }

.detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
@media (max-width:760px){ .detail-grid { grid-template-columns:1fr; } }
.kv { display:flex; justify-content:space-between; gap:12px; padding:9px 0; border-bottom:1px solid var(--border); font-size:13.5px; }
.kv:last-child { border-bottom:none; }
.kv .k { color:var(--text-faint); }
.kv .v { color:var(--text); text-align:right; word-break:break-word; }

.avatar { width:54px; height:54px; border-radius:50%; background:var(--primary-weak-2); color:var(--accent); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:18px; }

.billing-plan { border:1px solid var(--border); border-radius:14px; padding:20px; background:var(--bg-card); display:flex; flex-direction:column; gap:6px; }
.billing-plan.hot { border-color:var(--border-strong); }
.billing-plan .pname { font-size:16px; font-weight:600; }
.billing-plan .pamt { font-size:28px; font-weight:700; font-family:"Space Grotesk",sans-serif; }
.billing-plan .pamt small { font-size:13px; font-weight:400; color:var(--text-dim); }
.billing-plan .pfeat { list-style:none; font-size:13px; color:var(--text-dim); margin:8px 0 14px; display:flex; flex-direction:column; gap:6px; }
.billing-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:14px; }
.paid-badge { font-size:11px; font-family:"JetBrains Mono",monospace; color:var(--success); }

.toolbar { display:flex; align-items:center; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
.spacer { flex:1; }
.empty { text-align:center; color:var(--text-faint); font-size:13.5px; padding:40px 0; }
.linkish { background:none; border:none; color:var(--accent); font:inherit; cursor:pointer; text-decoration:underline; padding:0; }

.c-btn { padding:8px 14px; font-size:13px; cursor:pointer; border-radius:8px; }
.btn-secondary.danger { border-color:var(--danger); color:var(--danger); }
.btn-secondary.danger:hover { background:var(--primary-weak-2); }
.snippet { background:var(--bg-inset); border:1px solid var(--border); border-radius:10px; padding:14px; font-size:12.5px; overflow-x:auto; white-space:pre-wrap; }
`;
