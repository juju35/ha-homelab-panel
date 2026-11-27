// The README screenshots rendered by scripts/screenshots.mjs: one entry per PNG in screenshots/.
// Every screenshot is rendered in both themes from one setup, so a light/dark pair shows exactly the same state.
const pairs = [
  { light: "panel-overview", dark: "panel-overview-dark", tab: "overview" },
  { light: "panel-hosts", dark: "panel-hosts-dark", tab: "hosts" },
  { light: "panel-containers", dark: "panel-containers-dark", tab: "containers" },
  { light: "panel-confirm", dark: "panel-confirm-dark", tab: "containers", confirm: ["button.jellyfin_restart", "jellyfin"] },
  { light: "panel-storage", dark: "panel-storage-dark", tab: "storage" },
  { light: "panel-services", dark: "panel-services-dark", tab: "services" },
  { light: "panel-backups", dark: "panel-backups-dark", tab: "backups" },
  { light: "panel-settings", dark: "panel-settings-dark", tab: "settings" },
];

export const shots = pairs.flatMap(({ light, dark, ...setup }) => [
  { file: light, theme: "light", width: 1200, ...setup },
  { file: dark, theme: "dark", width: 1200, ...setup },
]);
