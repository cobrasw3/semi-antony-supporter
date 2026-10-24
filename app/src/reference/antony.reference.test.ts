// Non-régression d'Antony : les calculs (horaires de chaque spot, meilleur
// parcours, option « sur place », recalage après pointage) doivent rester
// identiques à la version en production avant la refonte multi-courses
// (tag git `antony-prod-avant-multi`).
//
// Référence enregistrée dans tests/reference/antony-logique.json.
// Régénérer (seulement si un changement est voulu et validé) :
//   UPDATE_REF=1 npx vitest run antony.reference

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import rawEvent from "../../../courses/antony/event.json";
import { recalibratePassages } from "../lib/checkin";
import { parseEventConfig } from "../lib/event";
import { planOptions, stayPutOption } from "../lib/itinerary";
import { computeAllPassages, paceFromTargetTime, timeStringToMinutes, type Passage } from "../lib/timing";

const FILE = resolve(__dirname, "../../../tests/reference/antony-logique.json");

function snapshot() {
  const config = parseEventConfig(rawEvent);
  const race = config.races[0];
  const routes = race.walkingRoutes?.km;
  const walking = config.settings.walking;
  const pass = (p: Passage) => `${p.spotId}@${p.km} ${p.label} ${p.estimatedTime} [${p.windowStart}–${p.windowEnd}]`;
  const plan = (o: { steps: Passage[]; totalWalkKm: number } | null) =>
    o ? { etapes: o.steps.map((p) => `${p.spotId}@${p.estimatedTime}`), marcheKm: Math.round(o.totalWalkKm * 1000) / 1000 } : null;
  const scenario = (pace: number) => {
    const passages = computeAllPassages(race, pace, config.settings.margin);
    const options = planOptions(passages, race.spots, walking, routes);
    return {
      passages: passages.map(pass),
      options: options.map(plan),
      meilleur: plan(options.at(-1) ?? null),
      surPlace: plan(stayPutOption(options)),
    };
  };
  const out: Record<string, unknown> = {};
  for (const pace of ["4:30", "5:30", "6:30"]) {
    const [m, s] = pace.split(":").map(Number);
    out[`allure ${pace}`] = scenario(m + s / 60);
  }
  for (const target of ["1:35", "1:56", "2:17"]) {
    const [h, m] = target.split(":").map(Number);
    out[`temps visé ${target}`] = scenario(paceFromTargetTime(h * 60 + m, race.distanceKm));
  }
  // Lien de démo envoyé à la mairie : Paul à 5:30, pointé au ravito sud à 15:20.
  const passages = computeAllPassages(race, 5.5, config.settings.margin);
  const checkin = { spotId: "ravito-sud", km: 9.37, minutes: timeStringToMinutes("15:20") };
  out["démo Paul 5:30 pointé ravito sud 15:20"] = recalibratePassages(passages, checkin, race, 5.5, config.settings.margin, config.settings.pace).map(pass);
  return out;
}

describe("Antony : non-régression des calculs", () => {
  it("identiques à la version en production avant la refonte", () => {
    const now = snapshot();
    if (process.env.UPDATE_REF === "1" || !existsSync(FILE)) {
      writeFileSync(FILE, JSON.stringify(now, null, 2) + "\n");
    }
    expect(now).toEqual(JSON.parse(readFileSync(FILE, "utf-8")));
  });
});
