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
// The frontend registries (hass.entities, hass.devices) the rich Storage and Containers tabs read, as Home Assistant
// gives them: UGREEN's entity ids, Synology DSM's and Dockhand's translation keys
export const entities = {};
export const devices = {};
const dev = (id, name, model, via = null) => {
  devices[id] = { id, name, name_by_user: null, model, via_device_id: via };
};
const reg = (entity_id, device_id, platform, translation_key = null) => {
  entities[entity_id] = { entity_id, device_id, platform, translation_key };
  return entity_id;
};
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

// ── Registries of the rich tabs ──
// UGREEN: every value has its own entity on the NAS, its pool, volume and disk devices
dev("dev_nas1", "nas-main", "DXP480T Plus");
dev("dev_nas1_p1", "nas-main (Pool 1)", "UGREEN RAID5 pool", "dev_nas1");
dev("dev_nas1_v1", "nas-main (Pool 1 | Volume 1)", "UGREEN btrfs volume", "dev_nas1");
item("dev_nas1_p1", "pool", "nas", "ugreen", "nas-main (Pool 1)", {}, { parent: "dev_nas1" });
item("dev_nas1_v1", "volume", "nas", "ugreen", "nas-main (Pool 1 | Volume 1)", {}, { parent: "dev_nas1" });
const ug = (key, state, attributes = {}, device = "dev_nas1", domain = "sensor") => reg(set(`${domain}.nas_main_${key}`, state, attributes), device, "ugreen");
ug("cpu_usage", 18, { unit_of_measurement: "%" });
reg("sensor.nas_main_cpu_temperature", "dev_nas1", "ugreen");
ug("cpu_model", "Intel Core i5-1235U");
ug("ram_usage", 46, { unit_of_measurement: "%" });
ug("ram_usage_used_gb", 3.7, { unit_of_measurement: "GB" });
ug("ram_total_size", 8, { unit_of_measurement: "GB" });
ug("total_runtime", 45 * 86400, { unit_of_measurement: "s" });
ug("overall_lan_download_raw", 4200000, { unit_of_measurement: "B/s" });
ug("overall_lan_upload_raw", 950000, { unit_of_measurement: "B/s" });
ug("ugos_version", "1.5.0.2358");
ug("server_status", "Normal");
ug("update_available", "False");
ug("device_fan_1", 1200, { unit_of_measurement: "rpm", friendly_name: "nas-main Device Fan 1" });
ug("power_action_reboot", "unknown", {}, "dev_nas1", "button");
ug("power_action_shutdown", "unknown", {}, "dev_nas1", "button");
ug("pool_1_label", "Pool 1", {}, "dev_nas1_p1");
ug("pool_1_level", "raid5", {}, "dev_nas1_p1");
ug("pool_1_status", "Normal", {}, "dev_nas1_p1");
ug("pool_1_used_size", 14.4, { unit_of_measurement: "TB" }, "dev_nas1_p1");
ug("pool_1_volume_1_label", "Volume 1", {}, "dev_nas1_v1");
ug("pool_1_volume_1_filesystem", "btrfs", {}, "dev_nas1_v1");
ug("pool_1_volume_1_status", "Normal", {}, "dev_nas1_v1");
ug("pool_1_volume_1_used_size_raw", 10.2e12, { unit_of_measurement: "B" }, "dev_nas1_v1");
ug("pool_1_volume_1_total_size_raw", 14.4e12, { unit_of_measurement: "B" }, "dev_nas1_v1");
for (const [n, temp, hours] of [[1, 38, 6120], [2, 39, 6118], [3, 37, 6119], [4, 47, 2210]]) {
  dev(`dev_nas1_d${n}`, `nas-main (Pool 1 | Disk ${n})`, "Samsung SSD 990 EVO Plus 4TB", "dev_nas1");
  ug(`pool_1_disk_${n}_label`, `M.2 slot ${n}`, {}, `dev_nas1_d${n}`);
  ug(`pool_1_disk_${n}_model`, "Samsung SSD 990 EVO Plus 4TB", {}, `dev_nas1_d${n}`);
  ug(`pool_1_disk_${n}_temperature`, temp, { unit_of_measurement: "°C" }, `dev_nas1_d${n}`);
  ug(`pool_1_disk_${n}_status`, "Normal", {}, `dev_nas1_d${n}`);
  ug(`pool_1_disk_${n}_power_on_hours`, hours, { unit_of_measurement: "h" }, `dev_nas1_d${n}`);
  ug(`pool_1_disk_${n}_size`, 4, { unit_of_measurement: "TB" }, `dev_nas1_d${n}`);
}
// Synology DSM: translation keys on the NAS device and on its volume and disk devices
dev("dev_nas2", "nas-backup", "DS923+");
dev("dev_nas2_v1", "Volume 1", "Synology volume", "dev_nas2");
item("dev_nas2_v1", "volume", "nas", "synology_dsm", "Volume 1", {}, { parent: "dev_nas2" });
const syn = (id, key, state, attributes = {}, device = "dev_nas2") => reg(set(id, state, attributes), device, "synology_dsm", key);
syn("sensor.nas_backup_cpu_utilization_total", "cpu_total_load", 7, { unit_of_measurement: "%" });
syn("sensor.nas_backup_memory_usage_real", "memory_real_usage", 31, { unit_of_measurement: "%" });
syn("sensor.nas_backup_memory_total_real", "memory_total_real", 4, { unit_of_measurement: "GB" });
syn("sensor.nas_backup_upload_throughput", "network_up", 310, { unit_of_measurement: "kB/s" });
syn("sensor.nas_backup_download_throughput", "network_down", 1450, { unit_of_measurement: "kB/s" });
reg("sensor.nas_backup_temperature", "dev_nas2", "synology_dsm");
syn("update.nas_backup_dsm_update", null, "off");
syn("button.nas_backup_reboot", "reboot", "unknown");
syn("button.nas_backup_shutdown", "shutdown", "unknown");
syn("sensor.nas_backup_volume_1_volume_used", "volume_percentage_used", 48, { unit_of_measurement: "%" }, "dev_nas2_v1");
syn("sensor.nas_backup_volume_1_used_space", "volume_size_used", 5.8, { unit_of_measurement: "TB" }, "dev_nas2_v1");
syn("sensor.nas_backup_volume_1_total_size", "volume_size_total", 12, { unit_of_measurement: "TB" }, "dev_nas2_v1");
syn("sensor.nas_backup_volume_1_status", "volume_status", "normal", {}, "dev_nas2_v1");
for (const n of [1, 2, 3, 4]) {
  dev(`dev_nas2_d${n}`, `Drive ${n}`, "WD Red Plus 6TB", "dev_nas2");
  reg(`sensor.nas2_drive_${n}_status`, `dev_nas2_d${n}`, "synology_dsm", "disk_status");
  reg(`sensor.nas2_drive_${n}_temperature`, `dev_nas2_d${n}`, "synology_dsm", "disk_temp");
}
// Dockhand: the environment, its stacks and containers, by translation key
dev("dev_docker", "docker-host", "Environment");
const dh = (id, key, state, attributes = {}, device = "dev_docker") => reg(set(id, state, attributes), device, "dockhand", key);
dh("sensor.docker_host_cpu_usage", "cpu_usage", 12, { unit_of_measurement: "%", cpu_count: 8 });
dh("sensor.docker_host_memory_usage", "memory_usage", 58, { unit_of_measurement: "%", memory_used_bytes: 9.3e9, memory_total_bytes: 16e9 });
reg("sensor.docker_host_containers", "dev_docker", "dockhand", "containers");
states["sensor.docker_host_containers"].attributes = { running: 6, unhealthy: 0, pending_updates_total: 3 };
states["sensor.docker_host_containers"].state = "8";
reg("sensor.docker_host_version", "dev_docker", "dockhand", "host_docker_version");
dh("sensor.docker_host_platform", "host_platform", "Debian 12 x86_64");
dh("sensor.docker_host_stacks", "stacks", 4);
dh("sensor.docker_host_images", "image_count", 23);
dh("sensor.docker_host_volumes", "volume_count", 17);
dh("sensor.docker_host_networks", "network_count", 9);
for (const [name, status, count, upd] of [["immich", "partial", 3, true], ["media", "running", 2, false], ["auth", "running", 2, true], ["docs", "stopped", 1, false]]) {
  dev(`dev_s_${name}`, `docker-host – Stacks – ${name}`, name === "auth" ? "Git Stack" : "Stack", "dev_docker");
  dh(`sensor.stack_${name}_status`, "status", status, {}, `dev_s_${name}`);
  dh(`sensor.stack_${name}_containers`, "containers_in_stack", count, {}, `dev_s_${name}`);
  dh(`binary_sensor.stack_${name}_updates`, "stack_updates_available", upd ? "on" : "off", {}, `dev_s_${name}`);
  reg(set(`switch.stack_${name}`, status === "stopped" ? "off" : "on"), `dev_s_${name}`, "dockhand");
}
for (const it of items.filter((i) => i.kind === "container")) {
  const k = it.id.replace("dev_c_", "");
  const up = states[`switch.${k}`].state === "on";
  dev(it.id, `docker-host – Containers – ${it.name}`, "Container", "dev_docker");
  dh(`sensor.${k}_state`, "state", up ? "running" : "exited", { status: up ? "Up 3 days" : "Exited (0) 2 hours ago", image: `${it.name}:${states[`update.${k}`].attributes.installed_version}`, health: up ? "healthy" : null }, it.id);
  reg(`switch.${k}`, it.id, "dockhand");
  reg(`sensor.${k}_cpu`, it.id, "dockhand", "container_cpu_percent");
  reg(`sensor.${k}_memory`, it.id, "dockhand", "container_memory_usage");
  reg(`update.${k}`, it.id, "dockhand");
  reg(`button.${k}_restart`, it.id, "dockhand", "restart");
}
// Backups: Home Assistant's own (the backup integration), each Proxmox VE node's, and a Duplicati job that failed
for (const id of ["sensor.backup_last_successful_automatic_backup", "sensor.backup_last_attempted_automatic_backup", "sensor.backup_next_scheduled_automatic_backup"])
  states[id].attributes = { device_class: "timestamp" };
dev("dev_backup", "Backup", "Home Assistant Backup");
reg("sensor.backup_last_successful_automatic_backup", "dev_backup", "backup", "last_successful_automatic_backup");
reg("sensor.backup_last_attempted_automatic_backup", "dev_backup", "backup", "last_attempted_automatic_backup");
reg("sensor.backup_next_scheduled_automatic_backup", "dev_backup", "backup", "next_scheduled_automatic_backup");
reg("sensor.backup_backup_manager_state", "dev_backup", "backup", "backup_manager_state");
for (const k of ["pve_1", "pve_2"]) {
  dev(`dev_${k}`, k.replace("_", "-"), "Node");
  states[`sensor.${k}_last_backup`].attributes = { device_class: "timestamp" };
  reg(`sensor.${k}_last_backup`, `dev_${k}`, "proxmoxve", "last_backup");
  reg(set(`sensor.${k}_backup_status`, "ok"), `dev_${k}`, "proxmoxve", "backup_status");
}
dev("dev_dup", "Photos to cloud", "Backup job");
reg(set("sensor.photos_to_cloud_last_backup", ago(30 * 3600), { device_class: "timestamp" }), "dev_dup", "duplicati");
reg(set("sensor.photos_to_cloud_status", "Error"), "dev_dup", "duplicati");
reg(set("sensor.photos_to_cloud_backup_size", 412, { unit_of_measurement: "GB" }), "dev_dup", "duplicati");
reg(set("sensor.photos_to_cloud_next_run", later(5 * 3600), { device_class: "timestamp" }), "dev_dup", "duplicati");
reg(set("button.photos_to_cloud_create_backup", "unknown"), "dev_dup", "duplicati");

/** The last 24 hours of sensors, for the tiles' curves: a smooth wave around each current value. */
export const historyOf = (ids) =>
  Object.fromEntries(
    ids.map((id, k) => {
      const v = Number.parseFloat(states[id]?.state);
      const pts = [];
      for (let i = 0; i <= 48; i++) {
        const w = Math.sin(i / 5 + k) * 0.25 + Math.sin(i / 2.3 + 2 * k) * 0.1;
        pts.push({ s: String(Math.max(0, v * (1 + w))), lu: (NOW - (48 - i) * 1800000) / 1000 });
      }
      return [id, pts];
    }),
  );

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
