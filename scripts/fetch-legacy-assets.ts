// Conserve les fichiers de la version EN LIGNE d'une course avant de publier
// une nouvelle version : `node scripts/fetch-legacy-assets.ts [slug]`
// (Antony par défaut).
//
// Pourquoi : une page restée ouverte sur l'ancienne version (par ex. pendant
// une saisie, l'app attend avant de recharger) peut encore demander un de
// ses fichiers (l'écran Carte est chargé à la demande). Si la nouvelle
// version ne le sert plus, l'import échoue → page blanche. On télécharge donc
// les fichiers JS/CSS/polices de la version en ligne dans
// courses/<slug>/legacy-assets/ ; le build les sert à leur adresse
// d'origine (/assets/…), sans les mettre dans le cache hors-ligne.
//
// À relancer juste avant chaque mise en production (voir README, « bascule »).

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { courseDir, readCourseEvent, slugFromArgs } from "./lib/course.ts";

const slug = slugFromArgs();
const base = readCourseEvent(slug).deploy?.url;
if (!base) {
  console.error(`Pas d'URL de production pour « ${slug} » (event.json → deploy.url).`);
  process.exit(1);
}

const get = async (path: string) => {
  const r = await fetch(new URL(path, base));
  if (!r.ok) throw new Error(`${path} : HTTP ${r.status}`);
  return r;
};

// Fichiers précachés par le service worker en ligne, plus ceux cités par ses CSS (polices).
const sw = await (await get("/sw.js")).text();
const files = new Set([...sw.matchAll(/url:"(assets\/[^"]+)"/g)].map((m) => m[1]));
for (const css of [...files].filter((f) => f.endsWith(".css"))) {
  const text = await (await get(`/${css}`)).text();
  for (const m of text.matchAll(/url\(\/?(assets\/[^)"']+)\)/g)) files.add(m[1]);
}

const dir = join(courseDir(slug), "legacy-assets");
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
let bytes = 0;
for (const file of [...files].sort()) {
  const data = Buffer.from(await (await get(`/${file}`)).arrayBuffer());
  writeFileSync(join(dir, file.replace(/^assets\//, "")), data);
  bytes += data.length;
}
console.log(`${files.size} fichiers de ${base} conservés dans courses/${slug}/legacy-assets/ (${(bytes / 1024).toFixed(0)} Ko).`);
