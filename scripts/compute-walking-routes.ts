// Calcule les distances À PIED réelles (itinéraires piétons OpenStreetMap)
// entre chaque paire de spots, ainsi que le tracé de chaque trajet (pour
// dessiner le plan du supporter sur la carte), et les enregistre dans
// public/data/event.json (races[].walkingRoutes). L'app reste sans backend et hors-ligne : le calcul
// est fait une fois, ici, à relancer après tout ajout ou déplacement de spot.
//
// Usage : node scripts/compute-walking-routes.ts
//
// Service : OSRM profil piéton de routing.openstreetmap.de (FOSSGIS, données
// © contributeurs OpenStreetMap). Une seule requête « table » par course.
//
// Le parcours peut être traversé à pied le jour J (en faisant attention aux
// coureurs) : les itinéraires calculés sont donc valables. Une valeur peut
// toujours être corrigée à la main dans event.json (km), elle sera utilisée
// telle quelle.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EventConfig } from "../src/lib/event.ts";

const SERVICE = "https://routing.openstreetmap.de/routed-foot/table/v1/driving";
const ROUTE_SERVICE = "https://routing.openstreetmap.de/routed-foot/route/v1/driving";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const round5 = (n: number) => Math.round(n * 1e5) / 1e5;
const path = resolve("public/data/event.json");
const config = JSON.parse(readFileSync(path, "utf-8")) as EventConfig;

for (const race of config.races) {
  const coords = race.spots.map((s) => `${s.lng},${s.lat}`).join(";");
  const response = await fetch(`${SERVICE}/${coords}?annotations=distance`);
  if (!response.ok) throw new Error(`Service d'itinéraires : HTTP ${response.status}`);
  const table = (await response.json()) as { code: string; distances: number[][] };
  if (table.code !== "Ok") throw new Error(`Service d'itinéraires : ${table.code}`);

  const km: Record<string, number> = {};
  race.spots.forEach((from, i) =>
    race.spots.forEach((to, j) => {
      if (i !== j) km[`${from.id}>${to.id}`] = Math.round(table.distances[i][j]) / 1000;
    })
  );
  // Tracés : un par paire (le trajet retour est le même, parcouru à l'envers).
  const paths: Record<string, Array<[number, number]>> = {};
  for (let i = 0; i < race.spots.length; i++) {
    for (let j = i + 1; j < race.spots.length; j++) {
      const [a, b] = [race.spots[i], race.spots[j]];
      const r = await fetch(`${ROUTE_SERVICE}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`);
      if (!r.ok) throw new Error(`Service d'itinéraires (tracé) : HTTP ${r.status}`);
      const route = (await r.json()) as { routes: Array<{ geometry: { coordinates: Array<[number, number]> } }> };
      paths[`${a.id}>${b.id}`] = route.routes[0].geometry.coordinates.map(([lng, lat]) => [round5(lat), round5(lng)]);
      await sleep(250); // service public : on reste raisonnable
    }
  }
  race.walkingRoutes = {
    source: "Itinéraires piétons OSRM (routing.openstreetmap.de), données © OpenStreetMap",
    computedAt: new Date().toISOString().slice(0, 10),
    km,
    paths,
  };
  console.log(`${race.name} : ${Object.keys(km).length} trajets calculés`);
  for (const [pair, d] of Object.entries(km)) console.log(`  ${pair.padEnd(55)} ${d.toFixed(2)} km`);
}

// Même mise en forme compacte que le fichier d'origine (tracé et listes km
// sur une ligne) pour garder des diffs lisibles.
// Les tracés tiennent sur une ligne chacun (sinon des centaines de lignes).
const inline = new Map<string, string>();
for (const race of config.races) {
  for (const [key, path] of Object.entries(race.walkingRoutes?.paths ?? {})) {
    const token = `__PATH_${inline.size}__`;
    inline.set(token, JSON.stringify(path));
    race.walkingRoutes!.paths![key] = token as unknown as Array<[number, number]>;
  }
}
let json = JSON.stringify(config, null, 2);
for (const [token, value] of inline) json = json.replace(`"${token}"`, value);
json = json.replace(/\[\n\s+(-?\d+\.\d+),\n\s+(-?\d+\.\d+)\n\s+\]/g, "[$1, $2]");
json = json.replace(/"km": \[\n((?:\s+[\d.]+,?\n)+)\s+\]/g, (_, body: string) => `"km": [${body.trim().split(/,?\s*\n\s*/).join(", ")}]`);
writeFileSync(path, json + "\n", "utf-8");
console.log(`\n${path} mis à jour.`);
