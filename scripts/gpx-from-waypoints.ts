// Tracé GPX d'une course à partir de carrefours lus sur le plan officiel :
//   npm run gpx-from-waypoints -- <slug>
//
// Entrée : courses/<slug>/waypoints.json (boucle de carrefours « rue A & rue B »
// dans l'ordre, nombre de boucles, bretelle d'arrivée, bornes km du plan).
// 1. Télécharge UNE fois le réseau de rues de la zone (Overpass, données ©
//    OpenStreetMap), en cache dans courses/<slug>/.cache/ ; l'emprise vient
//    du géocodage de la zone (Nominatim, 1 requête, User-Agent identifié).
// 2. Place chaque carrefour au nœud commun des deux rues nommées. Introuvable
//    ou ambigu : rien n'est deviné, le point est listé ; on peut forcer ses
//    coordonnées dans waypoints.json ("lat" / "lon").
// 3. Plus court chemin sur le réseau entre points successifs (chaussées
//    préférées aux chemins piétons).
// 4. Assemble : boucle × nombreBoucles, puis bretelle d'arrivée. Écrit
//    courses/<slug>/parcours.gpx.
// 5. Contrôle : longueur de boucle et totale (écart > 3 % signalé, tronçons
//    suspects listés), bornes km du plan (repereKm) sur la bonne rue.
// 6. Aperçu : courses/<slug>/apercu.html (tracé, points numérotés, bornes km,
//    plan officiel à côté). À valider avant d'aller plus loin.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { haversineDistanceKm, type LatLng } from "../app/src/lib/geo.ts";
import { buildGraph, junction, markerMatches, nearestNode, parseKmMarkers, parseQuery, shortestPath, type OsmElement } from "../app/src/lib/streetGraph.ts";
import { courseDir, slugFromArgs } from "./lib/course.ts";

interface Waypoint {
  id: string;
  /** Pourquoi la requête diffère de la lecture du plan (vérification OSM). */
  correction?: string;
  nom: string;
  requete: string;
  aConfirmer?: boolean;
  lat?: number;
  lon?: number;
}
interface WaypointsFile {
  course: string;
  distanceOfficielleKm: number;
  nombreBoucles: number;
  longueurBoucleKmAttendue: number;
  repereKm?: string;
  boucle: Waypoint[];
  arrivee?: { description?: string; points: Waypoint[] };
  zonesAVerifierSurLaCarte?: string[];
}

const UA = "semi-supporter-gpx-from-waypoints/1.0 (outil ponctuel de tracé de parcours)";
const slug = slugFromArgs();
const dir = courseDir(slug);
const wp = JSON.parse(readFileSync(join(dir, "waypoints.json"), "utf-8")) as WaypointsFile;
const cacheDir = join(dir, ".cache");
mkdirSync(cacheDir, { recursive: true });

async function cached<T>(file: string, load: () => Promise<T>): Promise<T> {
  const path = join(cacheDir, file);
  if (existsSync(path)) return JSON.parse(readFileSync(path, "utf-8")) as T;
  const data = await load();
  writeFileSync(path, JSON.stringify(data));
  return data;
}

// 1. Zone (la plus fréquente dans les requêtes) → emprise → réseau de rues.
const allPoints = [...wp.boucle, ...(wp.arrivee?.points ?? [])];
const areas = allPoints.map((p) => parseQuery(p.requete).area).filter(Boolean);
const area = areas.sort((a, b) => areas.filter((x) => x === b).length - areas.filter((x) => x === a).length)[0];
const bbox = await cached("zone.json", async () => {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(area)}`, { headers: { "User-Agent": UA } });
  const [hit] = (await r.json()) as Array<{ boundingbox: [string, string, string, string] }>;
  if (!hit) throw new Error(`Zone introuvable : ${area}`);
  return hit.boundingbox.map(Number); // [sud, nord, ouest, est]
});
const [s, n, w, e] = [bbox[0] - 0.004, bbox[1] + 0.004, bbox[2] - 0.006, bbox[3] + 0.006];
const osm = await cached("reseau.json", async () => {
  const query = `[out:json][timeout:120];way["highway"](${s},${w},${n},${e});(._;>;);out body;`;
  const r = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query),
  });
  if (!r.ok) throw new Error(`Overpass : HTTP ${r.status}`);
  return ((await r.json()) as { elements: OsmElement[] }).elements;
});
const graph = buildGraph(osm);
console.log(`Réseau de rues « ${area} » : ${graph.nodes.size} nœuds, ${graph.streetNodes.size} rues (OpenStreetMap, en cache).`);

// 2. Carrefours.
interface Resolved extends Waypoint {
  node?: number;
  at?: LatLng;
  note?: string;
  issue?: string;
}
const resolve = (p: Waypoint): Resolved => {
  if (p.lat !== undefined && p.lon !== undefined) {
    const node = nearestNode(graph, { lat: p.lat, lng: p.lon });
    return { ...p, node, at: { lat: p.lat, lng: p.lon }, note: "coordonnées forcées" };
  }
  const { streets } = parseQuery(p.requete);
  if (streets.length < 2) return { ...p, issue: `une seule rue (« ${streets[0]} ») : point exact ambigu → préciser lat/lon` };
  const j = junction(graph, streets[0], streets[1]);
  return j.ok ? { ...p, node: j.node, at: { lat: j.lat, lng: j.lng }, note: j.note } : { ...p, issue: j.reason };
};
const loop = wp.boucle.map(resolve);
const finish = (wp.arrivee?.points ?? []).map(resolve);
const unresolved = [...loop, ...finish].filter((p) => p.issue);

// 3-4. Itinéraire : boucle × N, puis bretelle d'arrivée (si ses points sont connus).
interface Leg {
  from: Resolved;
  to: Resolved;
  km: number;
  straightKm: number;
  coords: LatLng[];
  streets: Array<{ name: string; km: number }>;
}
const legs: Leg[] = [];
const issues: string[] = [];
const route = (all: Resolved[]) => {
  // Un point non placé ne coupe pas le tracé : on relie ses voisins (et il reste listé).
  const seq = all.filter((p) => p.node !== undefined);
  for (let i = 0; i + 1 < seq.length; i++) {
    const [a, b] = [seq[i], seq[i + 1]];
    const r = shortestPath(graph, a.node, b.node);
    if (!r) {
      issues.push(`Pas de chemin entre ${a.id} et ${b.id}.`);
      continue;
    }
    legs.push({ from: a, to: b, km: r.km, straightKm: haversineDistanceKm(a.at!, b.at!), coords: r.nodes.map((id) => graph.nodes.get(id)!), streets: r.streets });
  }
};
const loopClosed = loop[0].requete === loop.at(-1)!.requete ? loop : [...loop, loop[0]];
for (let k = 0; k < wp.nombreBoucles; k++) route(loopClosed);
const loopLegs = Math.round(legs.length / wp.nombreBoucles);
if (finish.length && finish.every((p) => !p.issue)) route([loopClosed.at(-1)!, ...finish]);
const complete = unresolved.length === 0 && issues.length === 0;

// 5. Contrôles.
const loopKm = legs.slice(0, loopLegs).reduce((t, l) => t + l.km, 0);
const totalKm = legs.reduce((t, l) => t + l.km, 0);
const pct = (x: number, ref: number) => ((x - ref) / ref) * 100;
if (Math.abs(pct(loopKm, wp.longueurBoucleKmAttendue)) > 3) {
  issues.push(`Boucle de ${loopKm.toFixed(2)} km pour ${wp.longueurBoucleKmAttendue} km attendus (${pct(loopKm, wp.longueurBoucleKmAttendue).toFixed(1)} %).`);
}
const suspicious = legs.slice(0, loopLegs).filter((l) => l.km > l.straightKm * 1.6 + 0.05);
for (const l of suspicious) {
  issues.push(`Tronçon ${l.from.id} → ${l.to.id} : ${Math.round(l.km * 1000)} m par les rues pour ${Math.round(l.straightKm * 1000)} m à vol d'oiseau (détour ?) via ${l.streets.map((x) => x.name || "voie sans nom").join(", ")}.`);
}
// Bornes km : rues traversées à ± 120 m de chaque km (distance mesurée, pas recalée).
const points: Array<LatLng & { km: number; name: string }> = [];
let acc = 0;
for (const l of legs) {
  for (let i = 0; i < l.coords.length; i++) {
    if (i > 0) acc += haversineDistanceKm(l.coords[i - 1], l.coords[i]);
    points.push({ ...l.coords[i], km: acc, name: "" });
  }
}
const namesAround = (km: number) => {
  const names = new Set<string>();
  let walked = 0;
  for (const l of legs) {
    for (const st of l.streets) {
      if (walked + st.km >= km - 0.12 && walked <= km + 0.12 && st.name) names.add(st.name);
      walked += st.km;
    }
  }
  return [...names];
};
const pointAt = (km: number) => points.find((p) => p.km >= km) ?? points.at(-1)!;
const markers = parseKmMarkers(wp.repereKm ?? "").map(([k, desc]) => {
  const names = namesAround(k);
  return { km: k, desc, names, ok: markerMatches(desc, names), at: pointAt(k) };
});

// Sortie GPX.
const coords = legs.flatMap((l, i) => (i === 0 ? l.coords : l.coords.slice(1)));
if (coords.length > 1) {
  const gpx =
    `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="gpx-from-waypoints (OpenStreetMap) — tracé indicatif, à valider" xmlns="http://www.topografix.com/GPX/1/1">\n` +
    `<trk><name>${wp.course} — tracé calculé depuis le plan (à valider)</name><trkseg>\n` +
    coords.map((c) => `<trkpt lat="${c.lat.toFixed(6)}" lon="${c.lng.toFixed(6)}"/>`).join("\n") +
    `\n</trkseg></trk></gpx>\n`;
  writeFileSync(join(dir, complete ? "parcours.gpx" : "parcours-provisoire.gpx"), gpx);
}

// 6. Aperçu.
const plan = readdirSync(dir).find((f) => /^plan.*\.(png|jpe?g|webp)$/i.test(f));
const data = {
  route: coords.map((c) => [c.lat, c.lng]),
  waypoints: loop.concat(finish).map((p, i) => ({ n: i < loop.length ? String(i) : `A${i - loop.length + 1}`, id: p.id, nom: p.nom, at: p.at, issue: p.issue, note: p.note, aConfirmer: p.aConfirmer })),
  markers: markers.map((m) => ({ km: m.km, desc: m.desc, ok: m.ok, names: m.names, at: [m.at.lat, m.at.lng] })),
};
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aperçu du tracé — ${esc(wp.course)}</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>body{margin:0;font:14px/1.4 system-ui,sans-serif;color:#14213d}header{padding:12px 16px;background:#14213d;color:#fff}h1{margin:0;font-size:18px}
main{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px;height:calc(100vh - 280px);min-height:420px}#map,.plan{border:1px solid #ccc;border-radius:8px;overflow:auto}
.plan img{width:100%}section{padding:8px 16px}li.ko{color:#b42318}li.ok{color:#067647}.num{background:#fff;border:2px solid #14213d;border-radius:50%;font:700 12px sans-serif;text-align:center;line-height:20px}
.km{background:#f5c400;border-radius:4px;font:700 12px sans-serif;text-align:center;line-height:18px}.km.ko{background:#f04438;color:#fff}
@media (max-width:800px){main{grid-template-columns:1fr;height:auto}#map{height:70vh}}</style></head><body>
<header><h1>${esc(wp.course)} — tracé calculé (à valider)</h1><div>Boucle : ${loopKm.toFixed(2)} km (attendu ${wp.longueurBoucleKmAttendue}) · total : ${totalKm.toFixed(2)} km (officiel ${wp.distanceOfficielleKm})${complete ? "" : " · ⚠️ incomplet"}</div></header>
<main><div id="map"></div><div class="plan">${plan ? `<img src="${plan}" alt="Plan officiel">` : "<p style='padding:16px'>Plan officiel absent : déposer <code>plan-officiel-2027.png</code> dans ce dossier.</p>"}</div></main>
<section><h2>Points non placés</h2><ul>${unresolved.length ? unresolved.map((p) => `<li class="ko"><b>${p.id}</b> ${esc(p.nom)} — ${esc(p.issue!)}</li>`).join("") : "<li class='ok'>Aucun</li>"}</ul>
<h2>Corrections d'après OpenStreetMap (à confirmer)</h2><ul>${[...loop, ...finish].filter((p) => p.correction).map((p) => `<li><b>${p.id}</b> ${esc(p.correction!)}</li>`).join("") || "<li>Aucune</li>"}</ul>
<h2>Contrôles</h2><ul>${issues.length ? issues.map((i) => `<li class="ko">${esc(i)}</li>`).join("") : "<li class='ok'>Longueurs dans la tolérance (3 %), aucun détour suspect.</li>"}
${markers.map((m) => `<li class="${m.ok ? "ok" : "ko"}">Borne ${m.km} attendue « ${esc(m.desc)} » — tracé : ${esc(m.names.join(", ") || "?")}</li>`).join("")}</ul>
<h2>Zones à vérifier sur la carte</h2><ul>${(wp.zonesAVerifierSurLaCarte ?? []).map((z) => `<li>${esc(z)}</li>`).join("")}</ul>
<p>Données © contributeurs OpenStreetMap. Tracé indicatif calculé par le plus court chemin entre les carrefours lus sur le plan.</p></section>
<script>const D=${JSON.stringify(data)};const m=L.map("map");L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(m);
const line=L.polyline(D.route,{color:"#1f5fa8",weight:5,opacity:.85}).addTo(m);if(D.route.length)m.fitBounds(line.getBounds(),{padding:[20,20]});
for(const p of D.waypoints){if(!p.at)continue;L.marker([p.at.lat,p.at.lng],{icon:L.divIcon({className:"num",html:p.n,iconSize:[24,24]})}).addTo(m).bindTooltip(p.id+" — "+p.nom+(p.note?" ("+p.note+")":""));}
for(const k of D.markers)L.marker(k.at,{icon:L.divIcon({className:"km"+(k.ok?"":" ko"),html:"km "+k.km,iconSize:[44,18]})}).addTo(m).bindTooltip(k.desc+" → "+k.names.join(", "));</script></body></html>`;
writeFileSync(join(dir, "apercu.html"), html);

// Compte rendu.
console.log(`\nBoucle : ${loopKm.toFixed(2)} km (attendu ${wp.longueurBoucleKmAttendue} km, ${pct(loopKm, wp.longueurBoucleKmAttendue).toFixed(1)} %) · total ${totalKm.toFixed(2)} km`);
for (const p of [...loop, ...finish]) console.log(`  ${p.issue ? "✗" : "✓"} ${p.id.padEnd(8)} ${p.issue ?? `${p.at!.lat.toFixed(5)}, ${p.at!.lng.toFixed(5)}${p.note ? ` (${p.note})` : ""}`}`);
for (const l of legs.slice(loopLegs * wp.nombreBoucles)) console.log(`  bretelle ${l.from.id} → ${l.to.id} : ${Math.round(l.km * 1000)} m (${l.streets.map((x) => x.name || "sans nom").join(" › ")})`);
for (const l of legs.slice(0, loopLegs)) console.log(`  ${l.from.id} → ${l.to.id} : ${Math.round(l.km * 1000)} m (${l.streets.map((x) => x.name || "sans nom").join(" › ")})`);
for (const mk of markers) console.log(`  borne ${mk.km} ${mk.ok ? "✓" : "✗"} attendue « ${mk.desc} » — tracé : ${mk.names.join(", ") || "?"}`);
for (const i of issues) console.log(`  ⚠️ ${i}`);
console.log(`\n${complete ? `courses/${slug}/parcours.gpx écrit.` : `Incomplet : courses/${slug}/parcours-provisoire.gpx (points non placés ci-dessus).`} Aperçu : courses/${slug}/apercu.html`);
