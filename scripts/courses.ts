// Tableau de bord des courses : `npm run courses`
//
// Pour chaque dossier courses/<slug>/ : statut (prête / en attente du GPX /
// spots à valider), URL (et si elle répond), lien démo, prochaine action
// (tirée de SUIVI.md). Affiché dans le terminal et écrit dans
// courses/TABLEAU.md. Génère aussi le QR code du lien démo dans
// courses/<slug>/assets/qr-demo.png.
//
// --hors-ligne : ne vérifie pas si les URL répondent.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import QRCode from "qrcode";
import { COURSES_DIR, courseDir, listCourses, readCourseEvent } from "./lib/course.ts";

interface Row {
  slug: string;
  name: string;
  status: string;
  online: string;
  url: string;
  demo: string;
  next: string;
  toConfirm: number;
}

const offline = process.argv.includes("--hors-ligne");

/** Heure « pendant la course » pour le lien démo : 50 min après le premier départ. */
function demoTime(start: string): string {
  const [h, m] = start.split(":").map(Number);
  const t = h * 60 + m + 50;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Première ligne non vide de la section « ## Prochaine action » de SUIVI.md. */
function nextAction(slug: string): string {
  const file = join(courseDir(slug), "SUIVI.md");
  if (!existsSync(file)) return "Créer SUIVI.md";
  const text = readFileSync(file, "utf-8");
  const section = text.split(/^## Prochaine action\s*$/m)[1];
  return section?.split("\n").map((l) => l.trim()).find((l) => l && !l.startsWith("#"))?.replace(/`/g, "") ?? "—";
}

async function isOnline(url: string): Promise<string> {
  if (offline) return "?";
  try {
    const r = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    if (r.status === 404) return "non déployée";
    return r.ok ? "en ligne" : `HTTP ${r.status}`;
  } catch {
    return "non déployée";
  }
}

const rows: Row[] = [];
for (const slug of listCourses()) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ev = readCourseEvent(slug) as any;
  const races = ev.races as Array<{ name: string; startTime: string; track: unknown[]; spots: Array<{ aConfirmer?: boolean }>; aConfirmer?: boolean }>;
  const hasGpx = existsSync(join(courseDir(slug), "parcours.gpx"));
  const ready = races.every((r) => r.track.length >= 2 && r.spots.length > 0);
  const spotsToCheck = races.reduce((n, r) => n + r.spots.filter((s) => s.aConfirmer).length, 0);
  const status = !ready
    ? hasGpx
      ? "GPX à importer"
      : "en attente du GPX"
    : spotsToCheck
      ? `spots à valider (${spotsToCheck})`
      : "prête";
  const url = ev.deploy?.url ?? `https://${ev.deploy?.worker ?? slug}.semi-supporter.workers.dev`;
  const name = slug === "antony" ? "Paul" : "Léa";
  const demo = `${url}/?demo=1&now=${slug === "antony" ? "15:20" : demoTime(races[0].startTime)}&name=${name}&pace=5:30`;
  const toConfirm =
    (ev.event.dateToConfirm ? 1 : 0) +
    (ev.organizer?.aConfirmer ? 1 : 0) +
    races.filter((r) => r.aConfirmer).length +
    (ev.infos ?? []).filter((i: { toConfirm?: boolean }) => i.toConfirm).length +
    spotsToCheck;
  rows.push({ slug, name: ev.event.name, status, online: await isOnline(url), url, demo, next: nextAction(slug), toConfirm });
  // QR code du lien démo (PNG, à imprimer ou à glisser dans un mail).
  await QRCode.toFile(join(courseDir(slug), "assets", "qr-demo.png"), demo, { width: 512, margin: 2, errorCorrectionLevel: "M" });
}

// Terminal
for (const r of rows) {
  console.log(`\n■ ${r.name} (${r.slug})`);
  console.log(`  Statut       : ${r.status} · ${r.online} · ${r.toConfirm} point(s) à confirmer`);
  console.log(`  URL          : ${r.url}`);
  console.log(`  Lien démo    : ${r.demo}`);
  console.log(`  Prochaine    : ${r.next}`);
}

// courses/TABLEAU.md
const md = `# Tableau de bord des courses

> Généré par \`npm run courses\` le ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}. Ne pas modifier à la main :
> la source est \`courses/<slug>/event.json\` et \`SUIVI.md\`.

| Course | Statut | En ligne | À confirmer | Prochaine action |
|---|---|---|---|---|
${rows.map((r) => `| [${r.name}](${r.slug}/SUIVI.md) | ${r.status} | ${r.online} | ${r.toConfirm} | ${r.next} |`).join("\n")}

## Liens

${rows.map((r) => `- **${r.name}** — ${r.url}\n  - démo : ${r.demo}\n  - QR code : [\`${r.slug}/assets/qr-demo.png\`](${r.slug}/assets/qr-demo.png)`).join("\n")}
`;
writeFileSync(join(COURSES_DIR, "TABLEAU.md"), md);
console.log(`\ncourses/TABLEAU.md écrit, QR codes dans courses/<slug>/assets/qr-demo.png.`);
