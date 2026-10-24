// Tableau de bord des courses : `npm run courses`
//
// Pour chaque dossier courses/<slug>/ : statut (prête / en attente du GPX /
// spots à valider), URL (et si elle répond), lien démo, prochaine action
// (tirée de SUIVI.md). Affiché dans le terminal et écrit dans
// courses/TABLEAU.md. Génère aussi le QR code du lien démo dans
// courses/<slug>/assets/qr-demo.png.
//
// --hors-ligne : ne vérifie pas si les URL répondent.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
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

/** Heure « pendant la course » pour le lien démo : à ≈ 45 % de la course pour un coureur à 5:30/km. */
function demoTime(start: string, distanceKm: number): string {
  const [h, m] = start.split(":").map(Number);
  const t = h * 60 + m + Math.round((distanceKm * 5.5 * 0.45) / 5) * 5;
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
  const races = ev.races as Array<{ id: string; distanceKm: number; name: string; startTime: string; track: unknown[]; spots: Array<{ aConfirmer?: boolean }>; aConfirmer?: boolean }>;
  const hasGpx = readdirSync(courseDir(slug)).some((f) => f.toLowerCase().endsWith(".gpx"));
  const raceStatus = (r: (typeof races)[number]) =>
    r.track.length < 2 || r.spots.length === 0
      ? hasGpx && races.length === 1
        ? "tracé à importer"
        : "en attente du GPX"
      : r.spots.some((x) => x.aConfirmer)
        ? `spots à valider (${r.spots.filter((x) => x.aConfirmer).length})`
        : "prête";
  const spotsToCheck = races.reduce((n, r) => n + r.spots.filter((x) => x.aConfirmer).length, 0);
  // Une seule course : son statut ; plusieurs : course par course.
  const status = races.length === 1 ? raceStatus(races[0]) : races.map((r) => `${r.name} : ${raceStatus(r)}`).join(" · ");
  const url = ev.deploy?.url ?? `https://${ev.deploy?.worker ?? slug}.semi-supporter.workers.dev`;
  const name = slug === "antony" ? "Paul" : "Léa";
  // Lien démo sur la première course dont le parcours est intégré.
  const shown = races.find((r) => r.track.length >= 2 && r.spots.length > 0) ?? races[0];
  const raceParam = shown !== races[0] ? `&race=${shown.id}` : "";
  const demo = `${url}/?demo=1&now=${slug === "antony" ? "15:20" : demoTime(shown.startTime, shown.distanceKm)}&name=${name}&pace=5:30${raceParam}`;
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
