// Grille de distances À PIED entre des points du parcours espacés de
// 100 m (plus sur un long parcours) : sert aux points libres touchés sur la carte, pour
// donner une distance par les rues (et pas à vol d'oiseau) entre n'importe
// quels endroits du parcours. Calculée une fois ici, embarquée dans
// courses/<slug>/event.json (races[].walkingGrid) : l'app reste hors-ligne.
//
// Usage : node scripts/compute-walking-grid.ts [slug]   (Antony par défaut)
//
// Service : OSRM profil piéton de routing.openstreetmap.de (FOSSGIS, données
// © contributeurs OpenStreetMap), requêtes « table » par blocs.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { courseDir, slugFromArgs } from "./lib/course.ts";
import type { EventConfig } from "../app/src/lib/event.ts";
import { pointAtDistance, routeLengthKm } from "../app/src/lib/geo.ts";

// 100 m sur une boucle courte ; au-delà, pas élargi pour rester vers 70 points
// (≈ 5 000 distances, quelques dizaines de Ko dans event.json).
const MAX_POINTS = 70;
const BLOCK = 25; // origines par requête
const SERVICE = "https://routing.openstreetmap.de/routed-foot/table/v1/driving";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const path = resolve(courseDir(slugFromArgs()), "event.json");
const raw = readFileSync(path, "utf-8");
const config = JSON.parse(raw) as EventConfig;

const grids: Record<string, string> = {};
for (const race of config.races) {
  const track = race.track.map(([lat, lng]) => ({ lat, lng }));
  const loopKm = race.loops > 1 ? race.loopLengthKm : race.distanceKm;
  const trackKm = routeLengthKm(track);
  const STEP_KM = Math.max(0.1, Math.ceil((loopKm / MAX_POINTS) * 10) / 10);
  const n = Math.floor(loopKm / STEP_KM + 1e-9);
  const points = Array.from({ length: n }, (_, i) => {
    const p = pointAtDistance(track, (i * STEP_KM * trackKm) / loopKm);
    return [Math.round(p.lat * 1e5) / 1e5, Math.round(p.lng * 1e5) / 1e5] as [number, number];
  });
  const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const km: number[][] = [];
  for (let start = 0; start < n; start += BLOCK) {
    const sources = Array.from({ length: Math.min(BLOCK, n - start) }, (_, i) => start + i).join(";");
    const response = await fetch(`${SERVICE}/${coords}?annotations=distance&sources=${sources}`);
    if (!response.ok) throw new Error(`Service d'itinéraires : HTTP ${response.status}`);
    const table = (await response.json()) as { code: string; distances: number[][] };
    if (table.code !== "Ok") throw new Error(`Service d'itinéraires : ${table.code}`);
    for (const row of table.distances) km.push(row.map((m) => Math.round(m / 10) / 100));
    await sleep(500); // service public : on reste raisonnable
  }
  const grid = {
    source: "Itinéraires piétons OSRM (routing.openstreetmap.de), données © OpenStreetMap",
    computedAt: new Date().toISOString().slice(0, 10),
    stepKm: STEP_KM,
    points,
    km,
  };
  // Une ligne par point (lisible dans les diffs, ≈ 35 Ko).
  grids[race.id] =
    "{\n" +
    `        "source": ${JSON.stringify(grid.source)},\n` +
    `        "computedAt": "${grid.computedAt}",\n` +
    `        "stepKm": ${STEP_KM},\n` +
    `        "points": ${JSON.stringify(points)},\n` +
    `        "km": [\n${km.map((row) => `          ${JSON.stringify(row)}`).join(",\n")}\n        ]\n      }`;
  console.log(`${race.name} : ${n} points, ${n * n} distances`);
}

// Insertion / remplacement du bloc walkingGrid de chaque course, sans
// reformater le reste du fichier.
let out = raw;
for (const race of config.races) {
  const marker = `"id": "${race.id}",`;
  const at = out.indexOf(marker);
  if (at < 0) throw new Error(`course ${race.id} introuvable`);
  const existing = out.indexOf(`"walkingGrid": {`, at);
  const nextRace = out.indexOf(`"id": "`, at + marker.length + 1);
  if (existing > 0 && (nextRace < 0 || existing < nextRace)) {
    // Remplace le bloc existant (jusqu'à l'accolade fermante correspondante).
    let depth = 0;
    let end = out.indexOf("{", existing);
    for (; end < out.length; end++) {
      if (out[end] === "{") depth++;
      else if (out[end] === "}" && --depth === 0) break;
    }
    out = out.slice(0, existing) + `"walkingGrid": ${grids[race.id]}` + out.slice(end + 1);
  } else {
    const anchor = out.indexOf(`"walkingRoutes": {`, at);
    out = out.slice(0, anchor) + `"walkingGrid": ${grids[race.id]},\n      ` + out.slice(anchor);
  }
}
JSON.parse(out);
writeFileSync(path, out, "utf-8");
console.log("event.json mis à jour.");
