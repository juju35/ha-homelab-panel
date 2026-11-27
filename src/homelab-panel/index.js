// Entry point: the modules in their order. scripts/build-frontend.mjs (scripts/bundle.mjs) concatenates them in this
// order into the single module the integration serves (custom_components/homelab_panel/frontend/homelab-panel.js).
import "./core.js";
import "./drawings.js";
import "./model.js";
import "./detail.js";
import "./backup.js";
import "./scene.js";
import "./styles.js";
import "./tabs.js";
import "./rich.js";
import "./panel.js";
// The assembled module's own exports (the other `export`s only join the modules)
export { HOMELAB_EN, HOMELAB_LANGS, HOMELAB_PANEL_VERSION, homelabAgo, homelabBytes, homelabDuration, homelabEsc, homelabLang } from "./core.js";
export { homelabNasSvg } from "./drawings.js";
export { homelabModel } from "./model.js";
export { homelabContainerStats, homelabDockerEnvs, homelabDockerStats, homelabNasDetail, homelabSpark } from "./detail.js";
export { homelabBackupSources, homelabBackupState } from "./backup.js";
export { homelabBackupsRich, homelabContainersRich, homelabStorageRich } from "./rich.js";
export { homelabScene } from "./scene.js";
export { HomelabPanel } from "./panel.js";
