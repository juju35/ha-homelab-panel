// Imports the panel (an ES module) with just enough browser stubs to define its element.
const defined = new Map();
globalThis.HTMLElement ??= class {
  attachShadow() {
    this.shadowRoot = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [], addEventListener() {} };
    return this.shadowRoot;
  }
};
globalThis.customElements ??= { get: (n) => defined.get(n), define: (n, c) => defined.set(n, c) };
globalThis.CustomEvent ??= class {
  constructor(type, init) {
    this.type = type;
    this.detail = init?.detail;
  }
};
globalThis.history ??= { pushState() {}, replaceState() {} };
globalThis.window ??= { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} };

export const lib = await import(new URL("../custom_components/homelab_panel/frontend/homelab-panel.js", import.meta.url));
export const element = (name) => defined.get(name);
