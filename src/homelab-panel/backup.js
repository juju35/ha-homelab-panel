// The backup sources the way ha-backup-card finds them (copied from it, the repos stay independent): Home Assistant's
// own backups, the Google Drive Backup, Samba Backup and OneDrive Backup add-ons, Proxmox VE, Auto Backup, Duplicati,
// Duplicati Monitor, Backrest and Veeam, then any other sensor of a last backup time; and the state of each one now
// (last good backup, next one, size, running, failed, late against its limit of age).

// How each integration starts a backup ([domain, service, data], "button" for its device's button, null for none)
const HOMELAB_BK_PLATFORMS = {
  backup: { name: "Home Assistant", run: ["backup", "create_automatic", {}] },
  google_drive_backup: { name: "Google Drive Backup", run: null },
  samba_backup: { name: "Samba Backup", run: null },
  onedrive_backup: { name: "OneDrive Backup", run: null },
  proxmoxve: { name: "Proxmox VE", run: null },
  proxmoxve_custom: { name: "Proxmox VE", run: null },
  auto_backup: { name: "Auto Backup", run: ["auto_backup", "backup_full", {}] },
  duplicati: { name: "Duplicati", run: "button" },
  duplicati_monitor: { name: "Duplicati", run: null },
  backrest: { name: "Backrest", run: "button" },
  veeam_br: { name: "Veeam", run: "button" },
};
const HOMELAB_BK_PROXMOX = new Set(["proxmoxve", "proxmoxve_custom"]);
/** A backup is late after 26 hours (a daily one and two hours) or its scheduled one missed by an hour. */
export const HOMELAB_BK_MAX_AGE = 26 * 3.6e6;

const homelabBkTime = (v) => {
  if (v === null || v === undefined || v === "" || v === "unknown" || v === "unavailable") return null;
  if (typeof v === "number") return v > 1e11 ? v : v * 1000;
  const s = String(v);
  const ms = Date.parse(/^\d{4}-\d{2}-\d{2} \d/.test(s) ? s.replace(" ", "T") : s);
  return Number.isFinite(ms) ? ms : null;
};
const HOMELAB_BK_UNITS = { b: 1, kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12, kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, tib: 1024 ** 4 };
const homelabBkBytes = (v, unit) => {
  const n = Number.parseFloat(String(v ?? "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  const m = /([kmgt]?i?b)\b/i.exec(unit || String(v));
  return n * (HOMELAB_BK_UNITS[(m?.[1] || "b").toLowerCase()] ?? 1);
};
const homelabBkDomain = (id) => String(id || "").split(".")[0];
const homelabBkDevName = (d) => d?.name_by_user || d?.name || "";
const homelabBkSlug = (t) =>
  String(t || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
const homelabBkClass = (hass, id) => hass.states[id]?.attributes?.device_class;
const homelabBkKey = (e, hass) =>
  [e.entity_id, e.translation_key, e.name, hass.states[e.entity_id]?.attributes?.friendly_name].filter(Boolean).join(" ").toLowerCase().replace(/[^a-z0-9]+/g, "_");
// What an entity is called without its device's name (a node named "pve-backup" is no backup entity)
const homelabBkOwn = (e, hass) => {
  const d = hass.devices?.[e.device_id];
  const devs = [d?.name_by_user, d?.name].map((n) => homelabBkSlug(n || "")).filter(Boolean);
  let obj = e.entity_id.split(".")[1] || "";
  for (const dev of devs) if (obj.startsWith(`${dev}_`)) obj = obj.slice(dev.length + 1);
  return [obj, e.translation_key].filter(Boolean).join(" ");
};
const HOMELAB_BK_OTHER_TASK = /prune|check|forget|refresh|unlock|stats|purge|restore|cancel/;
const HOMELAB_BK_NOT_LAST = /attempt|fail|size|duration|result|status|next|count|number|free|speed/;

// The parts of a source among its entities: last good backup, last attempt, last failure, status, next, size,
// running and failed binary sensors, and the button that starts one. `strict` (Proxmox): backup entities only.
const homelabBkParts = (hass, list, strict = false) => {
  const kt = strict ? (e) => homelabBkOwn(e, hass) : (e) => homelabBkKey(e, hass);
  if (strict) list = list.filter((e) => /backup/.test(kt(e)));
  const time = (e) => homelabBkClass(hass, e.entity_id) === "timestamp" || homelabBkTime(hass.states[e.entity_id]?.state) !== null;
  const pk = (domain, re, test = () => true) => list.find((e) => homelabBkDomain(e.entity_id) === domain && re.test(kt(e)) && test(e))?.entity_id;
  const sensor = (re, test) => pk("sensor", re, test);
  const not = (re) => (e) => !re.test(kt(e));
  const binary = (cls, re) =>
    list.find((e) => homelabBkDomain(e.entity_id) === "binary_sensor" && homelabBkClass(hass, e.entity_id) === cls && not(/stale|connect/)(e))?.entity_id || pk("binary_sensor", re);
  const specific = pk("button", /trigger_backup|create_backup|start_backup|backup_now|run_backup|backup_all/);
  return {
    last: sensor(/last_successful|last_success|last_backup|backup_last|last_run|last_completed|lastbackup/, (e) => time(e) && not(HOMELAB_BK_NOT_LAST)(e)),
    attempt: sensor(/last_attempt/, time),
    failure: sensor(/last_failure|last_fail/, time),
    status: sensor(/manager_state|status|state|result/, (e) => !time(e) && not(/size|count|next|guests_without/)(e)),
    next: sensor(/next/, (e) => time(e) && not(/purge/)(e)),
    size: sensor(/target_size|backup_size/, not(/total/)) || sensor(/size/, not(/free|total|destination|remaining|source|added/)) || sensor(/size/, not(/free|destination/)),
    running: binary("running", /running|in_progress|backing_up|current_status/),
    failed: binary("problem", /fail|error|last_status|last_backup_status/),
    button: specific || (strict ? null : pk("button", /backup|run|start|trigger|create|now/, not(HOMELAB_BK_OTHER_TASK))),
  };
};

// The backup add-ons' sensors (set through Home Assistant's API, no registry entry), told by their attributes
const homelabBkLc = (s) => String(s?.state ?? "").toLowerCase();
const HOMELAB_BK_ADDONS = {
  google_drive_backup: {
    test: (a) => "last_backup" in a && ("next_backup" in a || "backups_in_google_drive" in a),
    read: (s, a) => ({ last: homelabBkTime(a.last_backup), next: homelabBkTime(a.next_backup), size: homelabBkBytes(a.size_in_google_drive ?? a.size_in_home_assistant), failed: homelabBkLc(s) === "error" }),
  },
  samba_backup: {
    test: (a) => "total_backups_succeeded" in a || ("backups_local" in a && "backups_remote" in a),
    read: (s, a) => ({ last: homelabBkTime(a.last_backup), running: homelabBkLc(s) === "running", failed: homelabBkLc(s) === "failed" }),
  },
  onedrive_backup: {
    test: (a) => "Last OneDrive backup date" in a || "Backups in OneDrive" in a,
    read: (s, a) => ({ last: homelabBkTime(a["Last OneDrive backup date"] ?? a["Last Local backup date"]), running: homelabBkLc(s) === "syncing", late: homelabBkLc(s) === "stale" }),
  },
};
const homelabBkAddon = (s) => (s?.entity_id?.startsWith("sensor.") ? Object.keys(HOMELAB_BK_ADDONS).find((k) => HOMELAB_BK_ADDONS[k].test(s.attributes || {})) || null : null);

/**
 * Every backup source: [{ key, platform, name, sub, parts, drive, button, run }]. Null without the frontend registries.
 */
export const homelabBackupSources = (hass) => {
  if (!hass?.entities) return null;
  const entries = Object.values(hass.entities).filter((e) => e && hass.states[e.entity_id]);
  const byDev = new Map();
  for (const e of entries) if (e.device_id) byDev.set(e.device_id, [...(byDev.get(e.device_id) || []), e]);
  const deviceList = (e) => (e.device_id ? byDev.get(e.device_id) || [e] : [e]);
  const source = (platform, list) => {
    const p = HOMELAB_BK_PLATFORMS[platform];
    const parts = homelabBkParts(hass, list, HOMELAB_BK_PROXMOX.has(platform));
    const dev = list[0]?.device_id ? hass.devices?.[list[0].device_id] : null;
    const devLabel = homelabBkDevName(dev);
    const own = platform === "backup" || platform === "auto_backup";
    const name = (own ? p?.name : devLabel) || p?.name || hass.states[parts.last]?.attributes?.friendly_name || parts.last;
    return { key: dev?.id || list[0]?.entity_id, platform, name, sub: own ? "" : p?.name && p.name !== name ? p.name : "", parts, button: parts.button || null, run: p ? p.run : parts.button ? "button" : null };
  };
  const out = [];
  const used = new Set();
  for (const platform of Object.keys(HOMELAB_BK_PLATFORMS)) {
    if (HOMELAB_BK_ADDONS[platform]) {
      for (const s of Object.values(hass.states))
        if (homelabBkAddon(s) === platform) out.push({ key: s.entity_id, platform, name: HOMELAB_BK_PLATFORMS[platform].name, sub: "", parts: {}, drive: s.entity_id, button: null, run: null });
      continue;
    }
    // Auto Backup makes Home Assistant backups too: listed once, by Home Assistant's own when they report one
    if (platform === "auto_backup" && out.some((x) => x.platform === "backup" && homelabBkTime(hass.states[x.parts.last]?.state) !== null)) continue;
    const groups = new Map();
    for (const e of entries.filter((x) => x.platform === platform)) {
      const k = e.device_id || e.entity_id;
      if (!groups.has(k)) groups.set(k, deviceList(e));
    }
    for (const [k, list] of groups) {
      const src = source(platform, list);
      if (!src.parts.last && !src.parts.status) continue;
      used.add(k);
      out.push(src);
    }
  }
  // Any other integration: a timestamp sensor of a last backup, with the parts of its device
  for (const e of entries) {
    if (HOMELAB_BK_PLATFORMS[e.platform] || used.has(e.device_id || e.entity_id) || homelabBkDomain(e.entity_id) !== "sensor") continue;
    const text = homelabBkKey(e, hass);
    if (!/backup|sauvegarde|snapshot/.test(text) || !/last|dernier/.test(text) || HOMELAB_BK_NOT_LAST.test(text) || homelabBkClass(hass, e.entity_id) !== "timestamp") continue;
    used.add(e.device_id || e.entity_id);
    const src = source(null, deviceList(e));
    src.parts.last = e.entity_id;
    out.push(src);
  }
  return out;
};

const HOMELAB_BK_RUNNING = /running|in_progress|create_backup|backing_up|started|active/;
const HOMELAB_BK_FAILED = /error|fail|fault/;
/**
 * A source now: { last, next, size, failedAt, running, failed, age, limit, status } with status running, failed, late,
 * ok or unknown. `started`: when the panel started a backup of it (running until a newer one, two minutes at most).
 */
export const homelabBackupState = (hass, src, now = Date.now(), started = 0) => {
  const st = (id) => (id ? hass.states[id] : null);
  const time = (id) => homelabBkTime(st(id)?.state);
  const out = { last: null, next: null, size: null, failedAt: null, running: false, failed: false };
  let stale = false;
  if (src.drive) {
    const s = st(src.drive);
    const r = (HOMELAB_BK_ADDONS[src.platform] || HOMELAB_BK_ADDONS.google_drive_backup).read(s, s?.attributes || {});
    out.last = r.last ?? null;
    out.next = r.next ?? null;
    out.size = r.size ?? null;
    out.running = !!r.running;
    out.failed = !!r.failed;
    stale = !!r.late;
    if (out.failed) out.failedAt = homelabBkTime(s?.last_changed);
  } else {
    const p = src.parts;
    out.last = time(p.last);
    out.next = time(p.next);
    const size = st(p.size);
    out.size = size && !["unknown", "unavailable", ""].includes(size.state) ? homelabBkBytes(size.state, size.attributes?.unit_of_measurement || "B") : null;
    const text = String(st(p.status)?.state ?? "").toLowerCase();
    const attempt = time(p.attempt);
    const failure = time(p.failure);
    out.running = st(p.running)?.state === "on" || HOMELAB_BK_RUNNING.test(text);
    out.failed = st(p.failed)?.state === "on" || HOMELAB_BK_FAILED.test(text) || (attempt !== null && attempt > (out.last ?? 0) + 6e4) || (failure !== null && failure > (out.last ?? 0));
    if (out.failed) out.failedAt = failure ?? attempt ?? homelabBkTime(st(p.status)?.last_changed);
  }
  if (started && now - started < 120e3 && (out.last ?? 0) < started) out.running = true;
  out.limit = HOMELAB_BK_MAX_AGE;
  out.age = out.last === null ? null : now - out.last;
  if (out.running) out.status = "running";
  else if (out.failed) out.status = "failed";
  else if (out.last === null) out.status = "unknown";
  else if (stale || out.age > out.limit || (out.next !== null && out.next < now - 3.6e6)) out.status = "late";
  else out.status = "ok";
  return out;
};
