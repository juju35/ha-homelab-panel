// The device drawings of the homelab cards, reused as they are (vector, their styles inlined): the Proxmox rack of
// ha-proxmox, the Docker whale of ha-docker-card and the UPS of ha-ups-card. The NAS are drawn from their model, as
// ha-nas-card does (UGREEN DXP / DH / DXP480T, Synology DS / RS, QNAP towers and rackmounts). The repositories stay
// independent: the code is duplicated here, not shared.

/** A drawing with its ids made unique (several drawings in one shadow root never share a gradient). */
export const homelabUid = (svg, uid) =>
  svg.replace(/\bid="([^"]+)"/g, `id="$1-${uid}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${uid})`).replace(/href="#([^"]+)"/g, `href="#$1-${uid}"`);

/** A drawing sized to its box, aligned as `align` says (preserveAspectRatio). */
export const homelabSized = (svg, align = "xMidYMax meet") =>
  svg.replace(/^<svg\b([^>]*?)(?:\s+preserveAspectRatio="[^"]*")?([^>]*)>/, (m, a, b) => `<svg${a}${b} width="100%" height="100%" preserveAspectRatio="${align}" aria-hidden="true" focusable="false">`);

export const HOMELAB_PVE_SVG = `<svg font-family="Roboto, Helvetica, Arial, sans-serif" viewBox="0 0 110 80" preserveAspectRatio="xMaxYMax meet" style="display:block;font-size:16px"><defs><linearGradient id="pve-px-sheen-panel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".1" style="stop-color:rgb(255,255,255);stop-opacity:0.1"/><stop offset=".5" stop-color="#fff" stop-opacity="0" style="stop-color:rgb(255,255,255);stop-opacity:0"/></linearGradient></defs><rect x="34" y="7" width="40" height="73" rx="3" style="fill:rgb(42,48,56)"/><rect x="34" y="7" width="40" height="73" rx="3" fill="url(#pve-px-sheen-panel)" style="fill:url(#pve-px-sheen-panel)"/><rect x="38" y="9.2" width="32" height="1.4" rx=".7" style="fill:rgb(61,69,82)"/><rect x="38" y="13" width="32" height="8" rx="1.4" style="fill:rgb(61,69,82)"/><circle style="fill:rgb(67,196,99)" cx="42" cy="17" r="1.2" fill="#43c463"/><rect x="46" y="16.2" width="12" height="1.6" rx=".8" style="fill:rgb(92,102,120)"/><rect x="64" y="15" width="3" height="4" rx=".6" style="fill:rgb(92,102,120)"/><rect x="38" y="23.6" width="32" height="8" rx="1.4" style="fill:rgb(61,69,82)"/><circle style="fill:rgb(47,128,237)" cx="42" cy="27.6" r="1.2" fill="#2f80ed"/><rect x="46" y="26.8" width="19" height="1.6" rx=".8" style="fill:rgb(92,102,120)"/><rect x="64" y="25.6" width="3" height="4" rx=".6" style="fill:rgb(92,102,120)"/><rect x="38" y="34.2" width="32" height="8" rx="1.4" style="fill:rgb(61,69,82)"/><circle style="fill:rgb(67,196,99)" cx="42" cy="38.2" r="1.2" fill="#43c463"/><rect x="46" y="37.400000000000006" width="16" height="1.6" rx=".8" style="fill:rgb(92,102,120)"/><rect x="64" y="36.2" width="3" height="4" rx=".6" style="fill:rgb(92,102,120)"/><rect x="38" y="44.8" width="32" height="8" rx="1.4" style="fill:rgb(61,69,82)"/><circle style="fill:rgb(47,128,237)" cx="42" cy="48.8" r="1.2" fill="#2f80ed"/><rect x="46" y="48" width="13" height="1.6" rx=".8" style="fill:rgb(92,102,120)"/><rect x="64" y="46.8" width="3" height="4" rx=".6" style="fill:rgb(92,102,120)"/><rect x="38" y="55.4" width="32" height="8" rx="1.4" style="fill:rgb(51,58,69)"/><circle cx="42" cy="59.4" r="1.2" fill="#f29d0b" style="fill:rgb(242,157,11)"/><rect x="46" y="58.6" width="20" height="1.6" rx=".8" style="fill:rgb(92,102,120)"/><rect x="64" y="57.4" width="3" height="4" rx=".6" style="fill:rgb(92,102,120)"/><rect x="38" y="66" width="32" height="8" rx="1.4" style="fill:rgb(51,58,69)"/><circle cx="42" cy="70" r="1.2" fill="#f29d0b" style="fill:rgb(242,157,11)"/><rect x="46" y="69.2" width="17" height="1.6" rx=".8" style="fill:rgb(92,102,120)"/><rect x="64" y="68" width="3" height="4" rx=".6" style="fill:rgb(92,102,120)"/><g transform="translate(88 22)" style="transform:matrix(1,0,0,1,88,22)"><rect x="-12" y="-8" width="24" height="16" rx="3" fill="#f29d0b" style="fill:rgb(242,157,11)"/><text y="3" text-anchor="middle" font-size="7" font-weight="700" fill="#fff" font-family="sans-serif" style="fill:rgb(255,255,255);display:block;font-size:7px;font-weight:700;text-anchor:middle">PVE</text></g></svg>`;
export const HOMELAB_DOCKER_SVG = `<svg font-family="Roboto, Helvetica, Arial, sans-serif" viewBox="0 0 200 80" preserveAspectRatio="xMaxYMax meet" style="display:block;font-size:16px;mask:linear-gradient(90deg,rgba(0,0,0,0) 0px,rgb(0,0,0) 14%)"><defs><linearGradient id="docker-dk-sea-1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5cbdf0" style="stop-color:rgb(92,189,240)"/><stop offset="1" stop-color="#3aa4e0" style="stop-color:rgb(58,164,224)"/></linearGradient></defs><circle cx="40" cy="14" r="9" fill="#ffd65a" opacity=".28" style="fill:rgb(255,214,90);opacity:0.28"/><circle cx="40" cy="14" r="6" fill="#ffd65a" style="fill:rgb(255,214,90)"/><g transform="translate(90 12)" style="transform:matrix(1,0,0,1,90,12)"><path d="M-14,4 C-17,4 -18,0 -14.5,-1 C-14,-5 -8,-6 -6,-3 C-4,-8 4,-8 5,-2 C9,-3 12,0 10,4 Z" style="fill:rgb(255,255,255);opacity:0.92;transform:matrix(1,0,0,1,0.355227,0)"/></g><rect y="58" width="200" height="22" fill="url(#docker-dk-sea-1)" style="fill:url(#docker-dk-sea-1)"/><g style="transform:matrix(1,0,0,1,0,0.892514)"><g transform="translate(66 62)" style="transform:matrix(1,0,0,1,66,62)"><g><path d="M0 -4 C0 -14 14 -18 40 -18 H82 C90 -18 94 -16 96 -12 C100 -16 106 -24 112 -24 C110 -18 108 -12 102 -8 C98 4 82 12 56 12 C24 12 0 8 0 -4Z" fill="#2496ed" style="fill:rgb(36,150,237)"/><path d="M4 2 C14 8 34 10 56 10 C76 10 90 6 98 -2 C94 8 80 14 56 14 C30 14 10 10 4 2Z" fill="#e8f4fd" style="fill:rgb(232,244,253)"/><circle cx="14" cy="-6" r="2" fill="#0b2a4a" style="fill:rgb(11,42,74)"/><circle cx="14.6" cy="-6.6" r=".6" fill="#fff" style="fill:rgb(255,255,255)"/><path d="M24 0 q4 3 8 0" stroke="#1b74bf" stroke-width="1" fill="none" style="fill:none;stroke:rgb(27,116,191)"/><rect x="30" y="-27" width="11" height="9" fill="#e5484d" stroke="#1b74bf" stroke-width=".6" style="fill:rgb(229,72,77);stroke:rgb(27,116,191);stroke-width:0.6px"/><rect x="42" y="-27" width="11" height="9" fill="#f5b400" stroke="#1b74bf" stroke-width=".6" style="fill:rgb(245,180,0);stroke:rgb(27,116,191);stroke-width:0.6px"/><rect x="54" y="-27" width="11" height="9" fill="#43a047" stroke="#1b74bf" stroke-width=".6" style="fill:rgb(67,160,71);stroke:rgb(27,116,191);stroke-width:0.6px"/><rect x="66" y="-27" width="11" height="9" fill="#e5484d" stroke="#1b74bf" stroke-width=".6" style="fill:rgb(229,72,77);stroke:rgb(27,116,191);stroke-width:0.6px;opacity:0.485672"/><rect x="78" y="-27" width="11" height="9" fill="#d4537e" stroke="#1b74bf" stroke-width=".6" style="fill:rgb(212,83,126);stroke:rgb(27,116,191);stroke-width:0.6px"/><rect x="42" y="-36" width="11" height="9" fill="#1d9e75" stroke="#1b74bf" stroke-width=".6" style="fill:rgb(29,158,117);stroke:rgb(27,116,191);stroke-width:0.6px"/><rect x="54" y="-36" width="11" height="9" fill="#ef9f27" stroke="#1b74bf" stroke-width=".6" style="fill:rgb(239,159,39);stroke:rgb(27,116,191);stroke-width:0.6px"/><rect x="66" y="-36" width="11" height="9" fill="#2496ed" stroke="#1b74bf" stroke-width=".6" style="fill:rgb(36,150,237);stroke:rgb(27,116,191);stroke-width:0.6px"/><rect x="54" y="-45" width="11" height="9" fill="#7f77dd" stroke="#1b74bf" stroke-width=".6" style="fill:rgb(127,119,221);stroke:rgb(27,116,191);stroke-width:0.6px"/><g style="opacity:0.485672"><circle cx="71.5" cy="-33" r="4.2" fill="#e5484d" style="fill:rgb(229,72,77)"/><path d="M71.5 -35.6v3.2M71.5 -30.6v.2" stroke="#fff" stroke-width="1.3" stroke-linecap="round" style="fill:rgb(0,0,0);stroke:rgb(255,255,255);stroke-width:1.3px;stroke-linecap:round"/></g></g></g></g><path d="M0 60 q5 -2 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0" stroke="#b5e2fa" stroke-width="1.2" fill="none" style="fill:none;stroke:rgb(181,226,250);stroke-width:1.2px;transform:matrix(1,0,0,1,-3.57006,0)"/></svg>`;
export const HOMELAB_UPS_SVG = `<svg font-family="Roboto, Helvetica, Arial, sans-serif" viewBox="0 0 124 100" style="font-size:16px"><g><rect x="3" y="62" width="14" height="16" rx="3" style="fill:rgb(139,146,156)"/><rect x="6" y="57" width="2.5" height="6" rx="1" style="fill:rgb(139,146,156)"/><rect x="11.5" y="57" width="2.5" height="6" rx="1" style="fill:rgb(139,146,156)"/></g><path d="M17 70H38" style="fill:none;stroke:rgb(139,146,156);stroke-width:3px;stroke-linecap:round"/><path d="M17 70H38" style="fill:none;stroke:rgb(67,160,71);stroke-width:3px;stroke-dasharray:3px,7px;stroke-linecap:round"/><path d="M86 70H98" style="fill:none;stroke:rgb(139,146,156);stroke-width:3px;stroke-linecap:round"/><path d="M86 70H98" style="fill:none;stroke:rgb(67,160,71);stroke-width:3px;stroke-dasharray:3px,7px;stroke-linecap:round"/><g><rect x="97" y="52" width="24" height="17" rx="2" style="fill:color(srgb 0.232157 0.336863 0.293725);stroke:rgb(89,98,110);stroke-width:1.5px"/><rect x="106" y="69" width="6" height="5" style="fill:rgb(107,115,128)"/><rect x="102" y="74" width="14" height="2.5" rx="1" style="fill:rgb(107,115,128)"/></g><g><rect x="38" y="12" width="48" height="82" rx="7" style="fill:rgb(47,53,61);stroke:rgb(29,34,40);stroke-width:1.2px"/><rect x="38" y="12" width="48" height="6" rx="3" style="fill:rgb(67,75,85)"/><rect x="46" y="22" width="32" height="20" rx="2.5" style="fill:color(srgb 0.122745 0.248627 0.160392)"/><rect x="49.5" y="27.5" width="19" height="11" rx="1.5" style="fill:none;stroke:rgb(232,237,242);stroke-width:1.2px"/><rect x="68.5" y="31" width="2.5" height="4" rx=".8" style="fill:rgb(232,237,242)"/><rect x="51.5" y="29.5" width="3.3" height="7" rx=".6" style="fill:rgb(232,237,242);opacity:0.95"/><rect x="55.8" y="29.5" width="3.3" height="7" rx=".6" style="fill:rgb(232,237,242);opacity:0.95"/><rect x="60.1" y="29.5" width="3.3" height="7" rx=".6" style="fill:rgb(232,237,242);opacity:0.95"/><rect x="64.4" y="29.5" width="3.3" height="7" rx=".6" style="fill:rgb(232,237,242);opacity:0.95"/><path d="M48 52h28M48 57h28M48 62h28" style="fill:none;stroke:rgb(32,37,43);stroke-width:2px;stroke-linecap:round"/><circle cx="62" cy="80" r="6.5" style="fill:rgb(35,41,48);stroke:rgb(74,82,93);stroke-width:1.2px"/><circle cx="62" cy="80" r="3.2" style="fill:rgb(67,160,71)"/></g></svg>`;

// NAS drawings, duplicated from ha-nas-card (src/helpers.js): one per brand and form factor, picked from the model the
// integration reports. Tower: control strip on the left and one tray per bay, each brand in its own colours; rackmount
// models short and wide with rack ears; the flat all-flash DXP480T in parallel projection.
const HOMELAB_NAS_PALETTES = {
  dxp: { top: "#c9ccd0", bottom: "#7d8288", front: "#2a2d31", tray: "#3a3e44", handle: "#4c5158", mark: "#c9ccd0" },
  dh: { top: "#f2f2f0", bottom: "#d9d9d6", front: "#e6e6e3", tray: "#d0d0cc", handle: "#b5b5b0", mark: "#888" },
  synology: { top: "#45484c", bottom: "#17181a", front: "#101113", tray: "#1e2023", handle: "#34373b", mark: "#6b6f74" },
  qnap: { top: "#3c3f44", bottom: "#1c1e21", front: "#17181b", tray: "#24262a", handle: "#3a3d42", mark: "#8d9196", accent: "#c8a46a" },
};

const homelabNasTower = (bays, p) => {
  const tw = 34, gap = 6, strip = 46, pad = 14, h = 150;
  const w = pad + strip + bays * tw + (bays - 1) * gap + pad;
  const { top, bottom, front, tray, handle, mark, accent } = p;
  const c = pad + strip / 2 - 2;
  let trays = "";
  for (let i = 0; i < bays; i++) {
    const x = pad + strip + i * (tw + gap);
    trays += `<rect x="${x}" y="22" width="${tw}" height="${h - 44}" rx="3" fill="${tray}"/><rect x="${x + tw / 2 - 5}" y="${h - 46}" width="10" height="16" rx="2" fill="${handle}"/><circle cx="${x + tw / 2}" cy="32" r="1.6" fill="#43c463"/>`;
  }
  return `<svg viewBox="0 0 ${w} ${h + 8}"><defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><ellipse cx="${w / 2}" cy="${h + 3}" rx="${w / 2 - 6}" ry="4" opacity=".25"/><rect width="${w}" height="${h}" rx="12" fill="url(#b)"/><rect x="8" y="10" width="${w - 16}" height="${h - 20}" rx="7" fill="${front}"/>${
    accent ? `<rect x="${pad - 3}" y="16" width="3.5" height="${h - 32}" rx="1.75" fill="${accent}"/>` : ""
  }<circle cx="${c}" cy="34" r="7" fill="none" stroke="${mark}" stroke-width="2"/><rect x="${c - 1}" y="26" width="2" height="7" fill="${mark}"/><rect x="${c - 6}" y="56" width="12" height="5" rx="1.5" fill="${handle}"/><rect x="${c - 6}" y="${h - 38}" width="12" height="7" rx="1.5" fill="${handle}"/>${trays}</svg>`;
};

const homelabNasRack = (bays, p) => {
  const n = Math.max(2, Math.min(bays, 12)), tw = 16, gap = 4, pad = 10, ear = 13, right = 42, h = 62;
  const w = ear + pad + n * tw + (n - 1) * gap + pad + right + ear;
  const { top, bottom, front, tray, handle, mark, accent } = p;
  const screw = (x, y) => `<circle cx="${x}" cy="${y}" r="2.4" fill="${tray}"/>`;
  let trays = "";
  for (let i = 0; i < n; i++) {
    const x = ear + pad + i * (tw + gap);
    trays += `<rect x="${x}" y="14" width="${tw}" height="${h - 28}" rx="2.5" fill="${tray}"/><rect x="${x + tw / 2 - 4}" y="${h - 24}" width="8" height="6" rx="1.5" fill="${handle}"/><circle cx="${x + tw / 2}" cy="20" r="1.4" fill="#43c463"/>`;
  }
  const c = w - ear - right / 2;
  return `<svg viewBox="0 0 ${w} ${h + 10}"><defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><ellipse cx="${w / 2}" cy="${h + 4}" rx="${w / 2 - 8}" ry="3.5" opacity=".25"/><rect x="0" y="6" width="${ear}" height="${h - 12}" rx="2" fill="${bottom}"/><rect x="${w - ear}" y="6" width="${ear}" height="${h - 12}" rx="2" fill="${bottom}"/>${screw(ear / 2, 14)}${screw(ear / 2, h - 14)}${screw(w - ear / 2, 14)}${screw(w - ear / 2, h - 14)}<rect x="${ear}" width="${w - 2 * ear}" height="${h}" rx="6" fill="url(#b)"/><rect x="${ear + 5}" y="6" width="${w - 2 * ear - 10}" height="${h - 12}" rx="4" fill="${front}"/>${
    accent ? `<rect x="${w - ear - right - 3}" y="12" width="3" height="${h - 24}" rx="1.5" fill="${accent}"/>` : ""
  }${trays}<circle cx="${c}" cy="${h / 2 - 8}" r="6" fill="none" stroke="${mark}" stroke-width="2"/><rect x="${c - 1}" y="${h / 2 - 15}" width="2" height="6" fill="${mark}"/><rect x="${c - 6}" y="${h / 2 + 8}" width="12" height="5" rx="1.5" fill="${handle}"/></svg>`;
};

const homelabNasFlat = () => {
  const [X0, Y0] = [6, 10];
  const front = `matrix(1 .03 0 1 ${X0} ${Y0})`;
  const side = `matrix(.85 -.06 0 1 ${X0 + 200} ${Y0 + 6})`;
  const top = `matrix(1 .03 .85 -.06 ${X0} ${Y0})`;
  let vents = "";
  for (let i = 0; i < 16; i++) vents += `<rect x="${18 + i * 4.6}" y="9" width="2.2" height="15" rx=".8" fill="#2c2f33"/>`;
  return `<svg viewBox="0 0 300 104"><defs>\
<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8bcc0"/><stop offset=".5" stop-color="#95999e"/><stop offset="1" stop-color="#72767b"/></linearGradient>\
<linearGradient id="k" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#95999e" stop-opacity="0"/><stop offset=".6" stop-color="#c6c9cd"/><stop offset="1" stop-color="#868a90"/></linearGradient>\
<linearGradient id="s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7e8288"/><stop offset="1" stop-color="#565a5f"/></linearGradient>\
<linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c2c5c9"/><stop offset="1" stop-color="#dadcdf"/></linearGradient>\
<linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9bcc0"/><stop offset="1" stop-color="#989ca1"/></linearGradient></defs>\
<ellipse cx="152" cy="97" rx="146" ry="5" opacity=".28"/>\
<g transform="${front}"><rect x="14" y="77" width="16" height="5" rx="1.5" fill="#111"/><rect x="170" y="77" width="16" height="5" rx="1.5" fill="#111"/></g>\
<g transform="${side}"><rect x="86" y="77" width="10" height="4" rx="1.5" fill="#111"/></g>\
<g transform="${top}"><rect width="200" height="100" rx="6" fill="url(#t)"/></g>\
<g transform="${side}"><rect width="100" height="78" rx="5" fill="url(#s)"/>${vents}</g>\
<g transform="${front}"><rect width="200" height="78" rx="5" fill="url(#f)"/>\
<rect x="184" width="16" height="78" fill="url(#k)"/>\
<rect x="1" y=".5" width="190" height="1.2" fill="#fff" opacity=".35"/>\
<path d="M0 40 H174 Q178 40 178 44 V78 H5 Q0 78 0 73 Z" fill="#141517"/>\
<rect x="6" y="45" width="112" height="30" rx="2" fill="url(#c)"/>\
<text x="62" y="61.5" text-anchor="middle" font-size="4.6" fill="#3a3d41" font-family="Arial, Helvetica, sans-serif" letter-spacing=".2">PROTECT WHAT YOU LOVE</text>\
<rect x="132" y="51" width="30" height="20" rx="5" fill="#26282c" stroke="#3a3d42" stroke-width="1.2"/>\
<circle cx="147" cy="61" r="4.3" fill="none" stroke="#f2f2f2" stroke-width="1.3"/></g></svg>`;
};

const homelabSynoBays = (m) => {
  const d = m.match(/^(?:DS|DVA|FS)(\d{3,4})/);
  if (!d) return 4;
  const n = d[1];
  if (n.length === 4) return { 15: 5, 16: 6, 18: 8, 24: 12, 36: 12 }[n.slice(0, 2)] ?? 6;
  return { 1: 1, 2: 2, 3: 2, 4: 4, 6: 6, 7: 2, 9: 4 }[n[0]] ?? 4;
};

const homelabSynoRackBays = (m) => {
  const d = m.match(/^RS(\d{3,4})/);
  return d && d[1].length === 4 ? ({ 12: 8, 13: 8 }[d[1].slice(0, 2)] ?? 12) : 4;
};

const homelabQnapBays = (m) => {
  const d = m.match(/(\d{3,4})/);
  return d ? Math.min(d[1].length === 4 ? +d[1].slice(0, 2) : +d[1][0] || 4, 12) : 4;
};

// The brand of a model name (UGREEN DXP / DH, Synology DS / RS / FS / DVA, QNAP TS / TVS / HS / TR).
export const homelabNasBrand = (model) =>
  /^(DXP|DH)\d/.test(model) ? "ugreen" : /^(DS|RS|FS|SA|DVA)\d/.test(model) ? "synology" : /^(TS|TVS|TBS|HS|TR)-?\w*\d/.test(model) ? "qnap" : null;
// The brand of a NAS integration
export const HOMELAB_NAS_PLATFORM_BRAND = { ugreen: "ugreen", synology_dsm: "synology", qnap: "qnap" };

/** The drawing of a NAS from its model (the brand of its integration backing up a model not recognized). */
export const homelabNasSvg = (model, brand) => {
  const m = String(model || "").toUpperCase().replace(/\s+/g, "");
  const b = homelabNasBrand(m) || brand || "ugreen";
  if (b === "synology") return /^RS/.test(m) ? homelabNasRack(homelabSynoRackBays(m), HOMELAB_NAS_PALETTES.synology) : homelabNasTower(homelabSynoBays(m), HOMELAB_NAS_PALETTES.synology);
  if (b === "qnap") return /U(-RP)?$/.test(m) ? homelabNasRack(homelabQnapBays(m), HOMELAB_NAS_PALETTES.qnap) : homelabNasTower(homelabQnapBays(m), HOMELAB_NAS_PALETTES.qnap);
  if (/480T/.test(m)) return homelabNasFlat();
  const dh = m.match(/^DH(\d)\d{3}/);
  if (dh) return homelabNasTower(+dh[1], HOMELAB_NAS_PALETTES.dh);
  const dxp = m.match(/^DXP(\d)\d{3}/);
  return homelabNasTower(dxp ? +dxp[1] : 4, HOMELAB_NAS_PALETTES.dxp);
};

// Material Design Icons (Apache 2.0): Home Assistant and Docker, for the Docker hosts of the overview's plan
export const HOMELAB_MDI_HASS =
  "M21.8,13H20V21H13V17.67L15.79,14.88L16.5,15C17.66,15 18.6,14.06 18.6,12.9C18.6,11.74 17.66,10.8 16.5,10.8A2.1,2.1 0 0,0 14.4,12.9L14.5,13.61L13,15.13V9.65C13.66,9.29 14.1,8.6 14.1,7.8A2.1,2.1 0 0,0 12,5.7A2.1,2.1 0 0,0 9.9,7.8C9.9,8.6 10.34,9.29 11,9.65V15.13L9.5,13.61L9.6,12.9A2.1,2.1 0 0,0 7.5,10.8A2.1,2.1 0 0,0 5.4,12.9A2.1,2.1 0 0,0 7.5,15L8.21,14.88L11,17.67V21H4V13H2.25C1.83,13 1.42,13 1.42,12.79C1.43,12.57 1.85,12.15 2.28,11.72L11,3C11.33,2.67 11.67,2.33 12,2.33C12.33,2.33 12.67,2.67 13,3L17,7V6H19V9L21.78,11.78C22.18,12.18 22.59,12.59 22.6,12.8C22.6,13 22.2,13 21.8,13M7.5,12A0.9,0.9 0 0,1 8.4,12.9A0.9,0.9 0 0,1 7.5,13.8A0.9,0.9 0 0,1 6.6,12.9A0.9,0.9 0 0,1 7.5,12M16.5,12C17,12 17.4,12.4 17.4,12.9C17.4,13.4 17,13.8 16.5,13.8A0.9,0.9 0 0,1 15.6,12.9A0.9,0.9 0 0,1 16.5,12M12,6.9C12.5,6.9 12.9,7.3 12.9,7.8C12.9,8.3 12.5,8.7 12,8.7C11.5,8.7 11.1,8.3 11.1,7.8C11.1,7.3 11.5,6.9 12,6.9Z";
export const HOMELAB_MDI_DOCKER =
  "M21.81 10.25C21.75 10.21 21.25 9.82 20.17 9.82C19.89 9.82 19.61 9.85 19.33 9.9C19.12 8.5 17.95 7.79 17.9 7.76L17.61 7.59L17.43 7.86C17.19 8.22 17 8.63 16.92 9.05C16.72 9.85 16.84 10.61 17.25 11.26C16.76 11.54 15.96 11.61 15.79 11.61H2.62C2.28 11.61 2 11.89 2 12.24C2 13.39 2.18 14.54 2.58 15.62C3.03 16.81 3.71 17.69 4.58 18.23C5.56 18.83 7.17 19.17 9 19.17C9.79 19.17 10.61 19.1 11.42 18.95C12.54 18.75 13.62 18.36 14.61 17.79C15.43 17.32 16.16 16.72 16.78 16C17.83 14.83 18.45 13.5 18.9 12.35H19.09C20.23 12.35 20.94 11.89 21.33 11.5C21.59 11.26 21.78 10.97 21.92 10.63L22 10.39L21.81 10.25M3.85 11.24H5.61C5.69 11.24 5.77 11.17 5.77 11.08V9.5C5.77 9.42 5.7 9.34 5.61 9.34H3.85C3.76 9.34 3.69 9.41 3.69 9.5V11.08C3.7 11.17 3.76 11.24 3.85 11.24M6.28 11.24H8.04C8.12 11.24 8.2 11.17 8.2 11.08V9.5C8.2 9.42 8.13 9.34 8.04 9.34H6.28C6.19 9.34 6.12 9.41 6.12 9.5V11.08C6.13 11.17 6.19 11.24 6.28 11.24M8.75 11.24H10.5C10.6 11.24 10.67 11.17 10.67 11.08V9.5C10.67 9.42 10.61 9.34 10.5 9.34H8.75C8.67 9.34 8.6 9.41 8.6 9.5V11.08C8.6 11.17 8.66 11.24 8.75 11.24M11.19 11.24H12.96C13.04 11.24 13.11 11.17 13.11 11.08V9.5C13.11 9.42 13.05 9.34 12.96 9.34H11.19C11.11 9.34 11.04 9.41 11.04 9.5V11.08C11.04 11.17 11.11 11.24 11.19 11.24M6.28 9H8.04C8.12 9 8.2 8.91 8.2 8.82V7.25C8.2 7.16 8.13 7.09 8.04 7.09H6.28C6.19 7.09 6.12 7.15 6.12 7.25V8.82C6.13 8.91 6.19 9 6.28 9M8.75 9H10.5C10.6 9 10.67 8.91 10.67 8.82V7.25C10.67 7.16 10.61 7.09 10.5 7.09H8.75C8.67 7.09 8.6 7.15 8.6 7.25V8.82C8.6 8.91 8.66 9 8.75 9M11.19 9H12.96C13.04 9 13.11 8.91 13.11 8.82V7.25C13.11 7.16 13.04 7.09 12.96 7.09H11.19C11.11 7.09 11.04 7.15 11.04 7.25V8.82C11.04 8.91 11.11 9 11.19 9M11.19 6.72H12.96C13.04 6.72 13.11 6.65 13.11 6.56V5C13.11 4.9 13.04 4.83 12.96 4.83H11.19C11.11 4.83 11.04 4.89 11.04 5V6.56C11.04 6.64 11.11 6.72 11.19 6.72M13.65 11.24H15.41C15.5 11.24 15.57 11.17 15.57 11.08V9.5C15.57 9.42 15.5 9.34 15.41 9.34H13.65C13.57 9.34 13.5 9.41 13.5 9.5V11.08C13.5 11.17 13.57 11.24 13.65 11.24";
