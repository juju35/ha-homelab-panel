// The sidebar panel: languages, formatting, what the model reads from the states, and what each tab renders.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { devices, entities, inventory, NOW, states } from "../scripts/mock-states.mjs";
import { lib } from "./load.mjs";

const i18n = new URL("../custom_components/homelab_panel/frontend/i18n/", import.meta.url);
const placeholders = (s) => (String(s).match(/\{\w+\}/g) || []).sort();
const clone = (o) => JSON.parse(JSON.stringify(o));

test("every language file has one string per English key, with its placeholders", () => {
  const files = readdirSync(i18n).map((f) => f.replace(/\.json$/, ""));
  assert.deepEqual([...files].sort(), lib.HOMELAB_LANGS.filter((l) => l !== "en").sort());
  assert.equal(lib.HOMELAB_LANGS.length, 22);
  for (const lang of files) {
    const strings = JSON.parse(readFileSync(new URL(`${lang}.json`, i18n), "utf8"));
    assert.deepEqual(Object.keys(strings).sort(), Object.keys(lib.HOMELAB_EN).sort(), lang);
    for (const [k, v] of Object.entries(strings)) {
      assert.ok(v.trim(), `${lang}.${k}`);
      assert.deepEqual(placeholders(v), placeholders(lib.HOMELAB_EN[k]), `${lang}.${k}`);
    }
  }
});

test("the language resolves to the full code, then its base, then English", () => {
  for (const [code, lang] of [["fr-FR", "fr"], ["sr-Latn", "sr-Latn"], ["pt-BR", "pt"], ["ja", "en"], [undefined, "en"]]) {
    assert.equal(lib.homelabLang(code), lang);
  }
});

test("sizes in decimal units, durations in their largest unit", () => {
  assert.equal(lib.homelabBytes(14.4e12), "14 TB");
  assert.equal(lib.homelabBytes(2.5e9), "2.5 GB");
  assert.equal(lib.homelabBytes(512), "512 B");
  assert.equal(lib.homelabBytes(null), "—");
  assert.equal(lib.homelabBytes(2.5e9, "fr"), "2,5 GB");
  assert.equal(lib.homelabDuration(12 * 86400 + 3600, lib.HOMELAB_EN), "12 days");
  assert.equal(lib.homelabDuration(5 * 3600, lib.HOMELAB_EN), "5 h");
  assert.equal(lib.homelabDuration(20, lib.HOMELAB_EN), "1 min");
});

test("text read from states and registries is escaped", () => {
  assert.equal(lib.homelabEsc(`<img src=x onerror="a">&'`), "&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;");
});

test("the model counts every kind and raises the alerts", () => {
  const m = lib.homelabModel(inventory, { states }, inventory.settings, NOW);
  assert.equal(m.hosts.length, 2);
  assert.equal(m.guests.length, 5);
  assert.equal(m.containers.length, 8);
  assert.equal(m.dockerHosts.length, 1);
  assert.deepEqual(
    m.nas.map((n) => [n.name, n.brand, n.disks.length]),
    [
      ["nas-main", "ugreen", 4],
      ["nas-backup", "synology", 4],
    ],
  );
  assert.equal(m.ups.length, 1);
  assert.equal(m.services.length, 8);
  assert.equal(m.certificates.length, 2);
  // Two stopped containers, a hot drive, a service down, a certificate expiring within 14 days
  assert.deepEqual(m.alerts.map((a) => a.kind).sort(), ["certificate", "container", "container", "nas", "service"]);
  // A higher threshold: the drive at 47 °C is no longer hot
  const cool = lib.homelabModel(inventory, { states }, { ...inventory.settings, disk_warning_temperature: 50 }, NOW);
  assert.equal(cool.alerts.filter((a) => a.kind === "nas").length, 0);
  // Stopped machines and containers left out when asked
  const shown = lib.homelabModel(inventory, { states }, { ...inventory.settings, show_stopped: false }, NOW);
  assert.equal(shown.shownContainers.length, 6);
});

test("an unavailable host is down", () => {
  const s = clone(states);
  const host = inventory.items.find((i) => i.kind === "host");
  s[host.entities.status].state = "unavailable";
  for (const id of Object.values(host.entities)) s[id].state = "unavailable";
  const m = lib.homelabModel(inventory, { states: s }, inventory.settings, NOW);
  assert.ok(m.alerts.some((a) => a.kind === "host"));
});

test("each NAS model has its own drawing", () => {
  const ugreen = lib.homelabNasSvg("DXP480T Plus", "ugreen");
  const synology = lib.homelabNasSvg("DS923+", "synology");
  const qnap = lib.homelabNasSvg("TS-464", "qnap");
  for (const svg of [ugreen, synology, qnap]) assert.match(svg, /^<svg/);
  assert.notEqual(ugreen, synology);
  assert.notEqual(synology, qnap);
});

test("the header scene holds one drawing per NAS, a moon at night", () => {
  const day = lib.homelabScene({ width: 1200, nas: [{ model: "DS923+", brand: "synology" }], ups: true, night: false });
  const night = lib.homelabScene({ width: 1200, nas: [{ model: "DS923+", brand: "synology" }], ups: true, night: true });
  assert.match(day, /^<svg/);
  assert.notEqual(day, night);
});

const panel = (path = "/overview", extra = {}) => {
  const Panel = lib.HomelabPanel;
  const p = new Panel();
  const calls = [];
  p._hass = { states, language: "en", themes: { darkMode: false }, callService: async (...a) => calls.push(a), callWS: async () => ({}), ...extra };
  p._inv = clone(inventory);
  p._settings = { ...inventory.settings };
  p._route = { path };
  p._render(true);
  return { p, calls, html: () => p.shadowRoot.innerHTML };
};

test("every tab renders, the active one marked", () => {
  for (const tab of ["overview", "hosts", "containers", "storage", "services", "backups", "settings"]) {
    const { html } = panel(`/${tab}`);
    assert.match(html(), new RegExp(`data-tab="${tab}" class="on"`), tab);
    assert.doesNotMatch(html(), /undefined|NaN|\[object Object\]/, tab);
  }
  assert.match(panel("/hosts").html(), /pve-1/);
  assert.match(panel("/storage").html(), /nas-backup/);
  assert.match(panel("/services").html(), /Paperless/);
  assert.match(panel("/unknown").html(), /data-tab="overview" class="on"/);
});

test("a tab with nothing to show is hidden, its address falls back to the overview", () => {
  const Panel = lib.HomelabPanel;
  const p = new Panel();
  p._hass = { states, language: "en", themes: { darkMode: false }, callService: async () => {}, callWS: async () => ({}) };
  p._inv = clone(inventory);
  p._inv.items = p._inv.items.filter((i) => !["host", "guest_vm", "guest_lxc"].includes(i.kind));
  p._settings = { ...inventory.settings };
  p._route = { path: "/hosts" };
  p._render(true);
  const html = p.shadowRoot.innerHTML;
  assert.doesNotMatch(html, /data-tab="hosts"/);
  assert.match(html, /data-tab="overview" class="on"/);
  assert.match(html, /data-tab="settings"/);
});

test("a service listed twice shows once, the containers tab has no Docker hosts list", () => {
  const inv = clone(inventory);
  const svc = inv.items.find((i) => i.kind === "service");
  inv.items.push({ ...clone(svc), id: `${svc.id}-again`, entities: {} });
  const m = lib.homelabModel(inv, { states }, inv.settings, NOW);
  assert.equal(m.services.filter((s) => s.name === svc.name).length, 1);
  assert.ok(m.services.find((s) => s.name === svc.name).status, "the copy with a status is kept");
  assert.doesNotMatch(panel("/containers").html(), /Docker hosts/);
});

test("names are escaped in the render", () => {
  const { p, html } = panel("/hosts");
  p._inv.items.find((i) => i.kind === "host").name = "<b>evil</b>";
  p._render(true);
  assert.doesNotMatch(html(), /<b>evil<\/b>/);
  assert.match(html(), /&lt;b&gt;evil&lt;\/b&gt;/);
});

test("a restart asks first, then presses the button", async () => {
  const { p, calls, html } = panel("/hosts");
  const click = (dataset) => p._onClick({ composedPath: () => [{ dataset, tagName: "BUTTON" }], target: null });
  const guest = inventory.items.find((i) => i.kind.startsWith("guest") && i.entities.restart);
  click({ act: "press", op: "restart", entity: guest.entities.restart, name: guest.name, label: "Restart" });
  assert.match(html(), /role="dialog"/);
  assert.equal(calls.length, 0);
  click({ confirm: "" });
  await new Promise((r) => setTimeout(r));
  assert.deepEqual(calls, [["button", "press", { entity_id: guest.entities.restart }]]);
  // Without confirmation
  p._settings.confirm_actions = false;
  click({ act: "press", op: "restart", entity: guest.entities.restart, name: guest.name, label: "Restart" });
  await new Promise((r) => setTimeout(r));
  assert.equal(calls.length, 2);
});

test("night follows the theme", () => {
  assert.match(panel("/overview", { themes: { darkMode: true } }).html(), /class="wrap night"/);
  assert.doesNotMatch(panel("/overview").html(), /class="wrap night"/);
});

test("nothing found: the panel says what to add, except in Settings", () => {
  const { p, html } = panel("/overview");
  p._inv = { configured: false, sources: {}, items: [] };
  p._render(true);
  assert.match(html(), /No homelab integration/);
  p._route = { path: "/settings" };
  p._render(true);
  assert.doesNotMatch(html(), /No homelab integration/);
});

test("the version is the package's", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(lib.HOMELAB_PANEL_VERSION, pkg.version);
});

test("NAS detail: UGREEN's entity ids and Synology DSM's translation keys", () => {
  const hass = { states, entities, devices };
  const items = inventory.items;
  const ug = lib.homelabNasDetail(hass, items.find((i) => i.id === "dev_nas1"), items);
  assert.equal(ug.scalars.cpu_usage, "sensor.nas_main_cpu_usage");
  assert.equal(ug.scalars.reboot, "button.nas_main_power_action_reboot");
  assert.equal(ug.pools.length, 1);
  assert.equal(ug.pools[0].level, "sensor.nas_main_pool_1_level");
  assert.equal(ug.pools[0].volumes[0].used, "sensor.nas_main_pool_1_volume_1_used_size_raw");
  assert.equal(ug.pools[0].disks.length, 4);
  assert.deepEqual(ug.fans, ["sensor.nas_main_device_fan_1"]);
  const syn = lib.homelabNasDetail(hass, items.find((i) => i.id === "dev_nas2"), items);
  assert.equal(syn.scalars.cpu_usage, "sensor.nas_backup_cpu_utilization_total");
  assert.equal(syn.scalars.lan_down, "sensor.nas_backup_download_throughput");
  assert.equal(syn.scalars.sys_temp, "sensor.nas_backup_temperature");
  assert.equal(syn.pools[0].volumes[0].used_pct, "sensor.nas_backup_volume_1_volume_used");
  assert.equal(syn.pools[0].disks.length, 4);
  assert.equal(lib.homelabNasDetail({ states }, items[0], items), null, "no registries, no detail");
});

test("Docker environments: Dockhand's stacks and containers, their figures", () => {
  const hass = { states, entities, devices };
  const [env] = lib.homelabDockerEnvs(hass);
  assert.equal(env.name, "docker-host");
  assert.equal(env.stacks.length, 4);
  assert.equal(env.containers.length, 8);
  const st = lib.homelabDockerStats(hass, env);
  assert.deepEqual([st.cpu, st.mem, st.running, st.containers, st.updates], [12, 58, 6, 8, 3]);
  const ml = lib.homelabContainerStats(hass, env.containers.find((c) => c.name === "immich-ml"));
  assert.equal(ml.cls, "crit");
  assert.equal(ml.on, false);
  const kuma = lib.homelabContainerStats(hass, env.containers.find((c) => c.name === "uptime-kuma"));
  assert.equal(kuma.update.entity_id, "update.uptime_kuma");
  assert.equal(kuma.cls, "ok");
});

test("the rich Storage and Containers tabs, the image update asked first", async () => {
  const extra = { entities, devices };
  const storage = panel("/storage", extra).html();
  assert.match(storage, /RAID5/);
  assert.match(storage, /M\.2 slot 4/);
  assert.match(storage, /data-entity="button\.nas_main_power_action_shutdown"/);
  assert.doesNotMatch(storage, /undefined|NaN|\[object Object\]/);
  const { p, calls, html } = panel("/containers", extra);
  assert.match(html(), /data-act="install"/);
  assert.match(html(), /Needing attention/);
  assert.doesNotMatch(html(), /undefined|NaN|\[object Object\]/);
  p._onClick({ composedPath: () => [{ dataset: { ctproblems: "" } }], target: null });
  assert.doesNotMatch(html(), />vaultwarden</, "only containers needing attention");
  const click = (dataset) => p._onClick({ composedPath: () => [{ dataset, tagName: "BUTTON" }], target: null });
  click({ act: "install", op: "install", entity: "update.uptime_kuma", name: "uptime-kuma", label: "Update" });
  assert.match(html(), /role="dialog"/);
  click({ confirm: "" });
  await new Promise((r) => setTimeout(r));
  assert.deepEqual(calls, [["update", "install", { entity_id: "update.uptime_kuma" }]]);
});

test("backups: every source with its state, a backup started its own way", async () => {
  const hass = { states, entities, devices };
  const sources = lib.homelabBackupSources(hass);
  assert.deepEqual(sources.map((x) => x.platform).sort(), ["backup", "duplicati", "proxmoxve", "proxmoxve"]);
  const dup = sources.find((x) => x.platform === "duplicati");
  assert.equal(lib.homelabBackupState(hass, dup, NOW).status, "failed");
  assert.equal(lib.homelabBackupState(hass, sources.find((x) => x.platform === "backup"), NOW).status, "ok");
  const { p, calls, html } = panel("/backups", { entities, devices });
  assert.match(html(), /Photos to cloud/);
  assert.match(html(), /data-bkrun=/);
  assert.doesNotMatch(html(), /undefined|NaN|\[object Object\]/);
  p._onClick({ composedPath: () => [{ dataset: { bkrun: dup.key } }], target: null });
  await new Promise((r) => setTimeout(r));
  assert.deepEqual(calls, [["button", "press", { entity_id: "button.photos_to_cloud_create_backup" }]]);
});

test("the overview: the plan, what needs attention with its action, resources, services, backups", () => {
  const html = panel("/overview", { entities, devices }).html();
  assert.match(html, /class="card plan"/);
  assert.match(html, /data-tab="storage"/);
  assert.match(html, /71 % · 10 TB \/ 14 TB/, "the NAS figures come from its volumes");
  assert.match(html, /Needs attention/);
  assert.match(html, /data-act="toggle"[^>]*data-entity="switch\.paperless"/);
  assert.match(html, /data-bkrun=/);
  assert.match(html, /data-review/);
  assert.match(html, /Backups, power and certificates/);
  assert.doesNotMatch(html, /undefined|NaN|\[object Object\]/);
});

test("NAS detail: UGREEN's states found by their UGNAS id, whatever device holds them", () => {
  // The volume's entities on no device the inventory knows: still read, as ha-nas-card does
  const ents = Object.fromEntries(Object.entries(entities).filter(([, e]) => e.device_id !== "dev_nas1_v1"));
  const d = lib.homelabNasDetail({ states, entities: ents, devices }, inventory.items.find((i) => i.id === "dev_nas1"), inventory.items);
  assert.equal(d.pools[0].volumes[0].used, "sensor.nas_main_pool_1_volume_1_used_size_raw");
});

test("the plan draws a Docker host as the machine it runs on", () => {
  const { p } = panel("/overview", { entities, devices });
  const art = p._planArt();
  assert.match(art.env({ id: "a", name: "Home Assistant" }, []), /#18BCF2/);
  const nas = inventory.items.find((i) => i.id === "dev_nas1");
  assert.match(art.env({ id: "b", name: "Nas" }, [{ ...nas, brand: "ugreen" }]), /pbadge/);
  assert.match(art.env({ id: "c", name: "docker-host" }, []), /pwhale/);
});

test("a language file is fetched with the version, so an update never shows a cached older one", async () => {
  const urls = [];
  const saved = globalThis.fetch;
  globalThis.fetch = async (url) => {
    urls.push(url);
    return { ok: true, json: async () => ({ title: "Homelab" }) };
  };
  try {
    assert.equal((await lib.homelabLoadStrings("sv")).title, "Homelab");
  } finally {
    globalThis.fetch = saved;
  }
  assert.deepEqual(urls, [`/homelab_panel/i18n/sv.json?v=${lib.HOMELAB_PANEL_VERSION}`]);
});
