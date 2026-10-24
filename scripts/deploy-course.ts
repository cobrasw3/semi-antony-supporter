// Déploie UNE course sur son propre Worker Cloudflare (fichiers statiques),
// donc sa propre URL : https://<worker>.semi-supporter.workers.dev
//
//   npm run deploy -- <slug>
//
// Prérequis : être connecté à Cloudflare (`npx wrangler login`, une fois).
// Chaque course a son Worker (nom dans event.json → deploy.worker, sinon le
// slug) : rien n'est partagé avec les autres (ni domaine, ni service worker,
// ni cache, ni données mémorisées).
//
// 🔒 Antony est servi par le Worker « semi-antony-supporter », déployé
// automatiquement depuis la branche main (Cloudflare Workers Builds). Ce
// script REFUSE de le toucher, quelle que soit la config.

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ANTONY_PROD_WORKER, courseDir, readCourseEvent, ROOT, slugFromArgs } from "./lib/course.ts";

const slug = slugFromArgs();
const ev = readCourseEvent(slug);
const worker = ev.deploy?.worker ?? slug;

if (slug === "antony" || worker === ANTONY_PROD_WORKER) {
  console.error(
    "🔒 Refusé : la production d'Antony (Worker semi-antony-supporter) ne se déploie pas avec ce script.\n" +
      "   Elle part de la branche main via Cloudflare. Voir README, « Antony : bascule » et « retour arrière »."
  );
  process.exit(1);
}
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(worker)) {
  console.error(`Nom de Worker invalide dans courses/${slug}/event.json : ${worker}`);
  process.exit(1);
}

const run = (cmd: string, args: string[], env: NodeJS.ProcessEnv = process.env) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", env, shell: process.platform === "win32", cwd: ROOT });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

// 1. Build de la course seule (dans dist/).
run("node", ["scripts/course-run.mjs", "build", slug]);

// 2. Config wrangler propre à cette course (hors dépôt).
const dir = join(ROOT, "node_modules", ".course", slug);
mkdirSync(dir, { recursive: true });
const config = join(dir, "wrangler.json");
writeFileSync(
  config,
  JSON.stringify(
    {
      name: worker,
      compatibility_date: "2026-10-01",
      assets: { directory: join(ROOT, "dist"), not_found_handling: "single-page-application" },
      workers_dev: true,
      preview_urls: false,
    },
    null,
    2
  )
);

// 3. Déploiement.
console.log(`\n▶ Déploiement de « ${slug} » sur le Worker « ${worker} »…`);
run("npx", ["wrangler", "deploy", "--config", config]);
console.log(`\n✔ ${ev.deploy?.url ?? `https://${worker}.<sous-domaine>.workers.dev`}`);
console.log(`  Dossier de la course : ${courseDir(slug)}`);
