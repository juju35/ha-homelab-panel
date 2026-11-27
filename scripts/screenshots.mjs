// Renders the sidebar panel with mock homelab data and saves the README screenshots.
// Usage: npm run screenshots (CHROMIUM_PATH=/path/to/chrome to use an installed browser)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { devices, entities, historyOf, inventory, NOW, states } from "./mock-states.mjs";
import { shots } from "./screenshot-shots.mjs";
import { writeIfChanged } from "./screenshot-write.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const frontend = `${root}custom_components/homelab_panel/frontend/`;
// The panel is an ES module: the page is served from a fake origin whose /homelab_panel/ files come from the repository.
const ORIGIN = "http://ha.test";

const THEMES = {
  light: {
    "--primary-background-color": "#e8eaed",
    "--card-background-color": "#ffffff",
    "--primary-text-color": "#212121",
    "--secondary-text-color": "#5f6368",
  },
  dark: {
    "--primary-background-color": "#111418",
    "--card-background-color": "#1c1f24",
    "--primary-text-color": "#e6e6e6",
    "--secondary-text-color": "#a3a8b0",
  },
};

const pageHtml = (theme, width) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  :root { ${Object.entries(THEMES[theme]).map(([k, v]) => `${k}:${v};`).join("")} }
  body { margin: 0; background: var(--primary-background-color); color: var(--primary-text-color);
         font-family: Roboto, "Segoe UI", Helvetica, Arial, sans-serif; width: ${width}px; }
</style></head><body><div id="root"></div></body></html>`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

async function open(s) {
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: s.width, height: 1400 } });
  await page.clock.setFixedTime(NOW);
  page.on("pageerror", (err) => console.error(`${s.file}: ${err.message}`));
  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/homelab_panel/") && path.endsWith(".js"))
      return route.fulfill({ contentType: "text/javascript", body: readFileSync(`${frontend}${path.slice(15)}`, "utf8") });
    if (path.startsWith("/homelab_panel/i18n/")) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ contentType: "text/html", body: pageHtml(s.theme, s.width) });
  });
  await page.goto(`${ORIGIN}/`);
  await page.addScriptTag({ url: "/homelab_panel/homelab-panel.js", type: "module" });
  await page.evaluate(
    async ({ s, states, inventory, entities, devices, history }) => {
      const hass = {
        states,
        entities,
        devices,
        language: "en",
        locale: { language: "en" },
        user: { is_admin: true },
        themes: { darkMode: s.theme === "dark" },
        callWS: async (msg) => (msg.type === "homelab_panel/inventory" ? inventory : msg.type === "history/history_during_period" ? history : { settings: inventory.settings }),
        callService: async () => {},
      };
      await customElements.whenDefined("homelab-panel");
      const el = document.createElement("homelab-panel");
      el.panel = { url_path: "homelab", config: { version: "test" } };
      el.route = { path: `/${s.tab}` };
      document.getElementById("root").appendChild(el);
      el.hass = hass;
      if (s.confirm)
        setTimeout(() => {
          el._confirm = { act: "press", entity: s.confirm[0], name: s.confirm[1], label: "Restart" };
          el._render(true);
        }, 300);
    },
    { s, states, inventory, entities, devices, history: historyOf(Object.keys(states)) },
  );
  await page.waitForTimeout(700);
  return page;
}

for (const s of shots) {
  const page = await open(s);
  const height = await page.evaluate(() => Math.ceil(document.querySelector("homelab-panel").shadowRoot.querySelector("main").getBoundingClientRect().bottom));
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: s.width, height: Math.min(height, 1400) }, animations: "disabled" });
  // Rewritten only when the pixels change: an identical picture never shows up as a modified file.
  const written = writeIfChanged(`${root}screenshots/${s.file}.png`, png);
  console.log(`screenshots/${s.file}.png${written ? "" : " (unchanged)"}`);
  await page.close();
}

await browser.close();
