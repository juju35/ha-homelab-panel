// The panel's stylesheet: the ha-* charter (illustrated 90 px header, pill tabs, borderless tiles with a soft shadow,
// big numbers, no filled buttons), the theme's colours, a night palette with a dark theme. No subgrid, no :has():
// WebKit draws it as Chromium does.
export const HOMELAB_STYLE = `
:host { display:block; min-height:100vh; }
.wrap { --hl-bg:#F2F8F9; --hl-card:var(--card-background-color,#fff); --hl-text:var(--primary-text-color,#1f2328);
  --hl-muted:var(--secondary-text-color,#5b6470); --hl-tile:#F4F6F8; --hl-line:rgba(31,35,40,.08);
  --hl-accent:#0A7680; --hl-accent-soft:rgba(14,154,167,.12); --hl-ok:#1E7F52; --hl-warn:#A35F00; --hl-crit:#C62828;
  --hl-ok-soft:#E5F4EC; --hl-warn-soft:#FFF3E0; --hl-crit-soft:#FDECEC; --hl-shadow:0 1px 2px rgba(31,35,40,.05),0 6px 18px rgba(14,154,167,.07);
  min-height:100vh; background:var(--hl-bg); color:var(--hl-text); font-family:var(--ha-font-family-body,Roboto,"Segoe UI",Helvetica,Arial,sans-serif);
  font-size:14px; -webkit-font-smoothing:antialiased; }
.wrap.night { --hl-bg:var(--primary-background-color,#111418); --hl-tile:rgba(255,255,255,.05); --hl-line:rgba(255,255,255,.08);
  --hl-accent:#4FD0DA; --hl-accent-soft:rgba(79,208,218,.14); --hl-ok:#5FD39B; --hl-warn:#F5B451; --hl-crit:#F58A8A;
  --hl-ok-soft:rgba(95,211,155,.12); --hl-warn-soft:rgba(245,180,81,.12); --hl-crit-soft:rgba(245,138,138,.12); --hl-shadow:0 1px 2px rgba(0,0,0,.3); }
button { font:inherit; color:inherit; cursor:pointer; }
.banner { position:relative; height:90px; overflow:hidden; }
.banner .scene { position:absolute; inset:0; width:100%; height:90px; display:block; }
.htext { position:absolute; left:16px; top:0; bottom:10px; right:72px; display:flex; align-items:center; gap:12px; min-width:0; }
.hicon { width:44px; height:44px; border-radius:50%; background:#fff; display:grid; place-items:center; flex-shrink:0;
  box-shadow:0 2px 8px rgba(14,154,167,.22); color:#0A7680; }
.hicon svg { width:22px; height:22px; }
.htitle { min-width:0; }
.htitle .n { font-size:20px; font-weight:800; letter-spacing:-.01em; color:#1f2328; }
.htitle .s { font-size:13px; color:#3f5560; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.night .htitle .n { color:#fff; } .night .htitle .s { color:rgba(255,255,255,.75); }
.hbtn { position:absolute; right:14px; top:26px; width:38px; height:38px; border-radius:50%; border:0; background:#fff;
  box-shadow:0 1px 4px rgba(31,35,40,.15); display:grid; place-items:center; color:#3f5560; }
.hbtn svg { width:18px; height:18px; }
.pill { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:700; border-radius:999px; padding:4px 10px;
  background:#fff; white-space:nowrap; flex-shrink:0; box-shadow:0 1px 4px rgba(31,35,40,.1); }
.pill i { width:8px; height:8px; border-radius:50%; background:currentColor; }
.pill.ok { color:#1E7F52; } .pill.warn { color:#A35F00; } .pill.crit { color:#C62828; } .pill.na { color:#6b737d; }
.tabs { display:flex; gap:6px; padding:10px 16px; background:var(--hl-card); border-bottom:1px solid var(--hl-line); overflow-x:auto; scrollbar-width:none; }
.tabs button { border:0; background:transparent; border-radius:999px; padding:8px 14px; font-size:13.5px; font-weight:500; color:var(--hl-muted); white-space:nowrap; min-height:36px; }
.tabs button.on { background:var(--hl-accent-soft); color:var(--hl-accent); font-weight:700; }
main { padding:18px 16px 32px; max-width:1400px; margin:0 auto; box-sizing:border-box; }
.grid { display:grid; gap:14px; }
.kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:12px; margin-bottom:14px; }
.cols { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:14px; align-items:start; }
.card { background:var(--hl-card); border-radius:20px; box-shadow:var(--hl-shadow); padding:16px; box-sizing:border-box; min-width:0; }
.card.tight { padding:10px 10px 12px; }
.card h3 { margin:0 0 12px; font-size:15px; font-weight:700; display:flex; align-items:center; justify-content:space-between; gap:8px; }
.card h3 small { font-size:12px; font-weight:500; color:var(--hl-muted); }
.art { height:66px; border-radius:14px; background:var(--hl-tile); overflow:hidden; display:flex; align-items:flex-end; justify-content:center; gap:10px; padding:6px 8px 8px; box-sizing:border-box; margin-bottom:10px; }
.art.scene-art { padding:0; justify-content:flex-end; }
.art svg { display:block; max-height:100%; }
.k { font-size:12px; color:var(--hl-muted); }
.big { font-size:26px; font-weight:800; letter-spacing:-.02em; line-height:1.15; font-variant-numeric:tabular-nums; }
.sub { font-size:12px; font-weight:600; }
.ok { color:var(--hl-ok); } .warn { color:var(--hl-warn); } .crit { color:var(--hl-crit); } .muted { color:var(--hl-muted); }
.nasn { display:flex; flex-direction:column; min-width:0; }
.nasn > * { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.nasn .muted { font-size:12px; }
.rows { display:flex; flex-direction:column; gap:8px; }
.row { display:flex; align-items:center; gap:10px; background:var(--hl-tile); border-radius:12px; padding:9px 12px; font-size:13px; min-width:0; }
.row.bad { background:var(--hl-crit-soft); } .row.mid { background:var(--hl-warn-soft); }
.row .grow { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.row .end { margin-left:auto; text-align:right; white-space:nowrap; font-size:12.5px; }
.dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; background:var(--hl-muted); }
.dot.ok { background:var(--hl-ok); } .dot.warn { background:var(--hl-warn); } .dot.crit { background:var(--hl-crit); }
.bar { display:block; height:8px; border-radius:4px; background:var(--hl-line); overflow:hidden; }
.bar i { display:block; height:100%; border-radius:4px; background:var(--hl-accent); }
.bar.warn i { background:var(--hl-warn); } .bar.crit i { background:var(--hl-crit); } .bar.ok i { background:#0E9AA7; }
.meter { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:8px; font-size:12.5px; }
.pair { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
.tile { background:var(--hl-tile); border-radius:12px; padding:9px; font-size:12px; min-width:0; }
.tile b { display:block; font-size:15px; margin-top:2px; }
.btn { border:1px solid var(--hl-line); background:transparent; border-radius:999px; padding:5px 12px; font-size:12.5px; font-weight:600; min-height:32px; }
.btn.danger { color:var(--hl-crit); border-color:currentColor; }
.btn.accent { color:var(--hl-accent); border-color:currentColor; }
table { width:100%; border-collapse:collapse; font-size:13px; }
th { text-align:left; font-size:11.5px; color:var(--hl-muted); font-weight:600; text-transform:uppercase; letter-spacing:.04em; padding:8px 10px; border-bottom:1px solid var(--hl-line); }
td { padding:9px 10px; border-bottom:1px solid var(--hl-line); }
tr:last-child td { border-bottom:0; }
.scroll { overflow-x:auto; }
.filters { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
.filters button { border:1px solid var(--hl-line); background:var(--hl-card); border-radius:999px; padding:5px 12px; font-size:12.5px; font-weight:600; min-height:32px; color:var(--hl-muted); }
.filters button.on { color:var(--hl-accent); border-color:var(--hl-accent); background:var(--hl-accent-soft); }
.empty { padding:28px 16px; text-align:center; color:var(--hl-muted); }
.set { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:9px 0; border-bottom:1px solid var(--hl-line); font-size:13.5px; }
.set:last-child { border-bottom:0; }
.set input[type=number] { width:64px; font:inherit; padding:4px 6px; border-radius:8px; border:1px solid var(--hl-line); background:var(--hl-card); color:var(--hl-text); }
.set input[type=checkbox] { width:18px; height:18px; accent-color:#0E9AA7; }
.modal { position:fixed; inset:0; background:rgba(0,0,0,.35); display:grid; place-items:center; z-index:10; }
.modal .card { width:min(360px,90vw); }
.modal .acts { display:flex; justify-content:flex-end; gap:8px; margin-top:14px; }
.chips { display:inline-flex; flex-wrap:wrap; gap:6px; align-items:center; }
.chip { display:inline-flex; align-items:center; border:1px solid var(--hl-line); background:transparent; border-radius:999px; padding:2px 9px; font-size:11.5px; font-weight:600; color:var(--hl-muted); white-space:nowrap; max-width:100%; overflow:hidden; text-overflow:ellipsis; }
.chip.ok { color:var(--hl-ok); border-color:color-mix(in srgb, var(--hl-ok) 40%, transparent); }
.chip.warn { color:var(--hl-warn); border-color:color-mix(in srgb, var(--hl-warn) 45%, transparent); }
.chip.crit { color:var(--hl-crit); border-color:color-mix(in srgb, var(--hl-crit) 45%, transparent); }
.card .pill { box-shadow:none; background:var(--hl-tile); }
.nashead { display:flex; align-items:center; gap:14px; margin-bottom:14px; }
.naspic { width:120px; height:72px; flex-shrink:0; border-radius:14px; background:var(--hl-tile); display:flex; align-items:flex-end; justify-content:center; padding:4px 6px 8px; box-sizing:border-box; }
.naspic svg { max-width:100%; display:block; }
.nast { flex:1; min-width:0; }
.nast h3 { margin-bottom:6px; justify-content:flex-start; flex-wrap:wrap; }
.nashead .acts { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
.card h3 .chips { font-weight:500; }
.gauges { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px; }
.gauge { position:relative; overflow:hidden; text-align:left; border:0; background:var(--hl-tile); border-radius:14px; padding:10px 12px 11px; min-height:74px; display:flex; flex-direction:column; justify-content:flex-end; gap:1px; color:inherit; }
.gauge[disabled] { cursor:default; }
.gauge > * { position:relative; }
.gauge .spark { position:absolute; inset:0; width:100%; height:100%; }
.spark polyline { fill:none; stroke:var(--hl-accent); stroke-width:1.4; vector-effect:non-scaling-stroke; opacity:.55; }
.spark polygon { fill:var(--hl-accent); opacity:.08; stroke:none; }
.gauge.warn .spark polyline, .gauge.warn .spark polygon { stroke:var(--hl-warn); fill:var(--hl-warn); }
.gauge.crit .spark polyline, .gauge.crit .spark polygon { stroke:var(--hl-crit); fill:var(--hl-crit); }
.gauge .spark polyline { fill:none; }
.gauge .gl { font-size:12px; color:var(--hl-muted); }
.gauge b { font-size:20px; font-weight:800; letter-spacing:-.01em; font-variant-numeric:tabular-nums; }
.gauge.warn b { color:var(--hl-warn); } .gauge.crit b { color:var(--hl-crit); }
.gauge .gs { font-size:11.5px; color:var(--hl-muted); }
.sect { margin:16px 0 8px; font-weight:600; text-transform:uppercase; letter-spacing:.04em; font-size:11.5px; }
.vol { background:var(--hl-tile); border-radius:12px; padding:10px 12px; display:grid; gap:6px; font-size:13px; }
.vh, .vf { display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; }
.vf { font-size:12px; }
.disks { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:8px; }
.disk { background:var(--hl-tile); border-radius:12px; padding:10px 12px; font-size:12px; display:grid; gap:3px; min-width:0; }
.disk.bad { background:var(--hl-crit-soft); } .disk.mid { background:var(--hl-warn-soft); }
.disk .muted { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.df { display:flex; justify-content:space-between; gap:8px; align-items:baseline; }
.dh { display:flex; align-items:center; gap:8px; font-size:13px; }
.dh b { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.counts { display:grid; grid-template-columns:repeat(auto-fit,minmax(110px,1fr)); gap:8px; margin-top:10px; }
.count { border:0; background:var(--hl-tile); border-radius:12px; padding:8px 12px; text-align:left; display:flex; flex-direction:column; color:inherit; }
.count b { font-size:17px; font-weight:800; } .count span { font-size:12px; color:var(--hl-muted); }
.count.warn b { color:var(--hl-warn); }
.ctr { display:flex; align-items:center; gap:10px; background:var(--hl-tile); border-radius:12px; padding:8px 12px; font-size:13px; min-width:0; }
.ctr.bad { background:var(--hl-crit-soft); } .ctr.mid { background:var(--hl-warn-soft); }
.ctr .grow { flex:1; min-width:0; }
.ctn { display:flex; align-items:center; gap:6px; min-width:0; }
.ctn b { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ctd { font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ctu { font-size:12px; white-space:nowrap; }
.ctb { display:flex; gap:6px; flex-shrink:0; }
.cttools { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:10px; }
.cttools .filters { margin:0; }
.search { font:inherit; font-size:13px; border:1px solid var(--hl-line); border-radius:999px; padding:6px 14px; min-height:32px; background:var(--hl-card); color:var(--hl-text); min-width:200px; flex:1; max-width:320px; }
.btn.warn { color:var(--hl-warn); border-color:currentColor; }
.bkk { grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); }
.bkk .tile b { font-size:18px; }
.bkr { display:flex; align-items:center; gap:12px; background:var(--hl-tile); border-radius:12px; padding:8px 12px; font-size:13px; min-width:0; }
.bkr.bad { background:var(--hl-crit-soft); } .bkr.mid { background:var(--hl-warn-soft); }
.bkr .grow { flex:1; min-width:0; }
.bkring-b { border:0; background:transparent; padding:0; width:44px; height:44px; flex-shrink:0; display:grid; place-items:center; }
.bkring { width:44px; height:44px; }
.bkring circle { fill:none; stroke-width:4; }
.bkring .bg { stroke:var(--hl-line); }
.bkring .fg { stroke:var(--hl-ok); stroke-linecap:round; }
.bkring.warn .fg { stroke:var(--hl-warn); } .bkring.crit .fg { stroke:var(--hl-crit); }
.bkspin { width:32px; height:32px; border-radius:50%; border:4px solid var(--hl-line); border-top-color:var(--hl-accent); animation:hlspin 1s linear infinite; box-sizing:border-box; }
@keyframes hlspin { to { transform:rotate(360deg); } }
@media (prefers-reduced-motion:reduce) { .bkspin { animation:none; } }
@media (max-width:760px) { .ctu { display:none; } .nashead { flex-wrap:wrap; } }
@media (max-width:600px) { .htitle .s { display:none; } main { padding:12px 10px 24px; } .kpis { grid-template-columns:repeat(2,minmax(0,1fr)); } }
`;
