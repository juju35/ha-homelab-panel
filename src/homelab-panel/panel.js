// The <homelab-panel> element: loads the inventory (homelab_panel/inventory), renders the header and the active tab
// from the states, and handles the buttons (tabs, filters, actions with their confirmation, settings).
import { HOMELAB_TABS, homelabEsc, homelabLang, homelabLoadStrings, homelabPill, homelabT, HOMELAB_EN } from "./core.js";
import { homelabModel } from "./model.js";
import { homelabScene } from "./scene.js";
import { HOMELAB_STYLE } from "./styles.js";
import { homelabBackups, homelabContainers, homelabHosts, homelabOverview, homelabServices, homelabSettings, homelabStorage } from "./tabs.js";

const HOMELAB_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01"/></svg>`;
const HOMELAB_REFRESH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>`;

export class HomelabPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._strings = HOMELAB_EN;
    this._filter = "all";
    this._sig = "";
    this.shadowRoot.addEventListener("click", (ev) => this._onClick(ev));
    this.shadowRoot.addEventListener("change", (ev) => this._onChange(ev));
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    const lang = this._lang();
    if (lang !== this._loadedLang) {
      this._loadedLang = lang;
      homelabLoadStrings(lang).then((s) => {
        this._strings = s;
        this._render(true);
      });
    }
    if (first) this._load();
    else this._render();
  }

  get hass() {
    return this._hass;
  }

  set route(route) {
    this._route = route;
    this._render(true);
  }

  set panel(panel) {
    this._panel = panel;
  }

  set narrow(_) {}

  /** The language: the full code, then its base, then English. */
  _lang() {
    return homelabLang(this._hass?.locale?.language || this._hass?.language);
  }

  _t(key, vars) {
    return homelabT(this._strings, key, vars);
  }

  get _tab() {
    const tab = String(this._route?.path || "").replace(/^\//, "").split("/")[0];
    return HOMELAB_TABS.includes(tab) ? tab : "overview";
  }

  async _load() {
    try {
      const res = await this._hass.callWS({ type: "homelab_panel/inventory" });
      this._inv = res;
      this._settings = res.settings || {};
      this._error = null;
    } catch (err) {
      this._error = err?.code === "unauthorized" ? "denied" : err?.message || String(err);
    }
    this._render(true);
  }

  // The entities the panel reads: a render is needed only when one of them changes
  _signature() {
    const s = this._hass?.states || {};
    let sig = `${this._hass?.themes?.darkMode}|`;
    for (const item of this._inv?.items || []) for (const id of Object.values(item.entities || {})) sig += `${s[id]?.last_updated || ""}${s[id]?.state || ""};`;
    return sig;
  }

  _render(force = false) {
    if (!this._hass) return;
    if (!force) {
      // Never re-render under an input being typed in (Settings)
      if (this.shadowRoot.activeElement?.tagName === "INPUT") return;
      const sig = this._signature();
      if (sig === this._sig) return;
      this._sig = sig;
    } else this._sig = this._signature();
    const night = !!this._hass.themes?.darkMode;
    const t = (k, v) => this._t(k, v);
    const lang = this._lang();
    const ctx = { t, lang, strings: this._strings, filter: this._filter };
    const m = homelabModel(this._inv, this._hass, this._settings);
    // A tab with nothing to show is hidden once the inventory is known (overview and settings always stay)
    const has = {
      hosts: m.hosts.length || m.guests.length,
      containers: m.containers.length,
      storage: m.nas.length,
      services: m.services.length || m.proxies.length || m.certificates.length,
      backups: m.backups.length || m.hosts.some((h) => h.entities.last_backup),
    };
    const shownTabs = HOMELAB_TABS.filter((k) => !this._inv?.configured || !(k in has) || has[k]);
    const tab = shownTabs.includes(this._tab) ? this._tab : "overview";
    let body;
    if (this._error === "denied") body = `<div class="card empty">${homelabEsc(t("denied"))}</div>`;
    else if (this._error) body = `<div class="card empty">${homelabEsc(t("error", { error: this._error }))}<br><br><button class="btn accent" data-retry>${t("retry")}</button></div>`;
    else if (!this._inv) body = `<div class="card empty">${t("loading")}</div>`;
    else if (!this._inv.configured && tab !== "settings") body = `<div class="card empty">${homelabEsc(t("nothing"))}</div>`;
    else
      body = {
        overview: () => homelabOverview(m, ctx),
        hosts: () => homelabHosts(m, ctx),
        containers: () => homelabContainers(m, ctx),
        storage: () => homelabStorage(m, ctx),
        services: () => homelabServices(m, ctx),
        backups: () => homelabBackups(m, ctx),
        settings: () => homelabSettings(this._inv, this._settings || {}, ctx),
      }[tab]();
    const alerts = m.alerts.length;
    const pill = this._inv ? homelabPill(alerts ? t("pill_alerts", { n: alerts }) : t("pill_ok"), alerts ? (m.alerts.some((a) => ["host", "service", "ups"].includes(a.kind)) ? "crit" : "warn") : "ok") : "";
    const names = [m.hosts.length && "Proxmox", m.containers.length && "Docker", m.nas.length && "NAS", m.ups.length && "UPS", m.services.length && "Uptime Kuma"].filter(Boolean).join(" · ");
    const scene = homelabScene({ width: Math.max(640, this.clientWidth || 1216), nas: m.nas.map((n) => ({ model: n.model, brand: n.brand })), ups: m.ups.length > 0 || !this._inv?.configured, night });
    const tabs = shownTabs.map((k) => `<button data-tab="${k}" class="${k === tab ? "on" : ""}" ${k === tab ? 'aria-current="page"' : ""}>${homelabEsc(t(`tab_${k}`))}</button>`).join("");
    this.shadowRoot.innerHTML = `<style>${HOMELAB_STYLE}</style><div class="wrap${night ? " night" : ""}"><header class="banner">${scene}<div class="htext"><div class="hicon">${HOMELAB_ICON}</div><div class="htitle"><div class="n">${t("title")}</div><div class="s">${homelabEsc(names)}</div></div>${pill}</div><button class="hbtn" data-refresh aria-label="${homelabEsc(t("refresh"))}" title="${homelabEsc(t("refresh"))}">${HOMELAB_REFRESH}</button></header><nav class="tabs" aria-label="${homelabEsc(t("title"))}">${tabs}</nav><main>${body}</main>${this._confirm ? this._confirmHtml() : ""}</div>`;
  }

  _confirmHtml() {
    const c = this._confirm;
    return `<div class="modal" data-cancel><div class="card" role="dialog" aria-modal="true"><h3>${homelabEsc(this._t("confirm", { action: c.label, name: c.name }))}</h3><div class="acts"><button class="btn" data-cancel>${homelabEsc(this._t("cancel"))}</button><button class="btn danger" data-confirm>${homelabEsc(c.label)}</button></div></div></div>`;
  }

  _navigate(tab) {
    const base = this._panel?.url_path || "homelab";
    history.pushState(null, "", `/${base}/${tab}`);
    window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
    this._route = { path: `/${tab}` };
    this._render(true);
  }

  async _act(act, entity) {
    const [domain] = entity.split(".");
    if (act === "press") await this._hass.callService("button", "press", { entity_id: entity });
    else if (act === "toggle") await this._hass.callService(domain === "switch" ? "switch" : "homeassistant", "toggle", { entity_id: entity });
  }

  async _save(patch) {
    this._settings = { ...this._settings, ...patch };
    const res = await this._hass.callWS({ type: "homelab_panel/update_settings", ...patch });
    if (res?.settings) this._settings = res.settings;
    if ("sources" in patch) await this._load();
    else this._render(true);
  }

  _onClick(ev) {
    const el = ev.composedPath().find((n) => n?.dataset && Object.keys(n.dataset).length);
    if (!el) return;
    const d = el.dataset;
    if (d.tab) this._navigate(d.tab);
    else if (d.filter) {
      this._filter = d.filter;
      this._render(true);
    } else if (d.refresh !== undefined) {
      this._inv = null;
      this._render(true);
      this._load();
    } else if (d.retry !== undefined) this._load();
    else if (d.act) {
      const ask = d.act === "press" || d.act === "toggle";
      if (ask && this._settings?.confirm_actions !== false && (d.op === "restart" || d.op === "stop")) {
        this._confirm = { act: d.act, entity: d.entity, name: d.name, label: d.label };
        this._render(true);
      } else this._act(d.act, d.entity);
    } else if (d.confirm !== undefined && this._confirm) {
      const c = this._confirm;
      this._confirm = null;
      this._render(true);
      this._act(c.act, c.entity);
    } else if (d.cancel !== undefined && (ev.target === el || el.tagName === "BUTTON")) {
      this._confirm = null;
      this._render(true);
    }
  }

  _onChange(ev) {
    const el = ev.target;
    const d = el?.dataset || {};
    if (d.src) {
      const set = new Set(this._settings?.sources || []);
      if (el.checked) set.add(d.src);
      else set.delete(d.src);
      this._save({ sources: [...set] });
    } else if (d.set) this._save({ [d.set]: el.checked });
    else if (d.num) {
      const n = Number.parseInt(el.value, 10);
      if (Number.isFinite(n)) this._save({ [d.num]: n });
    }
  }
}

if (!customElements.get("homelab-panel")) customElements.define("homelab-panel", HomelabPanel);
