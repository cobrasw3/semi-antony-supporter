// Génère le fond de carte hébergé avec l'app (courses/<slug>/assets/carte/<zone>-<date>.pmtiles)
// à partir de l'export quotidien Protomaps (données OpenStreetMap), puis
// affiche les valeurs à reporter dans event.json (map.basemap / map.bounds).
//
// Prérequis : l'outil `pmtiles` (https://github.com/protomaps/go-pmtiles/releases)
// dans le PATH, ou son chemin dans la variable PMTILES.
//
// Usage : node scripts/build-basemap.ts [slug] [ouest,sud,est,nord]   (Antony par défaut)
//   Sans emprise : celle du parcours (event.json), avec ~800 m de marge.
//
// Le nom du fichier est daté : un nouveau fond = nouvelle URL, les téléphones
// le retéléchargent et l'ancien est supprimé du cache (src/pwa/basemap.ts).

import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { slugFromArgs } from "./lib/course.ts";

const SLUG = slugFromArgs(process.argv.slice(2).filter((a) => !a.includes(",")));
const EVENT = `courses/${SLUG}/event.json`;
const DIR = `courses/${SLUG}/assets/carte`;
const MARGIN_DEG = 0.008;

const event = JSON.parse(readFileSync(EVENT, "utf-8"));
const pmtiles = process.env.PMTILES ?? "pmtiles";

function trackBbox(): [number, number, number, number] {
  // Tracé stocké en paires [lat, lng].
  const pts: [number, number][] = event.races.flatMap((r: { track: [number, number][] }) => r.track);
  const lats = pts.map((p) => p[0]);
  const lngs = pts.map((p) => p[1]);
  const r = (x: number) => Math.round(x * 1000) / 1000;
  return [r(Math.min(...lngs) - MARGIN_DEG), r(Math.min(...lats) - MARGIN_DEG), r(Math.max(...lngs) + MARGIN_DEG), r(Math.max(...lats) + MARGIN_DEG)];
}

async function latestBuild(): Promise<string> {
  for (let i = 1; i <= 10; i++) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10).replaceAll("-", "");
    const url = `https://build.protomaps.com/${d}.pmtiles`;
    if ((await fetch(url, { method: "HEAD" })).ok) return d;
  }
  throw new Error("Aucun export Protomaps trouvé sur les 10 derniers jours.");
}

const bboxArg = process.argv.slice(2).find((a) => a.includes(","));
const bbox = bboxArg ? (bboxArg.split(",").map(Number) as [number, number, number, number]) : trackBbox();
const date = await latestBuild();
const name = `${event.event?.id ?? "zone"}-${date}.pmtiles`.replace(/[^\w.-]/g, "-");

mkdirSync(DIR, { recursive: true });
console.log(`Export ${date}, emprise ${bbox.join(",")} → ${DIR}/${name}`);
execFileSync(pmtiles, ["extract", `https://build.protomaps.com/${date}.pmtiles`, `${DIR}/${name}`, `--bbox=${bbox.join(",")}`, "--maxzoom=15"], {
  stdio: "inherit",
});

for (const f of readdirSync(DIR)) if (f.endsWith(".pmtiles") && f !== name) rmSync(`${DIR}/${f}`);

// event.json garde sa mise en forme compacte : on affiche le bloc à recopier.
console.log(`\nÀ reporter dans ${EVENT} (bloc "map") :`);
console.log(`  "basemap": "/carte/${name}",`);
console.log(`  "bounds": [[${bbox[1]}, ${bbox[0]}], [${bbox[3]}, ${bbox[2]}]],`);
