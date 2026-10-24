// Import du tracé d'une course : `npm run import-gpx -- <slug>`
//
// Lit courses/<slug>/parcours.gpx et met à jour courses/<slug>/event.json :
//   - tracé simplifié (Douglas-Peucker), recalé sur la distance officielle
//     (écart signalé au-delà de 2 %), dénivelé positif lissé ;
//   - spots candidats, tous marqués "aConfirmer" : endroits où les coureurs
//     passent plusieurs fois (les meilleurs pour les supporters), départ,
//     arrivée et un point environ tous les 2,5 km ;
//   - nom de rue proposé par géocodage inverse (Nominatim, 1 requête/s,
//     données © OpenStreetMap) ; `--sans-rues` pour s'en passer.
//
// Options : --course <id> (si plusieurs courses ; défaut : la première)
//           --tous-les <km> (espacement des candidats réguliers, défaut 2,5)
//
// Les spots déjà validés (sans "aConfirmer") sont conservés ; seuls les
// candidats sont remplacés. Ensuite : choisir / renommer les spots, puis
// calculer les distances à pied et le fond de carte (commandes affichées).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cumulativeDistancesKm, haversineDistanceKm, routeLengthKm } from "../app/src/lib/geo.ts";
import { detectMultiplePassages, elevationGainM, kmLabel, parseGpxPoints, regularCandidates, scaleToOfficial, simplify, type SpotCandidate } from "../app/src/lib/gpxImport.ts";
import { passagesThrough } from "../app/src/lib/freeSpot.ts";
import { courseDir, readCourseEvent, slugFromArgs, writeCourseEvent } from "./lib/course.ts";

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const slug = slugFromArgs(args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--")));
const gpxFile = join(courseDir(slug), "parcours.gpx");
if (!existsSync(gpxFile)) {
  console.error(`Pas de tracé : déposer le fichier GPX dans courses/${slug}/parcours.gpx`);
  process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config = readCourseEvent(slug) as any;
const race = opt("course") ? config.races.find((r: { id: string }) => r.id === opt("course")) : config.races[0];
if (!race) {
  console.error(`Course « ${opt("course")} » introuvable dans courses/${slug}/event.json.`);
  process.exit(1);
}

// 1. Lecture et mesures.
const raw = parseGpxPoints(readFileSync(gpxFile, "utf-8"));
if (raw.length < 2) {
  console.error("Le GPX ne contient pas de points de trace (trkpt / rtept).");
  process.exit(1);
}
const gpxKm = routeLengthKm(raw);
const gain = elevationGainM(raw);
// Boucles identiques : le GPX peut ne contenir qu'une boucle (comme Antony).
const oneLoop = race.loops > 1 && Math.abs(gpxKm - race.loopLengthKm) / race.loopLengthKm < 0.15;
if (race.loops > 1 && !oneLoop) {
  console.log(`ℹ Le GPX fait ${gpxKm.toFixed(2)} km : c'est le parcours entier, pas une boucle → loops = 1.`);
  race.loops = 1;
  race.loopLengthKm = race.distanceKm;
}
const officialKm = oneLoop ? race.loopLengthKm : race.distanceKm;
const scale = scaleToOfficial(gpxKm, officialKm);

// 2. Tracé simplifié.
const track = simplify(raw, 5);
race.track = track.map((p) => [Math.round(p.lat * 1e6) / 1e6, Math.round(p.lng * 1e6) / 1e6]);
if (gain !== null) {
  race.elevationGainM = oneLoop ? gain * race.loops : gain;
  race.elevationToConfirm = true;
}

// 3. Spots candidats.
const raceShape = { loops: race.loops, loopLengthKm: race.loopLengthKm, distanceKm: race.distanceKm };
const toKms = (c: SpotCandidate): number[] => {
  // Parcours entier : tous les passages du tracé à cet endroit (départ et arrivée exceptés).
  if (!oneLoop) return c.kind === "regular" ? passagesThrough(track, raceShape, c) : c.km;
  // Une boucle : chaque position revient à chaque tour ; le départ de la boucle est aussi l'arrivée.
  const kms = new Set<number>();
  for (const k of c.km) {
    for (let i = 0; i < race.loops; i++) {
      const v = Math.round((k + i * race.loopLengthKm) * 100) / 100;
      if (v <= race.distanceKm + 1e-9) kms.add(v);
    }
  }
  if (c.kind === "start") kms.add(race.distanceKm);
  return [...kms].sort((a, b) => a - b);
};
const multiples = detectMultiplePassages(track, scale.factor);
const regular = regularCandidates(track, scale.factor, Number(opt("tous-les") ?? 2.5), multiples);
// Un candidat par endroit : on écarte ceux à moins de 300 m d'un candidat déjà retenu.
const candidates = [...multiples, ...regular]
  .map((c) => ({ ...c, km: toKms(c) }))
  .reduce<Array<SpotCandidate & { km: number[] }>>((kept, c) => {
    if (c.kind === "start" || c.kind === "finish" || kept.every((k) => haversineDistanceKm(k, c) >= 0.3)) kept.push(c);
    return kept;
  }, []);

// 4. Noms de rues (Nominatim : 1 requête par seconde, User-Agent identifiant l'outil).
const streets = new Map<SpotCandidate, string>();
if (!args.includes("--sans-rues")) {
  for (const c of candidates) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=${c.lat}&lon=${c.lng}`, {
        headers: { "User-Agent": "semi-supporter-import-gpx/1.0 (outil d'import ponctuel)", "Accept-Language": "fr" },
      });
      if (r.ok) {
        const data = (await r.json()) as { address?: Record<string, string> };
        const a = data.address ?? {};
        const name = a.road ?? a.pedestrian ?? a.footway ?? a.path ?? a.park ?? a.square;
        if (name) streets.set(c, name);
      }
    } catch {
      // pas de réseau : on garde le nom provisoire
    }
    await new Promise((res) => setTimeout(res, 1100));
  }
}

const describe = (c: SpotCandidate & { km: number[] }) => {
  if (c.kind === "multiple") return `Le parcours passe ici ${c.km.length} fois : on y voit son coureur plusieurs fois sans bouger.`;
  if (c.kind === "start") return c.km.length > 1 ? "Départ (et arrivée) de la course." : "Départ de la course.";
  if (c.kind === "finish") return "Arrivée de la course.";
  return "Point du parcours proposé automatiquement.";
};
const usedIds = new Set<string>();
const spots = candidates.map((c, n) => {
  const label = `Spot km ${kmLabel(c.km[0])}`;
  const street = streets.get(c);
  let id = `spot-km-${c.km[0].toFixed(1).replace(".", "-")}`;
  while (usedIds.has(id)) id += "-b";
  usedIds.add(id);
  const where = street ? (/^(rue|avenue|allée|boulevard|place|quai|chemin|route|impasse|cours)\b/i.test(street) ? street.replace(/^./, (x) => x.toLowerCase()) : `vers ${street}`) : `au km ${kmLabel(c.km[0])}`;
  return {
    id,
    where,
    name: street ? `${street} (km ${kmLabel(c.km[0])})` : label,
    shortName: street ?? label,
    address: street ? `${street}, ${config.event.city}` : "Point du parcours",
    lat: Math.round(c.lat * 1e6) / 1e6,
    lng: Math.round(c.lng * 1e6) / 1e6,
    access: "À confirmer.",
    description: describe(c),
    ...(n === 0 && c.kind === "multiple" ? { highlight: true } : {}),
    km: c.km,
    aConfirmer: true,
  };
});
spots.sort((a, b) => a.km[0] - b.km[0]);
// Les spots déjà validés à la main restent ; les anciens candidats sont remplacés.
const kept = (race.spots ?? []).filter((s: { aConfirmer?: boolean }) => !s.aConfirmer);
race.spots = [...kept, ...spots.filter((s) => !kept.some((k: { lat: number; lng: number }) => haversineDistanceKm(k, s) < 0.1))];

// 5. Emprise de la carte (marge ≈ 800 m).
const lats = track.map((p) => p.lat);
const lngs = track.map((p) => p.lng);
const r3 = (x: number) => Math.round(x * 1000) / 1000;
config.map = {
  ...config.map,
  bounds: [
    [r3(Math.min(...lats) - 0.008), r3(Math.min(...lngs) - 0.011)],
    [r3(Math.max(...lats) + 0.008), r3(Math.max(...lngs) + 0.011)],
  ],
  attribution: config.map?.attribution ?? "© <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> · <a href=\"https://protomaps.com\">Protomaps</a>",
};
// Les distances à pied entre spots sont à recalculer pour les nouveaux spots.
delete race.walkingRoutes;
delete race.walkingGrid;
writeCourseEvent(slug, config);

// 6. Compte rendu.
const totalKm = cumulativeDistancesKm(raw).at(-1)!;
console.log(`\n${race.name} (${slug})`);
console.log(`  GPX : ${raw.length} points, ${totalKm.toFixed(2)} km${oneLoop ? ` (une boucle sur ${race.loops})` : ""} → ${track.length} points après simplification`);
console.log(`  Distance officielle : ${officialKm} km · écart ${scale.diffPercent >= 0 ? "+" : ""}${scale.diffPercent.toFixed(1)} %${scale.warn ? "  ⚠️ plus de 2 % : vérifier le GPX ou la distance" : ""}`);
console.log(`  Dénivelé positif : ${gain === null ? "pas d'altitudes dans le GPX" : `${race.elevationGainM} m (à confirmer)`}`);
console.log(`  Spots candidats (à confirmer) : ${spots.length}${kept.length ? `, ${kept.length} spot(s) validé(s) conservé(s)` : ""}`);
for (const s of spots) console.log(`   - ${s.name.padEnd(42)} km ${s.km.join(" · ")}${s.highlight ? "   ★ passages multiples" : ""}`);
console.log(`
Ensuite :
  1. Renommer / supprimer les spots dans courses/${slug}/event.json (retirer "aConfirmer" une fois validés)
  2. node scripts/compute-walking-routes.ts ${slug}   # distances à pied entre spots
  3. node scripts/compute-walking-grid.ts ${slug}     # distances à pied pour les points libres
  4. node scripts/build-basemap.ts ${slug}            # fond de carte hors-ligne (outil pmtiles)
  5. node scripts/generate-route-plan.ts ${slug}      # plan de repli`);
