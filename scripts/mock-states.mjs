// Mock Home Assistant states of a homelab (two Proxmox VE hosts and their machines, a Docker host, two NAS, a UPS,
// Uptime Kuma monitors, a reverse proxy, Home Assistant's backups and two certificates) and the panel's inventory of
// them, for the README screenshots and the tests. Neutral names only (example.com).
export const NOW = Date.UTC(2026, 10, 27, 18, 30);
const ago = (s) => new Date(NOW - s * 1000).toISOString();
const later = (s) => new Date(NOW + s * 1000).toISOString();

export const states = {};
const set = (id, state, attributes = {}) => {
  states[id] = { entity_id: id, state: String(state), attributes, last_updated: ago(60) };
  return id;
};
const pctSensor = (id, v) => set(id, v, { unit_of_measurement: "%" });

const items = [];
const item = (id, kind, source, platform, name, entities, extra = {}) => {
  items.push({ id, kind, source, platform, name, model: "", manufacturer: "", parent: null, url: null, entities, ...extra });
};

// ── Proxmox VE: two nodes, their machines ──
for (const [n, cpu, ram, disk, temp, days] of [
  ["pve-1", 23, 61, 48, 52, 41],
  ["pve-2", 8, 34, 22, 44, 41],
]) {
  const k = n.replace("-", "_");
  item(`dev_${k}`, "host", "proxmox", "proxmoxve", n, {
    status: set(`binary_sensor.${k}_status`, "on"),
    cpu: pctSensor(`sensor.${k}_cpu_usage`, cpu),
    ram: pctSensor(`sensor.${k}_memory_usage_percentage`, ram),
    disk: pctSensor(`sensor.${k}_disk_usage_percentage`, disk),
    temperature: set(`sensor.${k}_cpu_temperature`, temp, { unit_of_measurement: "°C" }),
    uptime: set(`sensor.${k}_last_boot`, ago(days * 86400)),
    last_backup: set(`sensor.${k}_last_backup`, ago(16 * 3600)),
  }, { model: "Node", manufacturer: "Proxmox VE" });
}
for (const [vmid, name, kind, host, up, cpu, ram] of [
  [100, "homeassistant", "guest_vm", "pve_1", true, 9, 51],
  [102, "docker-host", "guest_vm", "pve_1", true, 31, 74],
  [110, "pbs", "guest_vm", "pve_2", true, 2, 47],
  [200, "adguard", "guest_lxc", "pve_2", true, 1, 41],
  [101, "test-debian", "guest_vm", "pve_2", false, null, null],
]) {
  const k = name.replace(/-/g, "_");
  item(`dev_${vmid}`, kind, "proxmox", "proxmoxve", name, {
    status: set(`binary_sensor.${k}_status`, up ? "on" : "off"),
    cpu: pctSensor(`sensor.${k}_cpu_usage`, cpu ?? 0),
    ram: pctSensor(`sensor.${k}_memory_usage_percentage`, ram ?? 0),
    start: set(`button.${k}_start`, "unknown"),
    restart: set(`button.${k}_restart`, "unknown"),
    stop: set(`button.${k}_shutdown`, "unknown"),
  }, { model: kind === "guest_lxc" ? "LXC" : "QEMU", parent: `dev_${host}` });
}

// ── Docker (Dockhand): the host and its containers ──
item("dev_docker", "docker_host", "docker", "dockhand", "docker-host", {
  running: set("sensor.docker_host_containers_running", 38),
  stopped: set("sensor.docker_host_containers_stopped", 2),
  total: set("sensor.docker_host_containers", 40),
  version: set("sensor.docker_host_version", "27.5.1"),
}, { model: "Environment" });
for (const [name, up, cpu, ramMiB, image, update] of [
  ["paperless", false, null, null, "2.14", false],
  ["immich-ml", false, null, null, "1.122", false],
  ["immich-server", true, 4, 1229, "1.122", true],
  ["jellyfin", true, 2, 820, "10.11", false],
  ["authentik-server", true, 3, 640, "2026.8", true],
  ["zoraxy", true, 1, 90, "3.2", false],
  ["vaultwarden", true, 0.4, 45, "1.34", false],
  ["uptime-kuma", true, 1, 130, "2.0", true],
]) {
  const k = name.replace(/-/g, "_");
  item(`dev_c_${k}`, "container", "docker", "dockhand", name, {
    switch: set(`switch.${k}`, up ? "on" : "off"),
    cpu: pctSensor(`sensor.${k}_cpu`, cpu ?? 0),
    ram: set(`sensor.${k}_memory`, ramMiB ?? 0, { unit_of_measurement: "MiB" }),
    update: set(`update.${k}`, update ? "on" : "off", { installed_version: image, latest_version: update ? `${image}.1` : image }),
    restart: set(`button.${k}_restart`, "unknown"),
  }, { model: "Container", parent: "dev_docker" });
}

// ── NAS: a UGREEN all-flash and a Synology, each with its disks ──
item("dev_nas1", "nas", "nas", "ugreen", "nas-main", {
  status: set("sensor.nas_main_status", "normal"),
  volume: pctSensor("sensor.nas_main_volume_1_usage", 71),
  volume_used: set("sensor.nas_main_volume_1_used", 10.2, { unit_of_measurement: "TB" }),
  volume_total: set("sensor.nas_main_volume_1_total", 14.4, { unit_of_measurement: "TB" }),
  temperature: set("sensor.nas_main_cpu_temperature", 41, { unit_of_measurement: "°C" }),
}, { model: "DXP480T Plus", manufacturer: "UGREEN" });
item("dev_nas2", "nas", "nas", "synology_dsm", "nas-backup", {
  status: set("sensor.nas_backup_status", "normal"),
  volume: pctSensor("sensor.nas_backup_volume_1_volume_used", 48),
  volume_used: set("sensor.nas_backup_volume_1_used_space", 5.8, { unit_of_measurement: "TB" }),
  volume_total: set("sensor.nas_backup_volume_1_total_size", 12, { unit_of_measurement: "TB" }),
  temperature: set("sensor.nas_backup_temperature", 36, { unit_of_measurement: "°C" }),
}, { model: "DS923+", manufacturer: "Synology" });
for (const [nas, n, temp, status] of [
  ["nas1", 1, 38, "normal"], ["nas1", 2, 39, "normal"], ["nas1", 3, 37, "normal"], ["nas1", 4, 47, "normal"],
  ["nas2", 1, 34, "normal"], ["nas2", 2, 35, "normal"], ["nas2", 3, 34, "normal"], ["nas2", 4, 36, "normal"],
]) {
  item(`dev_${nas}_d${n}`, "disk", "nas", nas === "nas1" ? "ugreen" : "synology_dsm", `Drive ${n}`, {
    status: set(`sensor.${nas}_drive_${n}_status`, status),
    temperature: set(`sensor.${nas}_drive_${n}_temperature`, temp, { unit_of_measurement: "°C" }),
  }, { parent: `dev_${nas}` });
}

// ── UPS (NUT) ──
item("dev_ups", "ups", "ups", "nut", "Office UPS", {
  status: set("sensor.office_ups_status", "Online"),
  battery: pctSensor("sensor.office_ups_battery_charge", 100),
  runtime: set("sensor.office_ups_battery_runtime", 2880, { unit_of_measurement: "s" }),
  load: pctSensor("sensor.office_ups_load", 31),
  power: set("sensor.office_ups_real_power", 186, { unit_of_measurement: "W" }),
}, { model: "5E 850i", manufacturer: "EATON" });

// ── Uptime Kuma monitors ──
for (const [name, status, ms] of [
  ["Authentik", "up", 42], ["Home Assistant", "up", 18], ["Jellyfin", "up", 65], ["Vaultwarden", "up", 31],
  ["Paperless", "down", null], ["Immich", "up", 88], ["Nextcloud", "up", 120], ["Grafana", "up", 27],
]) {
  const k = name.toLowerCase().replace(/\s+/g, "_");
  item(`dev_m_${k}`, "service", "services", "uptime_kuma", name, {
    status: set(`sensor.${k}_status`, status),
    response: set(`sensor.${k}_response_time`, ms ?? 0, { unit_of_measurement: "ms" }),
  });
}

// ── Reverse proxy, backups, certificates ──
item("dev_proxy", "proxy", "proxy", "reverse_proxy", "Zoraxy", {
  hosts: set("sensor.zoraxy_hosts", 14),
  status: set("binary_sensor.zoraxy_online", "on"),
});
item("dev_backup", "backup", "backups", "backup", "Home Assistant", {
  last: set("sensor.backup_last_successful_automatic_backup", ago(15.5 * 3600)),
  last_attempt: set("sensor.backup_last_attempted_automatic_backup", ago(15.5 * 3600)),
  next: set("sensor.backup_next_scheduled_automatic_backup", later(8.5 * 3600)),
  state: set("sensor.backup_backup_manager_state", "idle"),
});
item("entity:sensor.cert_example_com", "certificate", "certificates", "cert_expiry", "*.example.com", {
  expiry: set("sensor.cert_example_com", later(12 * 86400 + 3600)),
});
item("entity:sensor.cert_example_org", "certificate", "certificates", "cert_expiry", "example.org", {
  expiry: set("sensor.cert_example_org", later(240 * 86400)),
});

const sources = {
  proxmox: ["proxmoxve", "proxmoxve_custom", "proxmox_sensors"],
  docker: ["dockhand", "monitor_docker", "portainer"],
  nas: ["ugreen", "synology_dsm", "qnap"],
  ups: ["nut", "apcupsd"],
  services: ["uptime_kuma"],
  proxy: ["reverse_proxy"],
  backups: ["backup"],
  certificates: ["cert_expiry"],
};
export const inventory = {
  configured: true,
  sources: Object.fromEntries(
    Object.entries(sources).map(([k, platforms]) => [k, { platforms, entries: 1, loaded: 1, entities: items.filter((i) => i.source === k).reduce((a, i) => a + Object.keys(i.entities).length, 0) }]),
  ),
  items,
  settings: { sources: Object.keys(sources), confirm_actions: true, show_stopped: true, cert_warning_days: 14, disk_warning_temperature: 45 },
};
