// Lance Vite pour UNE course : `npm run dev -- <slug>`, `npm run build -- <slug>`,
// `npm run preview -- <slug>`. Sans slug : Antony (c'est ce que lance le
// build automatique de Cloudflare pour la production d'Antony).
// Les options restantes sont passées à Vite (ex. `npm run dev -- vincennes --port 5174`).

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const [command, ...rest] = process.argv.slice(2);
const slug = rest.find((a) => !a.startsWith("-")) ?? process.env.COURSE ?? "antony";
const viteArgs = rest.filter((a) => a !== slug);
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !existsSync(`courses/${slug}/event.json`)) {
  console.error(`Course « ${slug} » introuvable : attendu courses/${slug}/event.json.`);
  process.exit(1);
}
const env = { ...process.env, COURSE: slug };
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", env, shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
console.log(`▶ Course : ${slug}`);
if (command === "build") {
  run("npx", ["tsc", "-b"]);
  run("npx", ["vite", "build", ...viteArgs]);
} else if (command === "dev") {
  run("npx", ["vite", ...viteArgs]);
} else if (command === "preview") {
  run("npx", ["vite", "preview", ...viteArgs]);
} else {
  console.error("Usage : node scripts/course-run.mjs dev|build|preview [slug] [options Vite]");
  process.exit(2);
}
