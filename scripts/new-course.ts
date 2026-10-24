// Crée une nouvelle course à partir du modèle : `npm run new-course -- <slug>`
// Options : --nom "Semi de X" --court "Semi de X" --couleur "#1f6f8b"
//           --organisateur "Club Y" --ville "X"
// Copie courses/_modele/ vers courses/<slug>/, remplit les {{MARQUEURS}},
// puis génère les icônes (si `sharp` est installé).

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { courseDir, COURSES_DIR, isValidSlug } from "./lib/course.ts";

const args = process.argv.slice(2);
const slug = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

if (!slug || !isValidSlug(slug)) {
  console.error("Usage : npm run new-course -- <slug> [--nom …] [--court …] [--couleur #rrggbb] [--organisateur …] [--ville …]");
  console.error("Slug : minuscules, chiffres et tirets (ex. semi-rambouillet).");
  process.exit(1);
}
const dir = courseDir(slug);
if (existsSync(dir)) {
  console.error(`courses/${slug}/ existe déjà : rien n'est écrasé.`);
  process.exit(1);
}
const couleur = opt("couleur") ?? "#1f6f8b";
if (!/^#[0-9a-fA-F]{6}$/.test(couleur)) {
  console.error(`Couleur invalide : ${couleur} (attendu #rrggbb).`);
  process.exit(1);
}
const titre = slug.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const values: Record<string, string> = {
  "{{SLUG}}": slug,
  "{{NOM}}": opt("nom") ?? titre,
  "{{NOM_COURT}}": opt("court") ?? opt("nom") ?? titre,
  "{{COULEUR}}": couleur,
  "{{ORGANISATEUR}}": opt("organisateur") ?? "l’organisateur",
  "{{VILLE}}": opt("ville") ?? titre,
};

cpSync(join(COURSES_DIR, "_modele"), dir, { recursive: true });
const fill = (path: string) => {
  for (const name of readdirSync(path)) {
    const file = join(path, name);
    if (statSync(file).isDirectory()) fill(file);
    else if (/\.(json|md|svg)$/.test(name)) {
      const text = readFileSync(file, "utf-8").replace(/\{\{[A-Z_]+\}\}/g, (m) => values[m] ?? m);
      writeFileSync(file, text);
    }
  }
};
fill(dir);
console.log(`courses/${slug}/ créé.`);

const icons = spawnSync("node", ["scripts/generate-icons.mjs", slug], { stdio: "pipe", encoding: "utf-8" });
if (icons.status === 0) console.log("Icônes générées.");
else console.log(`Icônes à générer : npm i --no-save sharp && node scripts/generate-icons.mjs ${slug}`);
console.log(`Ensuite : déposer le tracé dans courses/${slug}/parcours.gpx, puis npm run import-gpx -- ${slug}`);
