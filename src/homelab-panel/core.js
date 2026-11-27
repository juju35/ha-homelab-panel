/*
 * Homelab panel for Home Assistant
 * https://github.com/juju35/ha-homelab-panel
 *
 * A sidebar panel over the homelab integrations: Proxmox VE hosts and machines, Docker containers (Dockhand,
 * Monitor Docker, Portainer), one or several NAS (UGREEN, Synology DSM, QNAP), UPS (NUT, apcupsd), Uptime Kuma
 * monitors, the reverse proxy, Home Assistant's backups and certificates. It reads the states of their entities and
 * acts by pressing their buttons or turning their switches; the integration's own command (homelab_panel/inventory)
 * only says which entity is which. The cards' illustrated header as its top bar (the Proxmox rack, the NAS and the
 * UPS standing on the floor, night with a dark theme), pill tabs under it, Settings last.
 * The panel is for administrators only (registered with require_admin, its commands too).
 * English is built in; the other languages are loaded on demand from /homelab_panel/i18n/<lang>.json.
 */

export const HOMELAB_PANEL_VERSION = "1.0.4";
export const HOMELAB_TABS = ["overview", "hosts", "containers", "storage", "services", "backups", "settings"];
export const HOMELAB_SOURCES = ["proxmox", "docker", "nas", "ups", "services", "proxy", "backups", "certificates"];
// The integrations' own names, not translated
export const HOMELAB_PLATFORM_NAMES = {
  proxmoxve: "Proxmox VE",
  proxmoxve_custom: "Proxmox VE",
  proxmox_sensors: "Proxmox Extended Sensors",
  dockhand: "Dockhand",
  monitor_docker: "Monitor Docker",
  portainer: "Portainer",
  ugreen: "UGREEN",
  synology_dsm: "Synology DSM",
  qnap: "QNAP",
  nut: "NUT",
  apcupsd: "apcupsd",
  uptime_kuma: "Uptime Kuma",
  reverse_proxy: "Reverse Proxy",
  backup: "Home Assistant",
  cert_expiry: "Certificate Expiry",
};
export const HOMELAB_LANGS = ["en", "fr", "de", "es", "it", "nl", "pt", "pl", "sr", "sr-Latn", "ro", "da", "sv", "bg", "ru", "uk", "hu", "sk", "cs", "sl", "lv", "el"];

export const HOMELAB_EN = {
  title: "Homelab",
  tab_overview: "Overview",
  tab_hosts: "Hosts",
  tab_containers: "Containers",
  tab_storage: "Storage",
  tab_services: "Services",
  tab_backups: "Backups",
  tab_settings: "Settings",
  refresh: "Refresh",
  loading: "Loading…",
  denied: "This panel is for administrators only.",
  error: "Error: {error}",
  retry: "Retry",
  nothing: "No homelab integration found yet. Add Proxmox VE, a Docker, NAS or UPS integration, Uptime Kuma or Certificate Expiry: this panel shows what they offer.",
  pill_ok: "All good",
  pill_alerts: "Alerts: {n}",
  k_hosts: "Proxmox hosts",
  k_containers: "Containers",
  k_nas: "NAS",
  k_ups: "UPS",
  k_services: "Services",
  k_certs: "Certificates",
  online: "online",
  offline: "offline",
  all_running: "all running",
  stopped_n: "stopped: {n}",
  healthy: "healthy",
  attention: "needs attention",
  on_mains: "on mains",
  on_battery: "on battery",
  up_n: "up: {n}",
  down_n: "down: {n}",
  expiring_n: "expiring soon: {n}",
  none_expiring: "none expiring soon",
  hosts: "Hosts",
  guests_running: "Running VMs: {vms} · LXC: {lxc}",
  cpu: "CPU",
  ram: "RAM",
  disk: "Disk",
  temp: "Temp.",
  up_for: "up {time}",
  watch: "Containers to watch",
  all_fine: "Every container is running.",
  st_running: "running",
  st_stopped: "stopped",
  update_available: "update available",
  updates_n: "Image updates: {n}",
  start: "Start",
  restart: "Restart",
  stop: "Stop",
  confirm: "{action} {name}?",
  cancel: "Cancel",
  storage: "Storage",
  nas_n: "NAS: {n}",
  disks_n: "Disks: {n}",
  volumes: "Volumes",
  smart_ok: "SMART OK",
  smart_warn: "SMART warning",
  hot: "hot",
  ups: "UPS",
  battery: "Battery",
  load: "Load",
  power: "Power",
  runtime: "Runtime",
  backups: "Backups",
  last: "Last",
  next: "Next",
  never: "never",
  late: "late",
  failed: "failed",
  ok: "OK",
  services: "Services",
  svc_up: "up",
  svc_down: "down",
  svc_pending: "pending",
  svc_maintenance: "maintenance",
  more_up: "+ {n} more up",
  proxy: "Reverse proxy",
  proxy_hosts: "Hosts: {n}",
  certificates: "Certificates",
  in_days: "in {n} days",
  expired: "expired",
  today: "today",
  ago_min: "{n} min ago",
  ago_h: "{n} h ago",
  ago_d: "{n} days ago",
  t_days: "{n} days",
  t_hours: "{n} h",
  t_min: "{n} min",
  vms_lxc: "Virtual machines and LXC containers",
  col_name: "Name",
  col_type: "Type",
  col_host: "Host",
  col_state: "State",
  col_image: "Image",
  vm: "VM",
  lxc: "LXC",
  empty_hosts: "No Proxmox VE host.",
  empty_containers: "No container.",
  empty_storage: "No NAS.",
  empty_services: "No monitored service.",
  empty_backups: "No backup.",
  filter_all: "All: {n}",
  filter_stopped: "Stopped: {n}",
  filter_updates: "Updates: {n}",
  sources: "Sources",
  src_loaded: "connected",
  src_not_loaded: "not loaded",
  src_missing: "not set up",
  src_entities: "entities: {n}",
  src_proxmox: "Proxmox VE",
  src_docker: "Docker",
  src_nas: "NAS",
  src_ups: "UPS",
  src_services: "Uptime Kuma",
  src_proxy: "Reverse proxy",
  src_backups: "Backups",
  src_certificates: "Certificates",
  options: "Options",
  set_confirm: "Confirm before restarting or stopping",
  set_show_stopped: "Show stopped machines and containers",
  set_cert_days: "Warn about certificates expiring within (days)",
  set_disk_temp: "Warn about disks above (°C)",
};

/** HTML-escaped text: every value read from a state or a registry goes through it. */
export const homelabEsc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** The language: the full code if a file exists for it, else its base, else English. */
export const homelabLang = (code) => {
  const c = String(code || "en");
  if (HOMELAB_LANGS.includes(c)) return c;
  const base = c.split("-")[0];
  return HOMELAB_LANGS.includes(base) ? base : "en";
};

const homelabStringCache = new Map();
/** The strings of a language (English filled in for a missing key), loaded once from /homelab_panel/i18n/. */
export const homelabLoadStrings = async (lang) => {
  if (lang === "en") return HOMELAB_EN;
  if (!homelabStringCache.has(lang))
    homelabStringCache.set(
      lang,
      fetch(`/homelab_panel/i18n/${lang}.json`)
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}))
        .then((s) => ({ ...HOMELAB_EN, ...s })),
    );
  return homelabStringCache.get(lang);
};

/** A string with its {placeholders} filled in. */
export const homelabT = (strings, key, vars = {}) =>
  String((strings || HOMELAB_EN)[key] ?? HOMELAB_EN[key] ?? key).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

const HOMELAB_NO_VALUE = new Set(["unknown", "unavailable", "", "none", "None"]);
/** The state object of an entity, or null. */
export const homelabState = (hass, id) => (id && hass?.states?.[id]) || null;
/** The state of an entity when it has one (not unknown / unavailable), else null. */
export const homelabValue = (hass, id) => {
  const s = homelabState(hass, id);
  return s && !HOMELAB_NO_VALUE.has(s.state) ? s.state : null;
};
/** The numeric state of an entity, or null. */
export const homelabNum = (hass, id) => {
  const v = homelabValue(hass, id);
  const n = v === null ? Number.NaN : Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
/** A state read as on / off: binary sensors and switches, and the usual words of status sensors. */
export const homelabOn = (hass, id) => {
  const v = homelabValue(hass, id);
  if (v === null) return null;
  const s = v.toLowerCase();
  if (/^(on|online|running|up|healthy|ok|normal|good|true|1|active|started|home)$/.test(s)) return true;
  if (/^(off|offline|stopped|down|exited|dead|paused|false|0|inactive|error|failed|crashed|unhealthy)$/.test(s)) return false;
  return null;
};

/** A number in the language's format, with at most `max` decimals. */
export const homelabFmt = (n, lang, max = 0) =>
  n === null || n === undefined || !Number.isFinite(n) ? "—" : new Intl.NumberFormat(lang, { maximumFractionDigits: max }).format(n);

/** A size in bytes as KB / MB / GB / TB (decimal units, as the NAS integrations report them). */
export const homelabBytes = (bytes, lang) => {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return "—";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let i = 0;
  let v = bytes;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${homelabFmt(v, lang, v < 10 && i ? 1 : 0)} ${units[i]}`;
};
// Units of a data size sensor, in bytes (decimal and binary prefixes, the way the integrations write them)
const HOMELAB_UNIT_BYTES = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, PB: 1e15, KIB: 1024, MIB: 1024 ** 2, GIB: 1024 ** 3, TIB: 1024 ** 4 };
/** A data size sensor in bytes, from its unit (GB, TiB…), or null. */
export const homelabBytesOf = (hass, id) => {
  const n = homelabNum(hass, id);
  if (n === null) return null;
  const unit = String(homelabState(hass, id)?.attributes?.unit_of_measurement || "B").toUpperCase();
  return n * (HOMELAB_UNIT_BYTES[unit] ?? 1);
};

/** A duration in seconds, in its largest unit ("12 days", "5 h", "3 min"). */
export const homelabDuration = (seconds, strings) => {
  if (seconds === null || !Number.isFinite(seconds)) return "—";
  if (seconds >= 2 * 86400) return homelabT(strings, "t_days", { n: Math.floor(seconds / 86400) });
  if (seconds >= 3600) return homelabT(strings, "t_hours", { n: Math.floor(seconds / 3600) });
  return homelabT(strings, "t_min", { n: Math.max(1, Math.round(seconds / 60)) });
};

/** Seconds since a timestamp state (or an uptime given in seconds), or null. */
export const homelabSince = (hass, id, now = Date.now()) => {
  const v = homelabValue(hass, id);
  if (v === null) return null;
  const unit = homelabState(hass, id)?.attributes?.unit_of_measurement;
  const n = Number.parseFloat(v);
  if (Number.isFinite(n) && /^\d+(\.\d+)?$/.test(v)) {
    const k = { s: 1, min: 60, h: 3600, d: 86400 }[unit] ?? 1;
    return n * k;
  }
  const t = Date.parse(v);
  return Number.isFinite(t) ? Math.max(0, (now - t) / 1000) : null;
};

/** "12 min ago", "3 h ago", "2 days ago" from seconds. */
export const homelabAgo = (seconds, strings) => {
  if (seconds === null) return homelabT(strings, "never");
  if (seconds < 3600) return homelabT(strings, "ago_min", { n: Math.max(1, Math.round(seconds / 60)) });
  if (seconds < 2 * 86400) return homelabT(strings, "ago_h", { n: Math.round(seconds / 3600) });
  return homelabT(strings, "ago_d", { n: Math.floor(seconds / 86400) });
};

/** Whole days until a timestamp state (negative once past), or null. */
export const homelabDaysUntil = (hass, id, now = Date.now()) => {
  const v = homelabValue(hass, id);
  const t = v === null ? Number.NaN : Date.parse(v);
  return Number.isFinite(t) ? Math.floor((t - now) / 86400e3) : null;
};

/** A status pill: the label in full, or only its dot when `dot` (never cut). */
export const homelabPill = (label, level, dot = false) =>
  `<span class="pill ${level}"${dot ? ` title="${homelabEsc(label)}" aria-label="${homelabEsc(label)}"` : ""}><i></i>${dot ? "" : homelabEsc(label)}</span>`;

/** A bar of a percentage, its colour from the thresholds. */
export const homelabBar = (pct, warn = 75, crit = 90) => {
  const p = pct === null || !Number.isFinite(pct) ? 0 : Math.max(0, Math.min(100, pct));
  const lvl = pct === null ? "na" : p >= crit ? "crit" : p >= warn ? "warn" : "ok";
  return `<span class="bar ${lvl}"><i style="width:${p.toFixed(1)}%"></i></span>`;
};
