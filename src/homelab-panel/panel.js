// The <homelab-panel> element: loads the inventory (homelab_panel/inventory), renders the header and the active tab
// from the states, and handles the buttons (tabs, filters, actions with their confirmation, settings).
import { HOMELAB_TABS, homelabEsc, homelabLang, homelabLoadStrings, homelabPill, homelabT, HOMELAB_EN } from "./core.js";
import { homelabModel } from "./model.js";
import { homelabScene } from "./scene.js";
import { homelabDockerEnvs, homelabNasDetail } from "./detail.js";
import { homelabContainersRich, homelabHistoryIds, homelabStorageRich } from "./rich.js";
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
    // Containers list of the rich view: search, sort (name, cpu, ram), only those needing attention
    this._ct = { query: "", sort: "name", problems: false };
    this._hist = {};
    this._histAt = 0;
    this._watch = [];
    this.shadowRoot.addEventListener("click", (ev) => this._onClick(ev));
    this.shadowRoot.addEventListener("change", (ev) => this._onChange(ev));
    this.shadowRoot.addEventListener("input", (ev) => this._onInput(ev));
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
    // The rich tabs read more entities than the inventory's roles: those of the last render
    for (const id of this._watch) sig += `${s[id]?.last_updated || ""}${s[id]?.state || ""};`;
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
    const m = homelabModel(this._inv, this._hass, this._settings);
    const ctx = {
      t,
      lang,
      strings: this._strings,
      filter: this._filter,
      hass: this._hass,
      items: this._inv?.items || [],
      hist: this._hist,
      now: Date.now(),
      diskTemp: this._settings?.disk_warning_temperature ?? 45,
      showStopped: this._settings?.show_stopped ?? true,
      ct: this._ct,
    };
    // Dockhand environments and Portainer endpoints the inventory keeps (a source left out in the settings is not shown)
    const hostIds = new Set(m.dockerHosts.map((d) => d.id));
    const envs = (homelabDockerEnvs(this._hass) || []).filter((e) => hostIds.has(e.id));
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
        containers: () => {
          const rich = homelabContainersRich(ctx, envs);
          if (!rich) return homelabContainers(m, ctx);
          // Containers of Monitor Docker (no environment device) keep the table under the environments
          const rest = m.containers.filter((x) => x.platform === "monitor_docker");
          return rest.length ? `${rich}<div style="height:14px"></div>${homelabContainers({ ...m, containers: rest, shownContainers: m.shownContainers.filter((x) => x.platform === "monitor_docker") }, ctx)}` : rich;
        },
        storage: () => homelabStorageRich(m, ctx) ?? homelabStorage(m, ctx),
        services: () => homelabServices(m, ctx),
        backups: () => homelabBackups(m, ctx),
        settings: () => homelabSettings(this._inv, this._settings || {}, ctx),
      }[tab]();
    this._watch = tab === "storage" || tab === "containers" ? this._watchIds(m, ctx, envs, tab) : [];
    if (tab === "storage" || tab === "containers") this._loadHistory(homelabHistoryIds(tab === "storage" ? m : { nas: [] }, ctx, tab === "containers" ? envs : []));
    const alerts = m.alerts.length;
    const pill = this._inv ? homelabPill(alerts ? t("pill_alerts", { n: alerts }) : t("pill_ok"), alerts ? (m.alerts.some((a) => ["host", "service", "ups"].includes(a.kind)) ? "crit" : "warn") : "ok") : "";
    const names = [m.hosts.length && "Proxmox", m.containers.length && "Docker", m.nas.length && "NAS", m.ups.length && "UPS", m.services.length && "Uptime Kuma"].filter(Boolean).join(" · ");
    const scene = homelabScene({ width: Math.max(640, this.clientWidth || 1216), nas: m.nas.map((n) => ({ model: n.model, brand: n.brand })), ups: m.ups.length > 0 || !this._inv?.configured, rack: m.hosts.length > 0 || !this._inv?.configured, night });
    const tabs = shownTabs.map((k) => `<button data-tab="${k}" class="${k === tab ? "on" : ""}" ${k === tab ? 'aria-current="page"' : ""}>${homelabEsc(t(`tab_${k}`))}</button>`).join("");
    const focus = this.shadowRoot.activeElement?.dataset?.ct;
    const caret = focus ? this.shadowRoot.activeElement.selectionStart : null;
    this.shadowRoot.innerHTML = `<style>${HOMELAB_STYLE}</style><div class="wrap${night ? " night" : ""}"><header class="banner">${scene}<div class="htext"><div class="hicon">${HOMELAB_ICON}</div><div class="htitle"><div class="n">${t("title")}</div><div class="s">${homelabEsc(names)}</div></div>${pill}</div><button class="hbtn" data-refresh aria-label="${homelabEsc(t("refresh"))}" title="${homelabEsc(t("refresh"))}">${HOMELAB_REFRESH}</button></header><nav class="tabs" aria-label="${homelabEsc(t("title"))}">${tabs}</nav><main>${body}</main>${this._confirm ? this._confirmHtml() : ""}</div>`;
    // The search field keeps its focus and caret across the render its typing asked for
    if (focus) {
      const input = this.shadowRoot.querySelector(`[data-ct="${focus}"]`);
      if (input) {
        input.focus();
        if (caret !== null) input.setSelectionRange(caret, caret);
      }
    }
  }

  /** Every entity a rich tab reads, so a change of any of them renders it again. */
  _watchIds(m, ctx, envs, tab) {
    const ids = [];
    if (tab === "storage")
      for (const n of m.nas) {
        const d = homelabNasDetail(this._hass, n, ctx.items);
        if (!d) continue;
        ids.push(...Object.values(d.scalars), ...d.fans);
        for (const p of d.pools) {
          for (const [k, v] of Object.entries(p)) if (typeof v === "string" && k !== "fallback") ids.push(v);
          for (const x of [...p.volumes, ...p.disks]) for (const [k, v] of Object.entries(x)) if (typeof v === "string" && k !== "fallback" && k !== "modelText") ids.push(v);
        }
      }
    else
      for (const env of envs) {
        ids.push(...Object.values(env.entities));
        for (const x of [...env.stacks, ...env.containers]) ids.push(...Object.values(x.entities));
      }
    return [...new Set(ids.filter(Boolean))];
  }

  /** The last 24 hours of the tiles' entities, read again every 10 minutes (or when the list changes). */
  async _loadHistory(ids) {
    const key = ids.join(",");
    if (!ids.length || (key === this._histKey && Date.now() - this._histAt < 600000)) return;
    this._histKey = key;
    this._histAt = Date.now();
    try {
      const end = new Date();
      const res = await this._hass.callWS({
        type: "history/history_during_period",
        start_time: new Date(end.getTime() - 86400000).toISOString(),
        end_time: end.toISOString(),
        entity_ids: ids,
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false,
      });
      const hist = {};
      for (const id of ids)
        hist[id] = (res?.[id] || [])
          .map((p) => ({ t: (p.lu ?? p.last_updated_ts ?? Date.parse(p.last_updated || p.last_changed || "") / 1000) * 1000, v: Number.parseFloat(p.s ?? p.state) }))
          .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v));
      this._hist = hist;
      this._render(true);
    } catch (_) {
      // No history (recorder off): the tiles stay without their curve
    }
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
    else if (act === "install") await this._hass.callService("update", "install", { entity_id: entity });
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
    else if (d.more !== undefined) {
      if (d.more) this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: d.more }, bubbles: true, composed: true }));
    } else if (d.ctsort) {
      this._ct = { ...this._ct, sort: d.ctsort };
      this._render(true);
    } else if (d.ctproblems !== undefined) {
      this._ct = { ...this._ct, problems: !this._ct.problems };
      this._render(true);
    }
    else if (d.filter) {
      this._filter = d.filter;
      this._render(true);
    } else if (d.refresh !== undefined) {
      this._inv = null;
      this._render(true);
      this._load();
    } else if (d.retry !== undefined) this._load();
    else if (d.act) {
      const ask = d.act === "press" || d.act === "toggle" || d.act === "install";
      if (ask && this._settings?.confirm_actions !== false && ["restart", "stop", "install"].includes(d.op)) {
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

  _onInput(ev) {
    const el = ev.target;
    if (el?.dataset?.ct === "query") {
      this._ct = { ...this._ct, query: el.value };
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
