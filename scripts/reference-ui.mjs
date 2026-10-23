// Non-régression de l'affichage d'Antony : relève les textes de chaque écran
// (assistant, Live, Plan, Horaires, Carte, Infos) pour plusieurs scénarios,
// et les compare à la référence tests/reference/antony-ui.json.
//
//   node scripts/reference-ui.mjs capture <url>   # (ré)enregistre la référence
//   node scripts/reference-ui.mjs compare <url>   # compare à la référence
//
// La référence a été capturée sur la production avant la refonte
// multi-courses (tag antony-prod-avant-multi). Navigateur : Edge ou Chrome
// (variable CHROME_PATH sinon Edge par défaut sous Windows).

import { readFileSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const [mode, base] = process.argv.slice(2);
if (!["capture", "compare"].includes(mode) || !base) {
  console.error("Usage : node scripts/reference-ui.mjs capture|compare <url>");
  process.exit(2);
}
const FILE = new URL("../tests/reference/antony-ui.json", import.meta.url);
const executablePath = process.env.CHROME_PATH ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Ce qui change d'un jour ou d'un déploiement à l'autre sans être une régression. */
const normalize = (t) =>
  t
    .replace(/J-\d+/g, "J-x")
    .replace(/\b\d+ \| JOURS\b/g, "x | JOURS")
    .replace(/\d+\.\d+\.\d+\+[0-9a-f]+/g, "VERSION")
    .replace(/Synchro \| [\d/]+( [\d:]+)?/g, "Synchro | x")
    .replace(/[ \t]+/g, " ")
    .trim();

const PACES = ["4:30", "5:30", "6:30"];
const scenarios = [
  { id: "assistant (premier lancement)", url: "/", onboarding: true },
  { id: "démo mail : Paul 5:30 à 15:20", url: "/?demo=1&now=15:20&name=Paul&pace=5:30" },
  ...PACES.flatMap((pace) => [
    { id: `allure ${pace} hors jour J`, url: `/?name=Léa&pace=${pace}` },
    ...["14:20", "15:20", "17:30"].map((now) => ({ id: `allure ${pace} démo ${now}`, url: `/?demo=1&now=${now}&name=Léa&pace=${pace}` })),
  ]),
  ...["1:35", "1:56", "2:17"].map((t) => ({
    id: `temps visé ${t} démo 15:20`,
    url: "/?demo=1&now=15:20",
    prefs: { name: "Léa", mode: "duration", paceText: "5:30", durationText: t },
  })),
];

const browser = await puppeteer.launch({ executablePath, headless: true });
const result = {};
for (const sc of scenarios) {
  const page = await browser.newPage();
  await page.emulate({
    viewport: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: false },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluateOnNewDocument((prefs) => {
    if (sessionStorage.getItem("ref-init")) return;
    sessionStorage.setItem("ref-init", "1");
    localStorage.clear();
    if (prefs) {
      localStorage.setItem("semi-supporter:prefs", JSON.stringify(prefs));
      localStorage.setItem("semi-supporter:onboarded", "true");
    }
  }, sc.prefs ?? null);
  await page.goto(new URL(sc.url, base).href, { waitUntil: "networkidle0" });
  await sleep(800);
  const body = async () => normalize(await page.evaluate(() => document.body.innerText.replace(/\n+/g, " | ")));
  const screens = {};
  if (sc.onboarding) {
    for (let step = 1; step <= 3; step++) {
      screens[`assistant ${step}`] = await body();
      await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.innerText.trim() === "Continuer")?.click());
      await sleep(500);
    }
  } else {
    const tab = async (id) => {
      await page.evaluate((id) => document.querySelector(`#tab-${id}`)?.click(), id);
      await sleep(id === "carte" ? 2500 : 600);
    };
    for (const id of ["live", "plan"]) {
      await tab(id);
      screens[id] = await body();
    }
    await page.evaluate(() => [...document.querySelectorAll("button, [role=tab], [role=radio]")].find((b) => b.innerText.trim() === "Horaires")?.click());
    await sleep(400);
    screens.horaires = await body();
    await tab("carte");
    screens.carte = normalize(await page.evaluate(() => document.querySelector(".map-drawer")?.innerText.replace(/\n+/g, " | ") ?? ""));
    await tab("infos");
    screens.infos = await body();
  }
  if (errors.length) screens.erreurs = errors.join(" / ");
  result[sc.id] = screens;
  await page.close();
}
await browser.close();

if (mode === "capture") {
  writeFileSync(FILE, JSON.stringify({ source: base, capturedAt: new Date().toISOString(), screens: result }, null, 2) + "\n");
  console.log(`Référence enregistrée : ${Object.keys(result).length} scénarios.`);
} else {
  const ref = JSON.parse(readFileSync(FILE, "utf-8")).screens;
  let diffs = 0;
  for (const [id, screens] of Object.entries(ref)) {
    for (const [screen, text] of Object.entries(screens)) {
      const now = result[id]?.[screen];
      if (now === text) continue;
      diffs++;
      // Premier écart, avec un peu de contexte.
      let i = 0;
      while (i < text.length && now?.[i] === text[i]) i++;
      console.log(`✗ ${id} › ${screen}\n   attendu : …${text.slice(Math.max(0, i - 60), i + 80)}…\n   obtenu  : …${(now ?? "(absent)").slice(Math.max(0, i - 60), i + 80)}…`);
    }
  }
  console.log(diffs ? `\n${diffs} écran(s) différent(s).` : `Identique à la référence (${Object.keys(ref).length} scénarios).`);
  process.exit(diffs ? 1 : 0);
}
