// The tabs' HTML: Overview, Hosts, Containers, Storage, Services, Backups and Settings. Every value read from a state
// or a registry is escaped (homelabEsc); actions are buttons carrying data-act, handled by the panel.
import {
  HOMELAB_PLATFORM_NAMES,
  HOMELAB_SOURCES,
  homelabAgo,
  homelabBar,
  homelabBytes,
  homelabDuration,
  homelabEsc,
  homelabFmt,
} from "./core.js";
import { HOMELAB_DOCKER_SVG, HOMELAB_PVE_SVG, HOMELAB_UPS_SVG, homelabNasSvg, homelabSized, homelabUid } from "./drawings.js";

const homelabArt = (svg, uid, cls = "") => `<div class="art ${cls}">${homelabSized(homelabUid(svg, uid), cls ? "xMaxYMax meet" : "xMidYMax meet")}</div>`;
const homelabNasArt = (list, uid) =>
  `<div class="art">${list
    .slice(0, 3)
    .map((n, i) => {
      const svg = homelabUid(homelabNasSvg(n.model, n.brand), `${uid}${i}`);
      const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
      const ratio = vb ? +vb[1] / +vb[2] : 1.4;
      const h = list.length > 1 ? (ratio > 2.2 ? 30 : 50) : ratio > 2.2 ? 36 : 52;
      return svg.replace(/^<svg\b/, `<svg height="${h}" width="${Math.round(h * ratio)}" aria-hidden="true" focusable="false"`);
    })
    .join("")}</div>`;
// The Services and Certificates tiles' pictures: a monitor with its heartbeat, a certificate with its seal
const HOMELAB_SERVICES_ART = `<svg viewBox="0 0 120 60" aria-hidden="true" focusable="false"><rect x="30" y="6" width="60" height="38" rx="5" fill="#2B3540"/><rect x="34" y="10" width="52" height="30" rx="2" fill="#E6F6F7"/><path d="M38 27h10l4-9 6 17 5-12 3 4h12" fill="none" stroke="#0E9AA7" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="54" y="44" width="12" height="7" fill="#3E4A57"/><rect x="44" y="51" width="32" height="4" rx="2" fill="#3E4A57"/><circle cx="94" cy="12" r="6" fill="#1E8E5A"/><path d="m91 12 2 2 4-4" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const HOMELAB_CERT_ART = `<svg viewBox="0 0 120 60" aria-hidden="true" focusable="false"><rect x="28" y="8" width="64" height="44" rx="4" fill="#FFFFFF" stroke="#C9D6DA" stroke-width="1.5"/><rect x="36" y="16" width="34" height="3" rx="1.5" fill="#9FB3BA"/><rect x="36" y="24" width="26" height="3" rx="1.5" fill="#C9D6DA"/><rect x="36" y="31" width="30" height="3" rx="1.5" fill="#C9D6DA"/><circle cx="80" cy="38" r="9" fill="#F5B451"/><circle cx="80" cy="38" r="5" fill="#FFD772"/><path d="m75 45-2 10 7-4 7 4-2-10" fill="#E0A100"/></svg>`;
const homelabIconArt = (svg) => `<div class="art">${svg.replace("<svg ", '<svg height="54" ')}</div>`;
const pct = (v, lang) => (v === null ? "—" : `${homelabFmt(v, lang)} %`);
const empty = (text) => `<div class="card empty">${homelabEsc(text)}</div>`;

/** A button pressing an entity's button or toggling its switch (data-act), confirmed by the panel when asked. */
const actBtn = (t, act, entity, name, op, cls = "accent") =>
  entity
    ? `<button class="btn ${cls}" data-act="${act}" data-op="${op}" data-entity="${homelabEsc(entity)}" data-name="${homelabEsc(name)}" data-label="${homelabEsc(t(op))}">${homelabEsc(t(op))}</button>`
    : "";

const statusDot = (good) => `<span class="dot ${good === null ? "" : good ? "ok" : "crit"}"></span>`;

// ── Overview ────────────────────────────────────────────────────────────────────────────────────────────────────────
const kpi = (art, label, big, sub, subCls) =>
  `<div class="card tight">${art}<div style="padding:0 4px"><div class="k">${homelabEsc(label)}</div><div class="big">${big}</div><div class="sub ${subCls}">${homelabEsc(sub)}</div></div></div>`;

export const homelabOverview = (m, c) => {
  const { t, lang } = c;
  const k = [];
  if (m.hosts.length) {
    const up = m.hosts.filter((h) => h.up).length;
    k.push(kpi(homelabArt(HOMELAB_PVE_SVG, "k-pve"), t("k_hosts"), `${up} / ${m.hosts.length}`, up === m.hosts.length ? t("online") : t("offline"), up === m.hosts.length ? "ok" : "crit"));
  }
  if (m.containers.length || m.dockerHosts.length) {
    const total = m.containers.length || m.dockerHosts.reduce((a, d) => a + (d.total ?? 0), 0);
    const running = m.containers.length ? m.containers.filter((x) => x.up).length : m.dockerHosts.reduce((a, d) => a + (d.running ?? 0), 0);
    const stopped = total - running;
    k.push(kpi(homelabArt(HOMELAB_DOCKER_SVG, "k-dk", "scene-art"), t("k_containers"), `${running} / ${total}`, stopped ? t("stopped_n", { n: stopped }) : t("all_running"), stopped ? "crit" : "ok"));
  }
  if (m.nas.length) {
    const healthy = m.nas.filter((n) => n.healthy && !n.disks.some((d) => !d.ok || d.hot)).length;
    const big = m.nas.length > 1 ? `${healthy} / ${m.nas.length}` : pct(m.nas[0].pct, lang);
    k.push(kpi(homelabNasArt(m.nas, "k-nas"), t("k_nas"), big, healthy === m.nas.length ? t("healthy") : t("attention"), healthy === m.nas.length ? "ok" : "warn"));
  }
  if (m.ups.length) {
    const u = m.ups[0];
    k.push(kpi(homelabArt(HOMELAB_UPS_SVG, "k-ups"), t("k_ups"), homelabEsc(homelabDuration(u.runtime, c.strings)), u.onBattery ? t("on_battery") : t("on_mains"), u.onBattery ? "warn" : "ok"));
  }
  if (m.services.length) {
    const up = m.services.filter((s) => s.status === "up").length;
    const down = m.services.filter((s) => s.status === "down").length;
    k.push(kpi(homelabIconArt(HOMELAB_SERVICES_ART), t("k_services"), `${up} / ${m.services.length}`, down ? t("down_n", { n: down }) : t("up_n", { n: up }), down ? "crit" : "ok"));
  }
  if (m.certificates.length) {
    const soon = m.certificates.filter((x) => x.days !== null && x.days <= m.certDays).length;
    k.push(kpi(homelabIconArt(HOMELAB_CERT_ART), t("k_certs"), String(m.certificates.length), soon ? t("expiring_n", { n: soon }) : t("none_expiring"), soon ? "warn" : "ok"));
  }
  const cards = [];
  if (m.hosts.length) cards.push(homelabHostsCard(m, c));
  if (m.containers.length) cards.push(homelabWatchCard(m, c));
  if (m.nas.length) cards.push(homelabStorageCard(m, c));
  if (m.ups.length) cards.push(homelabUpsCard(m, c));
  if (m.backups.length || m.hosts.some((h) => h.entities.last_backup)) cards.push(homelabBackupsCard(m, c));
  if (m.services.length) cards.push(homelabServicesCard(m, c, 6));
  if (m.certificates.length) cards.push(homelabCertsCard(m, c));
  return `<div class="kpis">${k.join("")}</div><div class="cols">${cards.join("")}</div>`;
};

const homelabHostsCard = (m, c) => {
  const { t, lang } = c;
  const vms = m.guests.filter((g) => g.type === "vm" && g.up).length;
  const lxc = m.guests.filter((g) => g.type === "lxc" && g.up).length;
  const rows = m.hosts
    .map(
      (h) => `<div><div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:12.5px"><b>${statusDot(h.up)} ${homelabEsc(h.name)}</b><span class="muted">${t("cpu")} ${pct(h.cpu, lang)} · ${t("ram")} ${pct(h.ram, lang)}</span></div><div class="pair">${homelabBar(h.cpu)}${homelabBar(h.ram)}</div></div>`,
    )
    .join("");
  return `<div class="card"><h3>${t("hosts")}</h3><div class="rows" style="gap:12px">${rows}</div><div class="k" style="margin-top:12px">${homelabEsc(t("guests_running", { vms, lxc }))}</div></div>`;
};

const homelabWatchCard = (m, c) => {
  const { t } = c;
  const bad = m.containers.filter((x) => !x.up);
  const updates = m.containers.filter((x) => x.update);
  const rows = bad
    .slice(0, 5)
    .map((x) => `<div class="row bad">${statusDot(false)}<span class="grow"><b>${homelabEsc(x.name)}</b> · ${t("st_stopped")}</span>${actBtn(t, x.entities.start ? "press" : "toggle", x.entities.start || x.entities.switch, x.name, "start", "danger")}</div>`)
    .join("");
  const upd = updates.length ? `<div class="row"><span class="dot warn"></span><span class="grow">${homelabEsc(t("updates_n", { n: updates.length }))}</span></div>` : "";
  return `<div class="card"><h3>${t("watch")}<small>${homelabEsc([...new Set(m.containers.map((x) => HOMELAB_PLATFORM_NAMES[x.platform] || x.platform))].join(", "))}</small></h3><div class="rows">${rows || `<div class="row">${statusDot(true)}<span class="grow">${t("all_fine")}</span></div>`}${upd}</div></div>`;
};

const homelabNasRow = (n, c, i) => {
  const { t, lang } = c;
  const svg = homelabUid(homelabNasSvg(n.model, n.brand), `row-nas${i}`);
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const ratio = vb ? +vb[1] / +vb[2] : 1.4;
  const h = ratio > 2.2 ? 22 : 40;
  const pic = svg.replace(/^<svg\b/, `<svg height="${h}" width="${Math.round(h * ratio)}" aria-hidden="true" focusable="false"`);
  const disksOk = n.disks.every((d) => d.ok && !d.hot);
  const usage = n.used !== null && n.total ? `${homelabBytes(n.used, lang)} / ${homelabBytes(n.total, lang)}` : pct(n.pct, lang);
  return `<div class="row" style="align-items:center;gap:12px"><div style="width:62px;height:40px;display:flex;align-items:flex-end;justify-content:center;flex-shrink:0">${pic}</div><div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;gap:8px"><b>${homelabEsc(n.name)}</b><span class="muted">${homelabEsc(n.model)}</span></div><div style="margin:6px 0 4px">${homelabBar(n.pct, 80, 92)}</div><div style="display:flex;justify-content:space-between;gap:8px" class="muted"><span><b style="color:var(--hl-text)">${homelabEsc(usage)}</b>${n.temp !== null ? ` · ${homelabFmt(n.temp, lang)} °C` : ""}</span><span class="${n.healthy && disksOk ? "ok" : "warn"}" style="font-weight:600">${n.healthy && disksOk ? t("healthy") : t("attention")}</span></div></div></div>`;
};

const homelabStorageCard = (m, c) =>
  `<div class="card"><h3>${c.t("storage")}<small>${homelabEsc(c.t("nas_n", { n: m.nas.length }))}</small></h3><div class="rows">${m.nas.map((n, i) => homelabNasRow(n, c, i)).join("")}</div></div>`;

const homelabUpsCard = (m, c) => {
  const { t, lang } = c;
  return m.ups
    .map(
      (u) =>
        `<div class="card"><h3>${homelabEsc(u.name)}<small class="${u.onBattery ? "warn" : "ok"}">${u.onBattery ? t("on_battery") : t("on_mains")}</small></h3><div class="pair" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="tile">${t("battery")}<b>${pct(u.battery, lang)}</b></div><div class="tile">${t("load")}<b>${pct(u.load, lang)}</b></div><div class="tile">${u.power !== null ? t("power") : t("runtime")}<b>${u.power !== null ? `${homelabFmt(u.power, lang)} W` : homelabEsc(homelabDuration(u.runtime, c.strings))}</b></div></div></div>`,
    )
    .join("");
};

const homelabBackupsCard = (m, c) => {
  const { t } = c;
  const rows = [
    ...m.backups.map((b) => `<div class="row ${b.failed ? "bad" : b.late ? "mid" : ""}"><span class="grow">${homelabEsc(b.name)}</span><span class="end ${b.failed ? "crit" : b.late ? "warn" : "ok"}">${homelabEsc(b.failed ? t("failed") : homelabAgo(b.last, c.strings))}</span></div>`),
    ...m.hosts
      .filter((h) => h.entities.last_backup)
      .map((h) => `<div class="row ${h.lastBackup === null || h.lastBackup > 2 * 86400 ? "mid" : ""}"><span class="grow">${homelabEsc(h.name)} · Proxmox</span><span class="end ${h.lastBackup === null || h.lastBackup > 2 * 86400 ? "warn" : "ok"}">${homelabEsc(homelabAgo(h.lastBackup, c.strings))}</span></div>`),
  ];
  return `<div class="card"><h3>${t("backups")}</h3><div class="rows">${rows.join("")}</div></div>`;
};

const homelabServicesCard = (m, c, max = 99) => {
  const { t, lang } = c;
  const order = { down: 0, pending: 1, maintenance: 2, up: 3 };
  const list = [...m.services].sort((a, b) => (order[a.status] ?? 4) - (order[b.status] ?? 4) || a.name.localeCompare(b.name));
  const shown = list.slice(0, max);
  const rest = list.slice(max).filter((s) => s.status === "up").length;
  const rows = shown
    .map((s) => {
      const lvl = s.status === "up" ? "ok" : s.status === "down" ? "crit" : "warn";
      const end = s.status === "up" && s.response !== null ? `${homelabFmt(s.response, lang)} ms` : t(`svc_${s.status || "pending"}`);
      return `<div class="row ${s.status === "down" ? "bad" : ""}"><span class="dot ${lvl}"></span><span class="grow">${homelabEsc(s.name)}</span><span class="end ${s.status === "up" ? "muted" : lvl}">${homelabEsc(end)}</span></div>`;
    })
    .join("");
  return `<div class="card"><h3>${t("services")}<small>Uptime Kuma</small></h3><div class="rows">${rows}</div>${rest ? `<div class="k" style="margin-top:10px">${homelabEsc(t("more_up", { n: rest }))}</div>` : ""}</div>`;
};

const homelabCertsCard = (m, c) => {
  const { t } = c;
  const rows = [...m.certificates]
    .sort((a, b) => (a.days ?? 1e9) - (b.days ?? 1e9))
    .map((x) => {
      const lvl = x.days === null ? "muted" : x.days < 0 ? "crit" : x.days <= m.certDays ? "warn" : "ok";
      const end = x.days === null ? "—" : x.days < 0 ? t("expired") : x.days === 0 ? t("today") : t("in_days", { n: x.days });
      return `<div class="row ${lvl === "crit" ? "bad" : lvl === "warn" ? "mid" : ""}"><span class="grow">${homelabEsc(x.name)}</span><span class="end ${lvl}">${homelabEsc(end)}</span></div>`;
    })
    .join("");
  return `<div class="card"><h3>${t("certificates")}</h3><div class="rows">${rows}</div></div>`;
};

// ── Hosts ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export const homelabHosts = (m, c) => {
  const { t, lang } = c;
  if (!m.hosts.length) return empty(t("empty_hosts"));
  const hosts = m.hosts
    .map((h) => {
      const meter = (label, v, warn, crit) => (v === null ? "" : `<div class="meter"><span>${label}</span>${homelabBar(v, warn, crit)}<b>${pct(v, lang)}</b></div>`);
      return `<div class="card"><div style="display:flex;gap:14px;align-items:center">${homelabArt(HOMELAB_PVE_SVG, `h-${homelabEsc(h.id)}`).replace('class="art "', 'class="art " style="width:96px;margin:0;flex-shrink:0"')}<div style="flex:1;min-width:0"><h3 style="margin-bottom:4px">${homelabEsc(h.name)}</h3><div class="sub ${h.up ? "ok" : "crit"}">${h.up ? t("online") : t("offline")}${h.uptime !== null ? ` · ${homelabEsc(t("up_for", { time: homelabDuration(h.uptime, c.strings) }))}` : ""}</div></div></div><div class="rows" style="margin-top:12px;gap:8px">${meter(t("cpu"), h.cpu, 75, 90)}${meter(t("ram"), h.ram, 80, 92)}${meter(t("disk"), h.disk, 80, 92)}</div>${h.temp !== null ? `<div class="k" style="margin-top:10px">${t("temp")} ${homelabFmt(h.temp, lang)} °C</div>` : ""}</div>`;
    })
    .join("");
  const rows = m.shownGuests
    .sort((a, b) => Number(b.up) - Number(a.up) || a.name.localeCompare(b.name))
    .map(
      (g) =>
        `<tr><td><b>${homelabEsc(g.name)}</b></td><td>${g.type === "lxc" ? t("lxc") : t("vm")}</td><td>${homelabEsc(g.host)}</td><td>${g.up ? pct(g.cpu, lang) : "—"}</td><td>${g.up ? pct(g.ram, lang) : "—"}</td><td class="${g.up ? "ok" : "muted"}">${g.up ? t("st_running") : t("st_stopped")}</td><td style="text-align:right;white-space:nowrap">${g.up ? actBtn(t, "press", g.entities.restart, g.name, "restart") : actBtn(t, "press", g.entities.start, g.name, "start")}</td></tr>`,
    )
    .join("");
  const table = m.guests.length
    ? `<div class="card"><h3>${t("vms_lxc")}</h3><div class="scroll"><table><thead><tr><th>${t("col_name")}</th><th>${t("col_type")}</th><th>${t("col_host")}</th><th>${t("cpu")}</th><th>${t("ram")}</th><th>${t("col_state")}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>`
    : "";
  return `<div class="cols" style="margin-bottom:14px">${hosts}</div>${table}`;
};

// ── Containers ─────────────────────────────────────────────────────────────────────────────────────────────────────
export const homelabContainers = (m, c) => {
  const { t, lang } = c;
  if (!m.containers.length) return empty(t("empty_containers"));
  const f = c.filter || "all";
  const stopped = m.containers.filter((x) => !x.up);
  const updates = m.containers.filter((x) => x.update);
  const list = (f === "stopped" ? stopped : f === "updates" ? updates : m.shownContainers).sort(
    (a, b) => Number(a.up) - Number(b.up) || Number(b.update) - Number(a.update) || a.name.localeCompare(b.name),
  );
  const filters = `<div class="filters">${[
    ["all", t("filter_all", { n: m.containers.length })],
    ["stopped", t("filter_stopped", { n: stopped.length })],
    ["updates", t("filter_updates", { n: updates.length })],
  ]
    .map(([k, label]) => `<button data-filter="${k}" class="${f === k ? "on" : ""}">${homelabEsc(label)}</button>`)
    .join("")}</div>`;
  const rows = list
    .map(
      (x) =>
        `<tr><td>${statusDot(x.up)} <b>${homelabEsc(x.name)}</b></td><td class="${x.up ? "ok" : "crit"}">${x.up ? t("st_running") : t("st_stopped")}</td><td>${x.up ? pct(x.cpu, lang) : "—"}</td><td>${x.up && x.ram ? homelabEsc(homelabBytes(x.ram, lang)) : "—"}</td><td>${homelabEsc(x.image || "—")}${x.update ? ` <span class="warn" style="font-weight:600">· ${t("update_available")}</span>` : ""}</td><td style="text-align:right;white-space:nowrap">${x.up ? actBtn(t, "press", x.entities.restart, x.name, "restart") : actBtn(t, x.entities.start ? "press" : "toggle", x.entities.start || x.entities.switch, x.name, "start", "danger")}</td></tr>`,
    )
    .join("");
  const table = m.containers.length
    ? `<div class="card"><div class="scroll"><table><thead><tr><th>${t("k_containers")}</th><th>${t("col_state")}</th><th>${t("cpu")}</th><th>${t("ram")}</th><th>${t("col_image")}</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="6" class="muted">${t("all_fine")}</td></tr>`}</tbody></table></div></div>`
    : "";
  return `${filters}${table}`;
};

// ── Storage ────────────────────────────────────────────────────────────────────────────────────────────────────────
export const homelabStorage = (m, c) => {
  const { t, lang } = c;
  if (!m.nas.length) return empty(t("empty_storage"));
  return `<div class="cols">${m.nas
    .map((n, i) => {
      const disks = n.disks
        .map((d) => {
          const lvl = !d.ok ? "crit" : d.hot ? "warn" : "ok";
          return `<div class="row ${lvl === "crit" ? "bad" : lvl === "warn" ? "mid" : ""}"><span class="dot ${lvl}"></span><span class="grow">${homelabEsc(d.name)}</span><span class="end ${lvl}">${d.temp !== null ? `${homelabFmt(d.temp, lang)} °C · ` : ""}${!d.ok ? t("smart_warn") : d.hot ? t("hot") : t("smart_ok")}</span></div>`;
        })
        .join("");
      const vols = n.volumes
        .map((v) => `<div class="meter"><span>${homelabEsc(v.name)}</span>${homelabBar(v.pct, 80, 92)}<b>${pct(v.pct, lang)}</b></div>`)
        .join("");
      return `<div class="card">${homelabNasArt([n], `st${i}`)}<h3>${homelabEsc(n.name)}<small>${homelabEsc([n.manufacturer, n.model].filter(Boolean).join(" "))}</small></h3>${homelabNasRow(n, c, `s${i}`)}${vols ? `<div class="k" style="margin:12px 0 6px">${t("volumes")}</div><div class="rows">${vols}</div>` : ""}${disks ? `<div class="k" style="margin:12px 0 6px">${homelabEsc(t("disks_n", { n: n.disks.length }))}</div><div class="rows">${disks}</div>` : ""}</div>`;
    })
    .join("")}</div>`;
};

// ── Services ───────────────────────────────────────────────────────────────────────────────────────────────────────
export const homelabServices = (m, c) => {
  const { t, lang } = c;
  if (!m.services.length && !m.proxies.length && !m.certificates.length) return empty(t("empty_services"));
  const proxies = m.proxies.length
    ? `<div class="card"><h3>${t("proxy")}</h3><div class="rows">${m.proxies
        .map((p) => `<div class="row">${statusDot(p.up)}<span class="grow"><b>${homelabEsc(p.name)}</b></span><span class="end">${p.hosts !== null ? homelabEsc(t("proxy_hosts", { n: homelabFmt(p.hosts, lang) })) : ""}</span></div>`)
        .join("")}</div></div>`
    : "";
  return `<div class="cols">${m.services.length ? homelabServicesCard(m, c) : ""}${proxies}${m.certificates.length ? homelabCertsCard(m, c) : ""}</div>`;
};

// ── Backups ────────────────────────────────────────────────────────────────────────────────────────────────────────
export const homelabBackups = (m, c) => {
  const { t } = c;
  const proxmox = m.hosts.filter((h) => h.entities.last_backup);
  if (!m.backups.length && !proxmox.length) return empty(t("empty_backups"));
  const rows = [
    ...m.backups.map((b) => {
      const state = b.failed ? ["crit", t("failed")] : b.late ? ["warn", t("late")] : ["ok", t("ok")];
      const next = b.nextAt ? new Date(b.nextAt).toLocaleString(c.lang, { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "—";
      return `<tr><td><b>${homelabEsc(b.name)}</b></td><td>${homelabEsc(homelabAgo(b.last, c.strings))}</td><td>${homelabEsc(next)}</td><td class="${state[0]}" style="font-weight:600">${homelabEsc(state[1])}</td></tr>`;
    }),
    ...proxmox.map((h) => {
      const late = h.lastBackup === null || h.lastBackup > 2 * 86400;
      return `<tr><td><b>${homelabEsc(h.name)}</b> · Proxmox</td><td>${homelabEsc(homelabAgo(h.lastBackup, c.strings))}</td><td>—</td><td class="${late ? "warn" : "ok"}" style="font-weight:600">${late ? t("late") : t("ok")}</td></tr>`;
    }),
  ];
  return `<div class="card"><h3>${t("backups")}</h3><div class="scroll"><table><thead><tr><th>${t("col_name")}</th><th>${t("last")}</th><th>${t("next")}</th><th>${t("col_state")}</th></tr></thead><tbody>${rows.join("")}</tbody></table></div></div>`;
};

// ── Settings ───────────────────────────────────────────────────────────────────────────────────────────────────────
export const homelabSettings = (inv, settings, c) => {
  const { t } = c;
  const shown = new Set(settings.sources || HOMELAB_SOURCES);
  const src = HOMELAB_SOURCES.map((key) => {
    const info = inv?.sources?.[key];
    const names = [...new Set((info?.platforms || []).map((p) => HOMELAB_PLATFORM_NAMES[p] || p))].join(", ");
    const state = !info || !info.entries ? (info?.entities ? ["ok", t("src_entities", { n: info.entities })] : ["muted", t("src_missing")]) : info.loaded ? ["ok", `${t("src_loaded")} · ${t("src_entities", { n: info.entities })}`] : ["warn", t("src_not_loaded")];
    const label = `${t(`src_${key}`)}`;
    return `<label class="set"><span><b>${homelabEsc(label)}</b><br><span class="k">${homelabEsc(names)}</span></span><span style="display:flex;align-items:center;gap:10px"><span class="sub ${state[0]}">${homelabEsc(state[1])}</span><input type="checkbox" data-src="${key}" ${shown.has(key) ? "checked" : ""} aria-label="${homelabEsc(label)}"></span></label>`;
  }).join("");
  const opt = (key, label) => `<label class="set"><span>${homelabEsc(label)}</span><input type="checkbox" data-set="${key}" ${settings[key] ? "checked" : ""}></label>`;
  const num = (key, label, min, max) => `<label class="set"><span>${homelabEsc(label)}</span><input type="number" data-num="${key}" min="${min}" max="${max}" value="${homelabEsc(settings[key])}"></label>`;
  return `<div class="cols"><div class="card"><h3>${t("sources")}</h3>${src}</div><div class="card"><h3>${t("options")}</h3>${opt("confirm_actions", t("set_confirm"))}${opt("show_stopped", t("set_show_stopped"))}${num("cert_warning_days", t("set_cert_days"), 1, 90)}${num("disk_warning_temperature", t("set_disk_temp"), 30, 80)}</div></div>`;
};
