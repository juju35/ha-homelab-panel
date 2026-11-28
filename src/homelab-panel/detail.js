// The detail the cards show, read from the frontend registries (hass.entities, hass.devices) like ha-nas-card and
// ha-docker-card do: copied from them (the repos stay independent), keyed on the inventory's NAS and Docker hosts.
// NAS: UGREEN's entity ids (pool_1_volume_1_used_size…), Synology DSM's and QNAP's translation keys. Docker: the
// Dockhand environments and Portainer endpoints, their stacks and containers, keyed by translation key.
import { homelabNum, homelabState, homelabValue } from "./core.js";

// ── NAS ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// UGREEN: entity ids end with the sensor key, then "_<n>" when Home Assistant had to de-duplicate the id
const HOMELAB_UG_SFX = "(?:_\\d+)?$";
const HOMELAB_UG_SCALARS = {
  version: "(?:nas_)?ugos_version",
  server_status: "server_status",
  cpu_usage: "cpu_usage",
  cpu_temp: "cpu_temperature",
  cpu_model: "cpu_model",
  ram_usage: "ram_usage",
  ram_used: "ram_usage_used_gb",
  ram_total: "ram_total_size",
  runtime: "total_runtime",
  lan_up: "overall_lan_upload_raw",
  lan_down: "overall_lan_download_raw",
  cpu_fan: "cpu_fan",
  update: "update_available",
  reboot: "power_action_reboot",
  shutdown: "power_action_shutdown",
};
const HOMELAB_UG_SCALAR_RE = Object.entries(HOMELAB_UG_SCALARS).map(([k, key]) => [k, new RegExp(`(?:^|_)${key}${HOMELAB_UG_SFX}`)]);
const HOMELAB_UG_FAN = new RegExp(`(?:^|_)device_fan_(\\d+)${HOMELAB_UG_SFX}`);
const HOMELAB_UG_POOL = new RegExp(`(?:^|_)pool_(\\d+)_(label|level|status|total_size|used_size|disk_count)${HOMELAB_UG_SFX}`);
const HOMELAB_UG_VOLUME = new RegExp(
  `(?:^|_)pool_(\\d+)_volume_(\\d+)_(label|status|health|total_size_raw|used_size_raw|available_size_raw|total_size|used_size|filesystem)${HOMELAB_UG_SFX}`,
);
const HOMELAB_UG_DISK = new RegExp(`(?:^|_)pool_(\\d+)_disk_(\\d+)_(label|model|temperature|status|power_on_hours|size|type|slot)${HOMELAB_UG_SFX}`);

// Synology DSM and QNAP: the NAS device's translation keys, then its volumes' and disks' (child devices)
const HOMELAB_REG_SCALARS = {
  cpu_total_load: "cpu_usage",
  memory_real_usage: "ram_usage",
  memory_total_real: "ram_total",
  memory_available_real: "ram_available",
  temperature: "sys_temp",
  network_up: "lan_up",
  network_down: "lan_down",
  cpu_usage: "cpu_usage",
  cpu_temp: "cpu_temp",
  system_temp: "sys_temp",
  memory_percent_used: "ram_usage",
  memory_used: "ram_used",
  memory_size: "ram_total",
  status: "server_status",
  uptime: "boot",
  reboot: "reboot",
  shutdown: "shutdown",
};
const HOMELAB_REG_VOLUME = {
  volume_percentage_used: "used_pct",
  volume_size_used: "used_size",
  volume_size_total: "total_size",
  volume_status: "status",
  volume_raid_type: "level",
};
const HOMELAB_REG_DISK = {
  disk_temp: "temperature",
  disk_status: "status",
  disk_smart_status: "smart",
  disk_exceed_bad_sector_thr: "bad_sectors",
  disk_below_remain_life_thr: "low_life",
  drive_temp: "temperature",
  drive_smart_status: "status",
};

const homelabSet = (obj, key, id) => {
  if (!(key in obj)) obj[key] = id;
};

/** Entities (registry entries) of a set of devices, sorted by entity id. */
const homelabEntitiesOf = (hass, deviceIds) =>
  Object.values(hass.entities || {})
    .filter((e) => e && deviceIds.has(e.device_id))
    .sort((a, b) => a.entity_id.localeCompare(b.entity_id));

/**
 * The NAS's detail: { scalars: { slot: entity_id }, fans: [entity_id], pools: [{ label, level, status, volumes, disks }] }
 * with volumes [{ label, status, filesystem, used, total, used_pct }] and disks [{ label, model, temperature, status,
 * power_on_hours, size }] (entity ids). `nas` is the inventory item, `items` every item (its parts carry `parent`).
 * Null without the frontend registries.
 */
export const homelabNasDetail = (hass, nas, items) => {
  if (!hass?.entities || !nas) return null;
  const parts = items.filter((i) => i.parent === nas.id);
  const ids = new Set([nas.id, ...parts.map((p) => p.id)]);
  const ents = homelabEntitiesOf(hass, ids);
  const out = { scalars: {}, fans: [], pools: [] };
  if (nas.platform === "ugreen") {
    const pools = {};
    const pool = (n) => (pools[n] ??= { volumes: {}, disks: {} });
    for (const e of ents) {
      const obj = e.entity_id.split(".")[1];
      let m;
      if ((m = obj.match(HOMELAB_UG_DISK))) homelabSet((pool(m[1]).disks[m[2]] ??= {}), m[3], e.entity_id);
      else if ((m = obj.match(HOMELAB_UG_VOLUME))) homelabSet((pool(m[1]).volumes[m[2]] ??= {}), m[3], e.entity_id);
      else if ((m = obj.match(HOMELAB_UG_POOL))) homelabSet(pool(m[1]), m[2], e.entity_id);
      else if ((m = obj.match(HOMELAB_UG_FAN))) out.fans.push(e.entity_id);
      else {
        for (const [k, re] of HOMELAB_UG_SCALAR_RE)
          if (re.test(obj)) {
            homelabSet(out.scalars, k, e.entity_id);
            break;
          }
      }
    }
    out.pools = Object.keys(pools)
      .sort((a, b) => a - b)
      .map((n) => {
        const p = pools[n];
        const vols = Object.keys(p.volumes)
          .sort((a, b) => a - b)
          .map((k) => {
            const v = p.volumes[k];
            return { ...v, used: v.used_size_raw || v.used_size, total: v.total_size_raw || v.total_size, fallback: `Volume ${k}` };
          });
        const disks = Object.keys(p.disks)
          .sort((a, b) => a - b)
          .map((k) => ({ ...p.disks[k], fallback: `Disk ${k}` }));
        return { ...p, volumes: vols, disks, fallback: `Pool ${n}` };
      });
  } else {
    const vols = [];
    const disks = [];
    const byDevice = new Map();
    for (const e of ents) {
      const key = e.translation_key || "";
      if (e.device_id === nas.id) {
        const slot = HOMELAB_REG_SCALARS[key] || (e.entity_id.startsWith("update.") ? "update" : null);
        if (slot) homelabSet(out.scalars, slot, e.entity_id);
        else if (!key && /_temp(?:erature)?(?:_\d+)?$/.test(e.entity_id)) homelabSet(out.scalars, "sys_temp", e.entity_id);
        continue;
      }
      const vslot = HOMELAB_REG_VOLUME[key];
      const dslot = HOMELAB_REG_DISK[key];
      if (!vslot && !dslot) continue;
      const entry = byDevice.get(e.device_id) || { kind: vslot ? "volume" : "disk", slots: {} };
      homelabSet(entry.slots, vslot || dslot, e.entity_id);
      byDevice.set(e.device_id, entry);
    }
    for (const [devId, { kind, slots }] of byDevice) {
      const name = hass.devices?.[devId]?.name_by_user || hass.devices?.[devId]?.name || "";
      if (kind === "volume") vols.push({ ...slots, used: slots.used_size, total: slots.total_size, fallback: name });
      else disks.push({ ...slots, fallback: name, model: null, modelText: hass.devices?.[devId]?.model || "" });
    }
    const byName = (a, b) => a.fallback.localeCompare(b.fallback, undefined, { numeric: true });
    if (vols.length || disks.length) out.pools = [{ volumes: vols.sort(byName), disks: disks.sort(byName), fallback: "" }];
  }
  return out;
};

// ── Docker ───────────────────────────────────────────────────────────────────────────────────────────────────────
// Portainer's translation keys, per device model, to the slots the panel reads (Dockhand's keys are read as they are)
const HOMELAB_PORTAINER_KEYS = {
  Endpoint: {
    status: "online",
    docker_version: "host_docker_version",
    operating_system: "_os",
    architecture: "_arch",
    containers_count: "containers",
    containers_running: "_running",
    images_count: "image_count",
    memory_total: "_memory_total",
    cpu_total: "_cpu_total",
  },
  Stack: { stack: "_switch", status: "_active", stack_containers_count: "containers_in_stack" },
  Container: {
    container_state: "state",
    container_health_state: "health",
    image: "_image",
    container: "_switch",
    restart_container: "restart",
    container_image_update: "_update",
    cpu_usage_total: "_cpu",
    memory_usage: "_memory",
    memory_limit: "_memory_limit",
  },
};
const HOMELAB_DOCKER_SOURCES = {
  dockhand: { env: "Environment", key: (e) => e.translation_key || `_${e.entity_id.split(".")[0]}` },
  portainer: { env: "Endpoint", key: (e, d) => HOMELAB_PORTAINER_KEYS[d?.model]?.[e.translation_key] },
};

/**
 * Dockhand environments and Portainer endpoints: [{ id, name, source, entities, stacks: [...], containers: [...] }],
 * each stack and container { id, name, entities }. Null without the frontend registries.
 */
export const homelabDockerEnvs = (hass) => {
  if (!hass?.entities || !hass?.devices) return null;
  const byDevice = new Map();
  for (const e of Object.values(hass.entities)) {
    const src = HOMELAB_DOCKER_SOURCES[e?.platform];
    if (!src || !e.device_id) continue;
    const key = src.key(e, hass.devices[e.device_id]);
    if (!key) continue;
    const dev = byDevice.get(e.device_id) || { source: e.platform, entities: {} };
    homelabSet(dev.entities, key, e.entity_id);
    byDevice.set(e.device_id, dev);
  }
  const devName = (d) => d.name_by_user || d.name || "";
  const shortName = (d) => devName(d).split(" – ").pop();
  const envOf = (d, source) => {
    for (let i = 0, cur = d; cur && i < 4; i++, cur = hass.devices[cur.via_device_id]) if (cur.model === HOMELAB_DOCKER_SOURCES[source].env) return cur.id;
    return null;
  };
  const envs = new Map();
  for (const [id, { source, entities }] of byDevice) {
    const d = hass.devices[id];
    if (d && d.model === HOMELAB_DOCKER_SOURCES[source].env) envs.set(id, { id, name: devName(d), source, entities, stacks: [], containers: [] });
  }
  for (const [id, { source, entities }] of byDevice) {
    const d = hass.devices[id];
    const env = d && envs.get(envOf(d, source));
    if (!env) continue;
    if (d.model === "Container") env.containers.push({ id, name: shortName(d), entities });
    else if (/Stack$/.test(d.model || "")) env.stacks.push({ id, name: shortName(d), type: d.model, entities });
  }
  const byName = (a, b) => a.name.localeCompare(b.name);
  const list = [...envs.values()].sort(byName);
  for (const env of list) {
    env.stacks.sort(byName);
    env.containers.sort(byName);
  }
  return list;
};

/** A Docker state's class: ok (running, healthy), warn (starting, paused…) or crit (exited, dead…). */
export const homelabDockerClass = (state) => {
  const s = String(state || "").toLowerCase();
  if (["running", "healthy", "synced", "on"].includes(s)) return "ok";
  if (["partial", "paused", "restarting", "starting", "created", "syncing", "pending"].includes(s)) return "warn";
  if (!s || s === "unknown" || s === "unavailable") return "";
  return "crit";
};

const homelabBytesFromState = (st) => {
  if (!st) return null;
  const v = Number.parseFloat(st.state);
  if (!Number.isFinite(v)) return null;
  const u = String(st.attributes?.unit_of_measurement || "B").toUpperCase();
  const f = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KIB: 1024, MIB: 1024 ** 2, GIB: 1024 ** 3, TIB: 1024 ** 4 }[u] ?? 1;
  return v * f;
};

/** A Docker host's figures: CPU and memory (%, used / total bytes), containers running / total, updates, counters. */
export const homelabDockerStats = (hass, env) => {
  const e = env.entities;
  const s = (id) => homelabState(hass, id);
  const num = (id) => homelabNum(hass, id);
  let cpu = num(e.cpu_usage);
  let mem = num(e.memory_usage);
  let used = s(e.memory_usage)?.attributes?.memory_used_bytes ?? null;
  let total = s(e.memory_usage)?.attributes?.memory_total_bytes ?? null;
  let cpuId = e.cpu_usage;
  let memId = e.memory_usage;
  if (env.source === "portainer") {
    const sum = (key, of) => {
      const vals = env.containers.map((ct) => of(ct.entities[key])).filter((v) => v !== null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
    };
    const cores = num(e._cpu_total);
    const cpuSum = sum("_cpu", num);
    used = sum("_memory", (id) => homelabBytesFromState(s(id)));
    total = homelabBytesFromState(s(e._memory_total));
    cpu = cpuSum === null ? null : cores ? cpuSum / cores : cpuSum;
    mem = total && used !== null ? (100 * used) / total : null;
    cpuId = e._cpu_total;
    memId = e._memory_total;
  }
  const cs = s(e.containers);
  const a = cs?.attributes || {};
  const ups = env.containers.map((ct) => s(ct.entities._update)).filter(Boolean);
  const dockhand = env.source === "dockhand";
  const known = !!cs && cs.state !== "unknown" && cs.state !== "unavailable";
  return {
    cpu,
    mem,
    used,
    total,
    cpuId,
    memId,
    containers: num(e.containers),
    running: dockhand ? (a.running ?? null) : num(e._running),
    updates: dockhand ? (known ? (a.pending_updates_total ?? a.pending_updates ?? 0) : null) : ups.length ? ups.filter((u) => u.state === "on").length : null,
    version: homelabValue(hass, e.host_docker_version) || homelabValue(hass, e.docker_version),
    platform: homelabValue(hass, e.host_platform) || [homelabValue(hass, e._os), homelabValue(hass, e._arch)].filter(Boolean).join(" ") || null,
    counts: { stacks: e.stacks, images: e.image_count, volumes: e.volume_count, networks: e.network_count },
  };
};

/** A container's figures: state, health, status, image, CPU %, memory bytes, its update entity and controls. */
export const homelabContainerStats = (hass, ct) => {
  const e = ct.entities;
  const st = homelabState(hass, e.state);
  const known = (id) => {
    const v = homelabState(hass, id);
    return v && v.state !== "unknown" && v.state !== "unavailable" ? v.state : null;
  };
  const health = known(e.health) ?? st?.attributes?.health ?? null;
  const update = homelabState(hass, e._update);
  // Without a state sensor, the switch tells running (on) from stopped (off)
  const sw = homelabState(hass, e._switch)?.state;
  const state = st?.state ?? (sw === "on" ? "running" : sw === "off" ? "exited" : null);
  return {
    state,
    cls: health === "unhealthy" ? "crit" : homelabDockerClass(state),
    unhealthy: health === "unhealthy",
    status: st?.attributes?.status || known(e._status) || null,
    image: st?.attributes?.image || known(e._image) || update?.attributes?.installed_version || null,
    cpu: homelabNum(hass, e.container_cpu_percent ?? e._cpu),
    mem: homelabBytesFromState(homelabState(hass, e.container_memory_usage ?? e._memory)),
    cpuId: e.container_cpu_percent ?? e._cpu ?? null,
    update: update?.state === "on" ? update : null,
    restart: e.restart || null,
    toggle: e._switch || null,
    on: homelabState(hass, e._switch)?.state === "on",
  };
};

// ── History ──────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * A sparkline of the last 24 hours behind a tile: points [{ t, v }] scaled on `max` (100 for a percentage, else the
 * series' own maximum). Empty without at least two points.
 */
export const homelabSpark = (points, max = null, end = Date.now()) => {
  if (!points || points.length < 2) return "";
  const start = end - 86400000;
  const top = max ?? Math.max(...points.map((p) => p.v), 1);
  const x = (t) => (((t - start) / 86400000) * 100).toFixed(2);
  const y = (v) => (38 - (Math.min(v, top) / top) * 34).toFixed(2);
  const line = points.filter((p) => p.t >= start).map((p) => `${x(p.t)},${y(p.v)}`);
  if (line.length < 2) return "";
  return `<svg class="spark" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false"><polyline points="${line.join(" ")} 100,${y(points[points.length - 1].v)}"/><polygon points="${line[0].split(",")[0]},40 ${line.join(" ")} 100,${y(points[points.length - 1].v)} 100,40"/></svg>`;
};
