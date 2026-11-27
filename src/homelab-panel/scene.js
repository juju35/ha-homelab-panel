// The illustrated header, 90 px high, as on the cards: a sky, two hills, and the homelab standing on a 10 px floor —
// the Proxmox rack, every NAS (drawn from its model, up to three), the UPS and a plant, linked by dashed cables. Night
// (moon, stars, darker sky) with a dark theme. The drawings are those of the cards (drawings.js).
import { HOMELAB_PVE_SVG, HOMELAB_UPS_SVG, homelabNasSvg, homelabUid } from "./drawings.js";

const HOMELAB_SKY = {
  day: { sky: "#E2F3F5", hill1: "#CDE8EC", hill2: "#BFE0E5", floor: "#9BC7CD", cloud: "#FFFFFF", cable: "#0E9AA7" },
  night: { sky: "#16263A", hill1: "#1D3248", hill2: "#233B54", floor: "#2E4A63", cloud: "#2A3E55", cable: "#3CC4CF" },
};

/** A drawing placed in the scene at x, y, w × h, standing on its bottom edge. */
const homelabPlace = (svg, uid, x, y, w, h) =>
  homelabUid(svg, uid).replace(/^<svg\b/, `<svg x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMax meet"`);

// The NAS drawings' aspect: towers are about as wide as high, rackmounts and the flat DXP480T much wider
const homelabAspect = (svg) => {
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  return vb ? +vb[1] / +vb[2] : 1.4;
};

/**
 * The scene's SVG, `width` wide (the panel's width less its sidebar): the drawings stay at the right, the title over
 * the sky at the left. `nas` lists the NAS ({ model, brand }), `night` picks the night palette.
 */
export const homelabScene = ({ width = 1216, nas = [], ups = true, night = false } = {}) => {
  const c = night ? HOMELAB_SKY.night : HOMELAB_SKY.day;
  const w = Math.max(640, Math.round(width));
  const right = w - 120; // the refresh button sits over the sky at the far right
  // The title, its subtitle and the alerts pill sit over the sky at the left: no drawing goes there
  const minX = Math.min(Math.round(w * 0.5), 480);
  let x = right;
  const fits = (wd) => x - wd >= minX;
  const parts = [];
  // From the right: the plant, the UPS, the NAS (the last one first), the rack
  parts.push(
    `<g transform="translate(${x - 40} 40)"><path d="M10 40h20l-3-14H13Z" fill="#E8B38A"/><path d="M20 26V12" stroke="#4F8A63" stroke-width="2.5"/><ellipse cx="14" cy="14" rx="7" ry="4" fill="#7BC792" transform="rotate(-30 14 14)"/><ellipse cx="26" cy="10" rx="7" ry="4" fill="#8FD0A6" transform="rotate(30 26 10)"/></g>`,
  );
  x -= 52;
  const cables = [];
  if (ups && fits(64)) {
    parts.push(homelabPlace(HOMELAB_UPS_SVG, "sc-ups", x - 64, 28, 64, 52));
    cables.push(x - 70);
    x -= 76;
  }
  nas.slice(0, 3).reverse().forEach((n, i) => {
    const svg = homelabNasSvg(n.model, n.brand);
    const ratio = homelabAspect(svg);
    const h = ratio > 2.2 ? 28 : 46;
    const wd = Math.round(h * ratio);
    if (!fits(wd)) return;
    parts.push(homelabPlace(svg, `sc-nas${i}`, x - wd, 80 - h, wd, h));
    cables.push(x - wd - 8);
    x -= wd + 12;
  });
  if (fits(99)) parts.push(homelabPlace(HOMELAB_PVE_SVG, "sc-pve", x - 99, 8, 99, 72));
  const stars = night
    ? [0.12, 0.2, 0.31, 0.44, 0.52, 0.63, 0.71, 0.86]
        .map((f, i) => `<circle cx="${Math.round(w * f)}" cy="${10 + ((i * 17) % 34)}" r="${i % 3 ? 0.9 : 1.3}" fill="#FFFFFF" opacity=".8"/>`)
        .join("")
    : "";
  const sunX = Math.round(Math.max(420, x - 150));
  const sky = night
    ? `<circle cx="${sunX}" cy="24" r="12" fill="#F4E7C4"/><circle cx="${sunX + 6}" cy="20" r="10" fill="${c.sky}"/>`
    : `<circle cx="${sunX}" cy="24" r="13" fill="#FFD772"/><circle cx="${sunX}" cy="24" r="20" fill="#FFD772" opacity=".25"/>`;
  const clouds = `<g fill="${c.cloud}" opacity=".9"><ellipse cx="${Math.round(w * 0.46)}" cy="24" rx="32" ry="8"/><ellipse cx="${Math.round(w * 0.46) + 26}" cy="18" rx="18" ry="7"/><ellipse cx="${Math.round(w * 0.6)}" cy="32" rx="24" ry="6"/></g>`;
  const dashes = cables.map((cx) => `<path d="M${cx} 74h10" stroke="${c.cable}" stroke-width="2" stroke-dasharray="3 3"/>`).join("");
  return `<svg class="scene" viewBox="0 0 ${w} 90" preserveAspectRatio="xMaxYMax slice" aria-hidden="true" focusable="false"><rect width="${w}" height="90" fill="${c.sky}"/>${stars}${clouds}${sky}<path d="M0 64 Q${w * 0.2} 48 ${w * 0.4} 60 T${w * 0.8} 54 T${w} 52 V90 H0Z" fill="${c.hill1}"/><path d="M0 74 Q${w * 0.21} 64 ${w * 0.43} 72 T${w} 70 V90 H0Z" fill="${c.hill2}"/>${dashes}${parts.join("")}<rect y="80" width="${w}" height="10" fill="${c.floor}"/></svg>`;
};
