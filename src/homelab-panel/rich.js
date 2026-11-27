// The Storage and Containers tabs at the level of ha-nas-card and ha-docker-card: per NAS its system facts, CPU,
// memory, temperatures and network with their last 24 hours, volumes (RAID level, file system, state, usage), disks
// (model, temperature, state, hours) and fans, with its restart and shutdown buttons; per Docker host its CPU and
// memory over 24 hours, containers running, counters, stacks and containers (search, sort, attention only) with
// their start / stop, restart and image update buttons. Every value read from a state is escaped (homelabEsc).
import { homelabAgo, homelabBar, homelabBytes, homelabDuration, homelabEsc, homelabFmt, homelabNum, homelabState, homelabValue } from "./core.js";
import { HOMELAB_BK_MAX_AGE, homelabBackupState } from "./backup.js";
import { homelabContainerStats, homelabDockerClass, homelabDockerStats, homelabNasDetail, homelabSpark } from "./detail.js";
import { homelabNasSvg, homelabUid } from "./drawings.js";

const homelabRichPct = (v, lang) => (v === null || v === undefined ? "—" : `${homelabFmt(v, lang, v < 10 ? 1 : 0)} %`);
const homelabRichLevel = (v, warn, crit) => (v === null ? "" : v >= crit ? "crit" : v >= warn ? "warn" : "ok");

// A rate sensor in bytes per second, from its unit (B/s, kB/s, MiB/s, bit/s, Mbit/s…)
const HOMELAB_RATE = { "b/s": 1, "kb/s": 1e3, "mb/s": 1e6, "gb/s": 1e9, "kib/s": 1024, "mib/s": 1024 ** 2, "bit/s": 1 / 8, "kbit/s": 125, "mbit/s": 125e3, "gbit/s": 125e6 };
const homelabRateOf = (hass, id) => {
  const n = homelabNum(hass, id);
  if (n === null) return null;
  const u = String(homelabState(hass, id)?.attributes?.unit_of_measurement || "B/s").toLowerCase();
  return n * (HOMELAB_RATE[u] ?? 1);
};
const homelabRate = (bps, lang) => (bps === null ? "—" : `${homelabBytes(bps, lang)}/s`);
// A size sensor in bytes (UGREEN's *_raw sizes are plain bytes)
const homelabSizeOf = (hass, id) => {
  const n = homelabNum(hass, id);
  if (n === null) return null;
  const u = String(homelabState(hass, id)?.attributes?.unit_of_measurement || "B").toUpperCase();
  return n * ({ B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KIB: 1024, MIB: 1024 ** 2, GIB: 1024 ** 3, TIB: 1024 ** 4 }[u] ?? 1);
};
// A health word: ok (normal, healthy…), warn (a background task: syncing, rebuilding, checking…), crit (anything else)
const homelabHealth = (v) => {
  if (v === null) return "";
  if (/^(normal|healthy|good|ok|safe|passed|idle|on|false|0)$/i.test(v)) return "ok";
  if (/sync|rebuild|repair|check|scrub|verif|expand|migrat|initial/i.test(v)) return "warn";
  return "crit";
};
const homelabChip = (text, cls = "") => (text ? `<span class="chip ${cls}">${homelabEsc(text)}</span>` : "");

/** A tile with its value, label and the last 24 hours behind it (data-more opens the entity's more-info). */
const homelabGauge = (c, id, label, value, cls, max = 100, sub = "") =>
  `<button class="gauge ${cls}" data-more="${homelabEsc(id || "")}"${id ? "" : " disabled"}>${homelabSpark(c.hist?.[id], max, c.now)}<span class="gl">${homelabEsc(label)}</span><b>${homelabEsc(value)}</b>${sub ? `<span class="gs">${homelabEsc(sub)}</span>` : ""}</button>`;

/** A button pressing a button entity, toggling a switch or installing an update, confirmed by the panel. */
const homelabRichBtn = (c, act, entity, name, op, label, cls = "") =>
  entity ? `<button class="btn ${cls}" data-act="${act}" data-op="${op}" data-entity="${homelabEsc(entity)}" data-name="${homelabEsc(name)}" data-label="${homelabEsc(label)}">${homelabEsc(label)}</button>` : "";

// ── Storage ──────────────────────────────────────────────────────────────────────────────────────────────────────
const homelabNasPicture = (n, uid, h = 64) => {
  const svg = homelabUid(homelabNasSvg(n.model, n.brand), uid);
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const ratio = vb ? +vb[1] / +vb[2] : 1.4;
  const hh = ratio > 2.2 ? Math.round(h * 0.6) : h;
  return svg.replace(/^<svg\b/, `<svg height="${hh}" width="${Math.round(hh * ratio)}" aria-hidden="true" focusable="false"`);
};

const homelabNasCard = (n, d, c, i) => {
  const { hass, t, lang } = c;
  const s = d.scalars;
  const val = (id) => homelabValue(hass, id);
  const num = (id) => homelabNum(hass, id);
  const cpu = num(s.cpu_usage) ?? n.cpu;
  const ramUsed = homelabSizeOf(hass, s.ram_used);
  const ramTotal = homelabSizeOf(hass, s.ram_total);
  const ramAvail = homelabSizeOf(hass, s.ram_available);
  const ram = num(s.ram_usage) ?? (ramUsed !== null && ramTotal ? (100 * ramUsed) / ramTotal : ramAvail !== null && ramTotal ? (100 * (ramTotal - ramAvail)) / ramTotal : n.ram);
  const ramPair = ramTotal ? `${homelabBytes(ramUsed ?? (ramAvail !== null ? ramTotal - ramAvail : (ram ?? 0) * ramTotal / 100), lang)} / ${homelabBytes(ramTotal, lang)}` : "";
  const cpuTemp = num(s.cpu_temp);
  const sysTemp = num(s.sys_temp) ?? n.temp;
  const down = homelabRateOf(hass, s.lan_down);
  const up = homelabRateOf(hass, s.lan_up);
  const runtime = s.runtime ? num(s.runtime) : null;
  const runtimeSec = runtime === null ? null : runtime * ({ min: 60, h: 3600, d: 86400 }[homelabState(hass, s.runtime)?.attributes?.unit_of_measurement] ?? 1);
  const boot = s.boot ? Date.parse(val(s.boot) || "") : Number.NaN;
  const uptime = runtimeSec ?? (Number.isFinite(boot) ? (c.now - boot) / 1000 : null);
  const status = val(s.server_status) ?? n.status;
  const statusCls = homelabHealth(status) || (n.healthy ? "ok" : "warn");
  const update = val(s.update);
  const hasUpdate = update !== null && /^(on|true)$/i.test(update);
  const facts = [
    status ? `<span class="pill ${statusCls}"><i></i>${homelabEsc(status)}</span>` : "",
    hasUpdate ? `<button class="chip warn" data-more="${homelabEsc(s.update)}">${homelabEsc(t("update_os"))}</button>` : "",
    homelabChip(val(s.version)),
    uptime !== null ? homelabChip(t("up_for", { time: homelabDuration(uptime, c.strings) })) : "",
    homelabChip(val(s.cpu_model)),
  ].join("");
  const gauges = [
    homelabGauge(c, s.cpu_usage || n.entities.cpu, t("cpu"), homelabRichPct(cpu, lang), homelabRichLevel(cpu, 75, 90)),
    homelabGauge(c, s.ram_usage || s.ram_used || n.entities.ram, t("ram"), homelabRichPct(ram, lang), homelabRichLevel(ram, 80, 92), 100, ramPair),
    cpuTemp !== null ? homelabGauge(c, s.cpu_temp, `${t("temp")} ${t("cpu")}`, `${homelabFmt(cpuTemp, lang)} °C`, homelabRichLevel(cpuTemp, 70, 85), 100) : "",
    sysTemp !== null ? homelabGauge(c, s.sys_temp || n.entities.temperature, `${t("temp")} ${t("system")}`, `${homelabFmt(sysTemp, lang)} °C`, homelabRichLevel(sysTemp, 55, 65), 100) : "",
    down !== null ? homelabGauge(c, s.lan_down, `↓ ${t("net_down")}`, homelabRate(down, lang), "", null) : "",
    up !== null ? homelabGauge(c, s.lan_up, `↑ ${t("net_up")}`, homelabRate(up, lang), "", null) : "",
  ].join("");
  const pools = d.pools
    .map((p) => {
      const level = val(p.level);
      const pstatus = val(p.status);
      const vols = p.volumes
        .map((v) => {
          const used = homelabSizeOf(hass, v.used);
          const total = homelabSizeOf(hass, v.total);
          const pctV = num(v.used_pct) ?? (used !== null && total ? (100 * used) / total : null);
          const vstatus = val(v.status) ?? val(v.health) ?? pstatus;
          const name = val(v.label) || v.fallback;
          return `<div class="vol"><div class="vh"><b>${homelabEsc(name)}</b><span class="chips">${homelabChip(level ? level.toUpperCase() : "")}${homelabChip(val(v.filesystem))}${vstatus ? homelabChip(vstatus, homelabHealth(vstatus)) : ""}</span></div>${homelabBar(pctV, 80, 92)}<div class="vf muted"><span>${homelabEsc(used !== null && total ? `${homelabBytes(used, lang)} / ${homelabBytes(total, lang)}` : "")}</span><b>${homelabRichPct(pctV, lang)}</b></div></div>`;
        })
        .join("");
      const disks = p.disks
        .map((k) => {
          const temp = num(k.temperature);
          const dstatus = val(k.status) ?? val(k.smart);
          const bad = (k.bad_sectors && val(k.bad_sectors) === "on") || (k.low_life && val(k.low_life) === "on");
          const cls = bad ? "crit" : homelabHealth(dstatus) === "crit" ? "crit" : temp !== null && temp > c.diskTemp ? "warn" : dstatus === null && temp === null ? "" : "ok";
          const hours = num(k.power_on_hours);
          const size = homelabSizeOf(hass, k.size);
          const model = val(k.model) || k.modelText || "";
          const facts = [size ? homelabBytes(size, lang) : "", hours !== null ? t("hours_on", { n: homelabFmt(hours, lang) }) : ""].filter(Boolean).join(" · ");
          return `<div class="disk ${cls === "crit" ? "bad" : cls === "warn" ? "mid" : ""}"><div class="dh"><span class="dot ${cls}"></span><b>${homelabEsc(val(k.label) || k.fallback)}</b>${temp !== null ? `<span class="${temp > c.diskTemp ? "warn" : "muted"}">${homelabFmt(temp, lang)} °C</span>` : ""}</div>${model ? `<div class="muted" title="${homelabEsc(model)}">${homelabEsc(model)}</div>` : ""}<div class="df"><span class="muted">${homelabEsc(facts)}</span>${dstatus ? `<span class="sub ${cls}">${homelabEsc(dstatus)}</span>` : ""}</div></div>`;
        })
        .join("");
      const title = val(p.label) || p.fallback;
      return `${title && d.pools.length > 1 ? `<div class="k sect">${homelabEsc(title)}${level ? ` · ${homelabEsc(level.toUpperCase())}` : ""}</div>` : ""}${vols ? `<div class="k sect">${homelabEsc(t("volumes"))}</div><div class="rows">${vols}</div>` : ""}${disks ? `<div class="k sect">${homelabEsc(t("disks_n", { n: p.disks.length }))}</div><div class="disks">${disks}</div>` : ""}`;
    })
    .join("");
  const fans = d.fans.length
    ? `<div class="k sect">${homelabEsc(t("fans"))}</div><div class="chips">${d.fans.map((id, k) => homelabChip(`${homelabState(hass, id)?.attributes?.friendly_name?.replace(/^.*?(fan)/i, "$1") || `Fan ${k + 1}`} · ${t("rpm", { n: homelabFmt(num(id), lang) })}`)).join("")}</div>`
    : "";
  const acts = [homelabRichBtn(c, "press", s.reboot, n.name, "restart", t("restart"), "accent"), homelabRichBtn(c, "press", s.shutdown, n.name, "stop", t("shutdown"), "danger")].join("");
  return `<div class="card nas"><div class="nashead"><div class="naspic">${homelabNasPicture(n, `rn${i}`)}</div><div class="nast"><h3>${homelabEsc(n.name)}<small>${homelabEsc([n.manufacturer, n.model].filter(Boolean).join(" "))}</small></h3><div class="chips">${facts}</div></div>${acts ? `<div class="acts">${acts}</div>` : ""}</div><div class="gauges">${gauges}</div>${pools}${fans}</div>`;
};

/** The Storage tab: one rich card per NAS, or null when the registries give no detail (the simple view stays). */
export const homelabStorageRich = (m, c) => {
  const cards = m.nas.map((n, i) => {
    const d = homelabNasDetail(c.hass, n, c.items);
    return d && (Object.keys(d.scalars).length || d.pools.length) ? homelabNasCard(n, d, c, i) : null;
  });
  if (!cards.length || cards.some((x) => x === null)) return null;
  return `<div class="grid">${cards.join("")}</div>`;
};

/** The entities whose last 24 hours the Storage and Containers tabs draw. */
export const homelabHistoryIds = (m, c, envs) => {
  const ids = [];
  for (const n of m.nas) {
    const d = homelabNasDetail(c.hass, n, c.items);
    if (!d) continue;
    const s = d.scalars;
    ids.push(s.cpu_usage || n.entities.cpu, s.ram_usage || n.entities.ram, s.cpu_temp, s.sys_temp || n.entities.temperature, s.lan_down, s.lan_up);
  }
  for (const env of envs || []) {
    const st = homelabDockerStats(c.hass, env);
    ids.push(st.cpuId, st.memId);
  }
  return [...new Set(ids.filter((id) => id && c.hass.states[id]))];
};

// ── Containers ───────────────────────────────────────────────────────────────────────────────────────────────────
const homelabCtRow = (c, ct) => {
  const { t, lang } = c;
  const x = homelabContainerStats(c.hass, ct);
  const detail = [c.ct.sort === "cpu" && x.cpu !== null ? homelabRichPct(x.cpu, lang) : c.ct.sort === "ram" && x.mem !== null ? homelabBytes(x.mem, lang) : null, x.status || x.state, x.image].filter(Boolean).join(" · ");
  const usage = x.cls === "crit" && !x.unhealthy ? "" : [x.cpu !== null ? `${t("cpu")} ${homelabRichPct(x.cpu, lang)}` : "", x.mem !== null ? `${t("ram")} ${homelabBytes(x.mem, lang)}` : ""].filter(Boolean).join(" · ");
  const btns = [
    x.update ? homelabRichBtn(c, "install", x.update.entity_id, ct.name, "install", t("install"), "warn") : "",
    x.restart && x.on !== false ? homelabRichBtn(c, "press", x.restart, ct.name, "restart", t("restart"), "accent") : "",
    x.toggle ? homelabRichBtn(c, "toggle", x.toggle, ct.name, x.on ? "stop" : "start", t(x.on ? "stop" : "start"), x.on ? "" : "danger") : "",
  ].join("");
  return `<div class="ctr ${x.cls === "crit" ? "bad" : x.update ? "mid" : ""}"><span class="dot ${x.cls}"></span><div class="grow"><div class="ctn"><b>${homelabEsc(ct.name)}</b>${x.unhealthy ? `<span class="chip crit">${homelabEsc(t("unhealthy"))}</span>` : ""}${x.update ? `<span class="chip warn">${homelabEsc(t("update_available"))}</span>` : ""}</div><div class="muted ctd">${homelabEsc(detail)}</div></div><span class="ctu muted">${homelabEsc(usage)}</span><span class="ctb">${btns}</span></div>`;
};

const homelabEnvCard = (c, env, i) => {
  const { t, lang, hass } = c;
  const st = homelabDockerStats(hass, env);
  const running = st.running ?? env.containers.filter((ct) => homelabDockerClass(homelabState(hass, ct.entities.state)?.state) === "ok").length;
  const total = st.containers ?? env.containers.length;
  const gauges = [
    homelabGauge(c, st.cpuId, t("cpu"), homelabRichPct(st.cpu, lang), homelabRichLevel(st.cpu, 75, 90)),
    homelabGauge(c, st.memId, t("ram"), homelabRichPct(st.mem, lang), homelabRichLevel(st.mem, 80, 92), 100, st.used && st.total ? `${homelabBytes(st.used, lang)} / ${homelabBytes(st.total, lang)}` : ""),
    homelabGauge(c, env.entities.containers || env.entities._running, t("k_containers"), `${homelabFmt(running, lang)} / ${homelabFmt(total, lang)}`, total && running < total ? "warn" : "ok", 100, t("st_running")),
  ].join("");
  const counter = (id, label, value, cls = "") => (id && homelabState(hass, id) ? `<button class="count ${cls}" data-more="${homelabEsc(id)}"><b>${homelabEsc(value)}</b><span>${homelabEsc(label)}</span></button>` : "");
  const cnt = (id) => homelabFmt(homelabNum(hass, id), lang);
  const counts = [
    counter(st.counts.stacks, t("stacks"), cnt(st.counts.stacks)),
    counter(st.counts.images, t("images"), cnt(st.counts.images)),
    counter(st.counts.volumes, t("volumes"), cnt(st.counts.volumes)),
    counter(st.counts.networks, t("networks"), cnt(st.counts.networks)),
    st.updates !== null ? `<div class="count ${st.updates ? "warn" : ""}"><b>${homelabFmt(st.updates, lang)}</b><span>${homelabEsc(t("updates"))}</span></div>` : "",
  ].join("");
  const stacks = env.stacks
    .map((sk) => {
      const e = sk.entities;
      const sst = homelabValue(hass, e.status) ?? { on: "running", off: "stopped" }[homelabValue(hass, e._active)] ?? null;
      const cls = homelabDockerClass(sst);
      const count = homelabNum(hass, e.containers_in_stack);
      const upd = homelabValue(hass, e.stack_updates_available) === "on";
      const sync = homelabValue(hass, e.git_stack_sync_error) === "on";
      const sw = homelabState(hass, e._switch);
      return `<div class="ctr ${cls === "crit" || sync ? "bad" : upd ? "mid" : ""}"><span class="dot ${cls}"></span><div class="grow"><div class="ctn"><b>${homelabEsc(sk.name)}</b>${/git/i.test(sk.type || "") ? homelabChip("Git") : ""}${sync ? homelabChip(t("sync_error"), "crit") : ""}${upd ? homelabChip(t("update_available"), "warn") : ""}</div><div class="muted ctd">${homelabEsc([sst, count !== null ? t("containers_n", { n: count }) : ""].filter(Boolean).join(" · "))}</div></div><span class="ctb">${sw ? homelabRichBtn(c, "toggle", e._switch, sk.name, sw.state === "on" ? "stop" : "start", t(sw.state === "on" ? "stop" : "start"), sw.state === "on" ? "" : "danger") : ""}</span></div>`;
    })
    .join("");
  const q = c.ct.query.trim().toLowerCase();
  const rows = env.containers
    .map((ct) => ({ ct, x: homelabContainerStats(hass, ct) }))
    .filter(({ ct, x }) => (!q || ct.name.toLowerCase().includes(q)) && (!c.ct.problems || x.cls !== "ok" || x.update || x.unhealthy) && (c.showStopped || x.cls !== "crit" || x.update))
    .sort((a, b) => {
      if (c.ct.sort === "cpu") return (b.x.cpu ?? -1) - (a.x.cpu ?? -1);
      if (c.ct.sort === "ram") return (b.x.mem ?? -1) - (a.x.mem ?? -1);
      return a.ct.name.localeCompare(b.ct.name);
    })
    .map(({ ct }) => homelabCtRow(c, ct))
    .join("");
  const tools = `<div class="cttools"><input type="search" class="search" data-ct="query" placeholder="${homelabEsc(t("search"))}" value="${homelabEsc(c.ct.query)}" aria-label="${homelabEsc(t("search"))}"><div class="filters">${[
    ["name", t("sort_name")],
    ["cpu", t("cpu")],
    ["ram", t("ram")],
  ]
    .map(([k, label]) => `<button data-ctsort="${k}" class="${c.ct.sort === k ? "on" : ""}">${homelabEsc(label)}</button>`)
    .join("")}<button data-ctproblems class="${c.ct.problems ? "on" : ""}">${homelabEsc(t("only_problems"))}</button></div></div>`;
  const facts = [homelabChip(env.source === "dockhand" ? "Dockhand" : "Portainer"), homelabChip(st.version ? `Docker ${st.version}` : ""), homelabChip(st.platform)].join("");
  return `<div class="card"><h3>${homelabEsc(env.name)}<span class="chips">${facts}</span></h3><div class="gauges">${gauges}</div>${counts ? `<div class="counts">${counts}</div>` : ""}${stacks ? `<div class="k sect">${homelabEsc(t("stacks"))}</div><div class="rows">${stacks}</div>` : ""}${env.containers.length ? `<div class="k sect">${homelabEsc(t("k_containers"))}</div>${tools}<div class="rows">${rows || `<div class="row"><span class="dot ok"></span><span class="grow">${homelabEsc(t("no_problem"))}</span></div>`}</div>` : ""}</div>`;
};

/** The Containers tab: one rich card per Dockhand environment or Portainer endpoint, or null without any. */
export const homelabContainersRich = (c, envs) => (envs && envs.length ? `<div class="grid">${envs.map((env, i) => homelabEnvCard(c, env, i)).join("")}</div>` : null);

// ── Backups ──────────────────────────────────────────────────────────────────────────────────────────────────────
const HOMELAB_BK_RANK = { failed: 0, late: 1, unknown: 2, running: 3, ok: 4 };
const HOMELAB_BK_CLS = { failed: "crit", late: "warn", unknown: "", running: "run", ok: "ok" };
/** A ring that empties as the last good backup gets older (full just after it, empty at its limit). */
const homelabBkRing = (frac, cls) => {
  const r = 18;
  const len = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, frac));
  return `<svg class="bkring ${cls}" viewBox="0 0 44 44" aria-hidden="true" focusable="false"><circle cx="22" cy="22" r="${r}" class="bg"/><circle cx="22" cy="22" r="${r}" class="fg" stroke-dasharray="${(f * len).toFixed(1)} ${len.toFixed(1)}" transform="rotate(-90 22 22)"/></svg>`;
};

/** The Backups tab as in ha-backup-card: a summary, then one row per source with its age, size, next and its button. */
export const homelabBackupsRich = (c, sources, started = {}) => {
  if (!sources || !sources.length) return null;
  const { t, lang } = c;
  const items = sources
    .map((src) => ({ src, s: homelabBackupState(c.hass, src, c.now, started[src.key] || 0) }))
    .sort((a, b) => HOMELAB_BK_RANK[a.s.status] - HOMELAB_BK_RANK[b.s.status] || a.src.name.localeCompare(b.src.name));
  const worst = items[0].s.status;
  const newest = Math.max(...items.map((x) => x.s.last ?? 0));
  const nexts = items.map((x) => x.s.next).filter((n) => n !== null && n > c.now);
  const total = items.reduce((a, x) => a + (x.s.size ?? 0), 0);
  const failed = items.filter((x) => x.s.status === "failed").length;
  const late = items.filter((x) => x.s.status === "late").length;
  const ago = (ms) => homelabAgo(ms / 1000, c.strings);
  const kpi = (label, value, cls = "") => `<div class="tile"><span class="k">${homelabEsc(label)}</span><b class="${cls}">${homelabEsc(value)}</b></div>`;
  const summary = `<div class="card"><h3>${homelabEsc(t("backups"))}<span class="pill ${HOMELAB_BK_CLS[worst] === "run" ? "ok" : HOMELAB_BK_CLS[worst] || "na"}"><i></i>${homelabEsc(t(`bk_${worst}`))}</span></h3><div class="pair bkk">${[
    kpi(t("newest"), newest ? ago(c.now - newest) : t("never"), newest && c.now - newest > HOMELAB_BK_MAX_AGE ? "warn" : ""),
    kpi(t("bk_failed"), String(failed), failed ? "crit" : ""),
    kpi(t("bk_late"), String(late), late ? "warn" : ""),
    kpi(t("next"), nexts.length ? t("in_time", { time: homelabDuration((Math.min(...nexts) - c.now) / 1000, c.strings) }) : "—"),
    total ? kpi(t("total_size"), homelabBytes(total, lang)) : "",
  ].join("")}</div></div>`;
  const rows = items
    .map(({ src, s }) => {
      const cls = HOMELAB_BK_CLS[s.status];
      const frac = s.status === "failed" || s.status === "late" ? 1 : s.age === null ? 0 : 1 - s.age / s.limit;
      const line = [
        s.last !== null ? `${t("last")} ${ago(c.now - s.last)}` : t("never"),
        s.size !== null ? homelabBytes(s.size, lang) : "",
        s.next !== null && s.next > c.now ? `${t("next")} ${t("in_time", { time: homelabDuration((s.next - c.now) / 1000, c.strings) })}` : "",
        s.failed && s.failedAt ? `${t("bk_failed")} ${ago(c.now - s.failedAt)}` : "",
      ].filter(Boolean);
      const canRun = Array.isArray(src.run) || (src.button && homelabState(c.hass, src.button));
      const btn = canRun ? `<button class="btn accent" data-bkrun="${homelabEsc(src.key)}"${s.running ? " disabled" : ""}>${homelabEsc(s.running ? t("bk_running") : t("back_up"))}</button>` : "";
      const more = src.drive || src.parts.last || src.parts.status || "";
      return `<div class="bkr ${cls === "crit" ? "bad" : cls === "warn" ? "mid" : ""}"><button class="bkring-b" data-more="${homelabEsc(more)}"${more ? "" : " disabled"} aria-label="${homelabEsc(src.name)}">${s.running ? '<span class="bkspin"></span>' : homelabBkRing(frac, cls)}</button><div class="grow"><div class="ctn"><b>${homelabEsc(src.name)}</b>${src.sub ? `<span class="muted">${homelabEsc(src.sub)}</span>` : ""}<span class="chip ${cls === "run" ? "ok" : cls}">${homelabEsc(t(`bk_${s.status}`))}</span></div><div class="muted ctd">${homelabEsc(line.join(" · "))}</div></div>${btn}</div>`;
    })
    .join("");
  return `${summary}<div style="height:14px"></div><div class="card"><div class="rows">${rows}</div></div>`;
};
