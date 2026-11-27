// What the panel shows, from the inventory (which entity is which) and the states: each host, machine, container,
// NAS, UPS, service, backup and certificate with its values, and the alerts the header counts.
import {
  homelabBytesOf,
  homelabDaysUntil,
  homelabNum,
  homelabOn,
  homelabSince,
  homelabState,
  homelabValue,
} from "./core.js";
import { HOMELAB_NAS_PLATFORM_BRAND } from "./drawings.js";

// A device is available when one of its entities has a state other than unavailable
const homelabAvailable = (hass, item) =>
  Object.values(item.entities || {}).some((id) => {
    const s = homelabState(hass, id);
    return s && s.state !== "unavailable";
  });

/** A host or a machine: on when its status says so, else (no status, or no readable one) when its entities are available. */
const homelabUp = (hass, item) => homelabOn(hass, item.entities?.status) ?? homelabAvailable(hass, item);

/** A container runs when its switch is on, else when its status sensor says so. */
const homelabContainerUp = (hass, c) => {
  const sw = homelabOn(hass, c.entities?.switch);
  if (sw !== null) return sw;
  const st = homelabOn(hass, c.entities?.status);
  return st ?? false;
};

/** A percentage from a sensor in %, or from a used / total pair. */
const homelabPctOf = (hass, pctId, usedId, totalId) => {
  const pct = homelabNum(hass, pctId);
  if (pct !== null && (homelabState(hass, pctId)?.attributes?.unit_of_measurement ?? "%") === "%") return pct;
  const used = homelabBytesOf(hass, usedId);
  const total = homelabBytesOf(hass, totalId);
  return used !== null && total ? (100 * used) / total : null;
};

/** The status of a service: up, down, pending, maintenance, or null. */
const homelabServiceStatus = (hass, id) => {
  const v = homelabValue(hass, id);
  if (v === null) return null;
  const s = v.toLowerCase();
  if (/pending/.test(s)) return "pending";
  if (/maint/.test(s)) return "maintenance";
  const on = homelabOn(hass, id);
  return on === null ? null : on ? "up" : "down";
};

// The words of the NAS integrations for a healthy NAS, disk or volume
const HOMELAB_HEALTHY = /^(normal|good|healthy|safe|ok|on|online|passed|true|false|off|0)$/i;

/** The panel's model, recomputed on every state change (cheap: only the inventory's entities are read). */
export const homelabModel = (inv, hass, settings = {}, now = Date.now()) => {
  const items = inv?.items || [];
  const of = (kind) => items.filter((i) => i.kind === kind);
  const byId = new Map(items.map((i) => [i.id, i]));
  const diskTemp = settings.disk_warning_temperature ?? 45;
  const certDays = settings.cert_warning_days ?? 14;
  const showStopped = settings.show_stopped ?? true;

  const hosts = of("host").map((h) => ({
    ...h,
    up: homelabUp(hass, h),
    cpu: homelabNum(hass, h.entities.cpu),
    ram: homelabNum(hass, h.entities.ram),
    disk: homelabNum(hass, h.entities.disk),
    temp: homelabNum(hass, h.entities.temperature),
    uptime: homelabSince(hass, h.entities.uptime, now),
    lastBackup: homelabSince(hass, h.entities.last_backup, now),
  }));
  const guests = [...of("guest_vm"), ...of("guest_lxc")].map((g) => ({
    ...g,
    type: g.kind === "guest_lxc" ? "lxc" : "vm",
    up: homelabUp(hass, g),
    cpu: homelabNum(hass, g.entities.cpu),
    ram: homelabNum(hass, g.entities.ram),
    host: byId.get(g.parent)?.name || "",
  }));
  const containers = of("container").map((c) => {
    const update = homelabState(hass, c.entities.update);
    // Dockhand names its devices "<environment> – Containers – <name>": the container's own name is the last part
    const parts = String(c.name).split(" – ");
    return {
      ...c,
      name: parts[parts.length - 1],
      env: parts.length > 1 ? parts[0] : null,
      up: homelabContainerUp(hass, c),
      cpu: homelabNum(hass, c.entities.cpu),
      ram: homelabBytesOf(hass, c.entities.ram),
      image: update?.attributes?.installed_version || homelabValue(hass, c.entities.image),
      update: homelabOn(hass, c.entities.update) === true,
      latest: update?.attributes?.latest_version || null,
    };
  });
  const dockerHosts = of("docker_host").map((d) => ({
    ...d,
    running: homelabNum(hass, d.entities.running),
    stopped: homelabNum(hass, d.entities.stopped),
    total: homelabNum(hass, d.entities.total),
    version: homelabValue(hass, d.entities.version),
  }));
  const nas = of("nas").map((n) => {
    const status = homelabValue(hass, n.entities.status);
    const disks = items
      .filter((d) => d.kind === "disk" && d.parent === n.id)
      .map((d) => {
        const st = homelabValue(hass, d.entities.status);
        const temp = homelabNum(hass, d.entities.temperature);
        return { ...d, temp, ok: st === null || HOMELAB_HEALTHY.test(st), hot: temp !== null && temp > diskTemp, state: st };
      });
    const volumes = items
      .filter((v) => v.kind === "volume" && v.parent === n.id)
      .map((v) => ({
        ...v,
        pct: homelabPctOf(hass, v.entities.used_pct, v.entities.used, v.entities.total),
        used: homelabBytesOf(hass, v.entities.used),
        total: homelabBytesOf(hass, v.entities.total),
      }));
    const used = homelabBytesOf(hass, n.entities.volume_used);
    const total = homelabBytesOf(hass, n.entities.volume_total);
    return {
      ...n,
      brand: HOMELAB_NAS_PLATFORM_BRAND[n.platform] || null,
      up: homelabAvailable(hass, n),
      healthy: status === null || HOMELAB_HEALTHY.test(status),
      status,
      pct: homelabPctOf(hass, n.entities.volume, n.entities.volume_used, n.entities.volume_total) ?? volumes[0]?.pct ?? null,
      used: used ?? volumes[0]?.used ?? null,
      total: total ?? volumes[0]?.total ?? null,
      temp: homelabNum(hass, n.entities.temperature),
      cpu: homelabNum(hass, n.entities.cpu),
      ram: homelabNum(hass, n.entities.ram),
      disks,
      volumes,
    };
  });
  const ups = of("ups").map((u) => {
    const status = homelabValue(hass, u.entities.status) || "";
    const runtimeState = homelabState(hass, u.entities.runtime);
    const runtimeRaw = homelabNum(hass, u.entities.runtime);
    const unit = runtimeState?.attributes?.unit_of_measurement;
    const runtime = runtimeRaw === null ? null : runtimeRaw * ({ min: 60, h: 3600, d: 86400 }[unit] ?? 1);
    return {
      ...u,
      status,
      onBattery: /\bOB\b|battery|batt/i.test(status) && !/charging/i.test(status),
      battery: homelabNum(hass, u.entities.battery),
      runtime,
      load: homelabNum(hass, u.entities.load),
      power: homelabNum(hass, u.entities.power),
      up: homelabAvailable(hass, u),
    };
  });
  // One monitor may show up several times (two Uptime Kuma entries, a device and loose entities…): one row per name,
  // the one with a known status kept
  const homelabServiceByName = new Map();
  for (const it of of("service")) {
    const s = {
      ...it,
      status: homelabServiceStatus(hass, it.entities.status),
      response: homelabNum(hass, it.entities.response),
      uptime: homelabNum(hass, it.entities.uptime),
      certDays: homelabNum(hass, it.entities.cert_days),
      address: homelabValue(hass, it.entities.url),
    };
    const key = String(s.name).trim().toLowerCase();
    const seen = homelabServiceByName.get(key);
    if (!seen || (!seen.status && s.status)) homelabServiceByName.set(key, s);
  }
  const services = [...homelabServiceByName.values()];
  const proxies = of("proxy").map((p) => ({
    ...p,
    hosts: homelabNum(hass, p.entities.hosts),
    requests: homelabNum(hass, p.entities.requests),
    up: homelabOn(hass, p.entities.status) ?? homelabAvailable(hass, p),
  }));
  const backups = of("backup").map((b) => {
    const last = homelabSince(hass, b.entities.last, now);
    const lastAttempt = homelabSince(hass, b.entities.last_attempt, now);
    const next = homelabDaysUntil(hass, b.entities.next, now);
    const nextAt = homelabValue(hass, b.entities.next);
    return {
      ...b,
      last,
      nextAt,
      next,
      failed: last !== null && lastAttempt !== null && lastAttempt < last - 60,
      late: last === null || last > 2 * 86400,
    };
  });
  const certificates = of("certificate").map((c) => ({ ...c, days: homelabDaysUntil(hass, c.entities.expiry, now) }));

  const shownGuests = showStopped ? guests : guests.filter((g) => g.up);
  const shownContainers = showStopped ? containers : containers.filter((c) => c.up);
  const alerts = [
    ...hosts.filter((h) => !h.up).map((h) => ({ kind: "host", item: h })),
    ...containers.filter((c) => !c.up).map((c) => ({ kind: "container", item: c })),
    ...nas.filter((n) => !n.healthy || n.disks.some((d) => !d.ok || d.hot)).map((n) => ({ kind: "nas", item: n })),
    ...ups.filter((u) => u.onBattery).map((u) => ({ kind: "ups", item: u })),
    ...services.filter((s) => s.status === "down").map((s) => ({ kind: "service", item: s })),
    ...certificates.filter((c) => c.days !== null && c.days <= certDays).map((c) => ({ kind: "certificate", item: c })),
    ...backups.filter((b) => b.late || b.failed).map((b) => ({ kind: "backup", item: b })),
  ];
  return { hosts, guests, shownGuests, containers, shownContainers, dockerHosts, nas, ups, services, proxies, backups, certificates, alerts, certDays };
};
