// Génère public/parcours-plan.svg : plan schématique du parcours (tracé,
// sens, bornes km, spots numérotés), affiché à la place de la carte quand
// les tuiles ne chargent pas (hors-ligne, réseau saturé le jour J).
//
// Usage : node scripts/generate-route-plan.ts   (à relancer après toute
// modification du tracé ou des spots dans public/data/event.json)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { directionArrows, kmMarks } from "../src/lib/mapMarkers.ts";
import type { EventConfig, LatLng } from "../src/lib/event.ts";

const config = JSON.parse(readFileSync(resolve("public/data/event.json"), "utf-8")) as EventConfig;
const race = config.races[0];
const track: LatLng[] = race.track.map(([lat, lng]) => ({ lat, lng }));

const W = 800;
const H = 800;
const PAD = 70;
const all = [...track, ...race.spots];
const minLat = Math.min(...all.map((p) => p.lat));
const maxLat = Math.max(...all.map((p) => p.lat));
const minLng = Math.min(...all.map((p) => p.lng));
const maxLng = Math.max(...all.map((p) => p.lng));
const kx = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
const spanX = (maxLng - minLng) * kx;
const spanY = maxLat - minLat;
const scale = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD - 60) / spanY);
const offX = (W - spanX * scale) / 2;
const offY = 60 + (H - 60 - spanY * scale) / 2;
const xy = (p: LatLng) => [offX + (p.lng - minLng) * kx * scale, offY + (maxLat - p.lat) * scale] as const;
const f = (n: number) => n.toFixed(1);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const path = [...track, track[0]].map((p, i) => `${i ? "L" : "M"}${f(xy(p)[0])},${f(xy(p)[1])}`).join(" ");
const arrows = directionArrows(track)
  .map((a) => {
    const [x, y] = xy(a);
    return `<path d="M-7,-6 L7,0 L-7,6 Z" transform="translate(${f(x)},${f(y)}) rotate(${f(a.bearing - 90)})" fill="#fff"/>`;
  })
  .join("");
const kms = kmMarks(track, race)
  .map((m) => {
    const [x, y] = xy(m);
    return `<g transform="translate(${f(x)},${f(y)})"><rect x="-4" y="-4" width="8" height="8" fill="#14171a"/><text x="${x < W / 2 ? -10 : 10}" y="20" text-anchor="${x < W / 2 ? "end" : "start"}" font-size="14" font-weight="700" fill="#14171a" stroke="#fff" stroke-width="4" paint-order="stroke">km ${m.label}</text></g>`;
  })
  .join("");
const spots = race.spots
  .map((s, i) => {
    const [x, y] = xy(s);
    const fill = s.highlight ? "#e8b800" : "#0a5c36";
    const color = s.highlight ? "#14171a" : "#fff";
    return `<g transform="translate(${f(x)},${f(y)})"><circle r="17" fill="${fill}" stroke="#fff" stroke-width="3"/><text y="6" text-anchor="middle" font-size="18" font-weight="800" fill="${color}">${i + 1}</text><text x="${x < W / 2 ? -22 : 22}" y="-12" text-anchor="${x < W / 2 ? "end" : "start"}" font-size="16" font-weight="700" fill="#14171a" stroke="#fff" stroke-width="4" paint-order="stroke">${esc(s.shortName)}</text></g>`;
  })
  .join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="system-ui, Segoe UI, Roboto, Arial, sans-serif">
<rect width="${W}" height="${H}" fill="#f4f6f5"/>
<text x="24" y="40" font-size="24" font-weight="800" fill="#0a5c36">${esc(config.event.name)} — plan du parcours</text>
<text x="24" y="64" font-size="15" fill="#52585e">Plan schématique (hors-ligne) · ${race.loops > 1 ? `${race.loops} boucles de ${race.loopLengthKm} km` : `${race.distanceKm} km`} · nord en haut</text>
<path d="${path}" fill="none" stroke="#0a5c36" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>
${arrows}${kms}${spots}
</svg>
`;

writeFileSync(resolve("public/parcours-plan.svg"), svg, "utf-8");
console.log(`public/parcours-plan.svg écrit (${(svg.length / 1024).toFixed(1)} Ko)`);
