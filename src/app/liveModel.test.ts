import { describe, it, expect } from "vitest";
import rawEvent from "../../public/data/event.json";
import { computeDayStatus } from "../lib/dayStatus";
import { parseEventConfig } from "../lib/event";
import { computeAllPassages, timeStringToMinutes } from "../lib/timing";
import { countdown, headerInfo, ringProgress, shortDate, startProgress, upcomingPassages } from "./liveModel";

const config = parseEventConfig(rawEvent);
const semi = config.races[0];
const passages = computeAllPassages(semi, 5.5, config.settings.margin);
const start = timeStringToMinutes(semi.startTime);
const day = config.event.date;
const clockAt = (hhmm: string, date = day) => ({ date, minutes: timeStringToMinutes(hhmm), demo: false });

describe("countdown", () => {
  it("formate minutes et heures", () => {
    expect(countdown(5.2)).toEqual({ value: "5", unit: "min" });
    expect(countdown(65)).toEqual({ value: "1:05", unit: "h" });
    expect(countdown(0.3)).toEqual({ value: "<1", unit: "min" });
  });
});

describe("ringProgress", () => {
  it("se remplit entre le passage précédent et le suivant", () => {
    const heller = passages.find((p) => p.spotId === "parc-heller")!;
    const marius = passages.find((p) => p.spotId === "rue-marius-hue")!;
    expect(ringProgress(passages, heller, marius.estimatedMinutes, start)).toBeCloseTo(0);
    expect(ringProgress(passages, heller, heller.estimatedMinutes, start)).toBeCloseTo(1);
    const mid = (marius.estimatedMinutes + heller.estimatedMinutes) / 2;
    expect(ringProgress(passages, heller, mid, start)).toBeCloseTo(0.5);
  });

  it("vers le départ : rempli à l'heure du départ", () => {
    expect(startProgress(0)).toBe(1);
    expect(startProgress(120)).toBe(0);
  });
});

describe("headerInfo", () => {
  const params = { eventDate: day, startTime: "14:30", runnerKm: null };

  it("J-x avant le jour de la course", () => {
    const status = computeDayStatus(passages, start, clockAt("10:00", "2027-03-14"), day);
    expect(headerInfo(status, params)).toEqual({ strong: "J-7", text: "dim. 21 mars · 14:30" });
  });

  it("départ, km estimé, arrivée", () => {
    expect(headerInfo(computeDayStatus(passages, start, clockAt("14:00"), day), params)).toEqual({
      strong: "Départ",
      text: "dans 30 min",
    });
    expect(headerInfo(computeDayStatus(passages, start, clockAt("15:00"), day), { ...params, runnerKm: 5.45 }).strong).toBe("Km 5,5");
    expect(headerInfo(computeDayStatus(passages, start, clockAt("17:00"), day), params)).toEqual({ strong: "Arrivée", text: "16:26" });
  });

  it("sans allure valide : l'heure de départ", () => {
    expect(headerInfo(null, params)).toEqual({ strong: "Départ", text: "14:30" });
  });
});

describe("upcomingPassages", () => {
  it("donne les prochains passages, ou les premiers avant le jour J", () => {
    expect(upcomingPassages(passages, null).map((p) => p.spotId)).toEqual(["stade-suant", "rue-marius-hue", "parc-heller"]);
    expect(upcomingPassages(passages, timeStringToMinutes("14:40"))[0].spotId).toBe("parc-heller");
  });
});

describe("shortDate", () => {
  it("formate en français court", () => {
    expect(shortDate("2027-03-21")).toBe("dim. 21 mars");
  });
});
