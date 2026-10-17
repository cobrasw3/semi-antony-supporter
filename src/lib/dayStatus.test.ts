import { describe, it, expect } from "vitest";
import rawEvent from "../../public/data/event.json";
import { parseEventConfig } from "./event";
import { computeAllPassages, timeStringToMinutes } from "./timing";
import { computeDayStatus, formatDelay } from "./dayStatus";
import { daysBetween, eventClock, formatLongDate, parseDemoParams, zonedDateTime } from "./clock";

const config = parseEventConfig(rawEvent);
const semi = config.races[0];
const passages = computeAllPassages(semi, 5.5, config.settings.margin);
const start = timeStringToMinutes(semi.startTime);
const day = config.event.date;
const at = (hhmm: string, date = day) => ({ date, minutes: timeStringToMinutes(hhmm), demo: false });

describe("computeDayStatus", () => {
  it("hors jour de course : nombre de jours et horaires prévus", () => {
    const status = computeDayStatus(passages, start, at("10:00", "2027-03-14"), day);
    expect(status).toMatchObject({ kind: "notRaceDay", daysUntil: 7 });
    if (status?.kind === "notRaceDay") expect(status.finish.estimatedTime).toBe("16:26");
  });

  it("avant le départ : temps restant avant le départ", () => {
    expect(computeDayStatus(passages, start, at("13:50"), day)).toMatchObject({ kind: "beforeStart", minutesToStart: 40 });
  });

  it("pendant : prochain passage et délai", () => {
    // 14:40 : rue Marius Hue (km 1, ≈ 14:35) est passée ; prochain = parc Heller (km 2,7 ≈ 14:45).
    const status = computeDayStatus(passages, start, at("14:40"), day);
    if (status?.kind !== "live") throw new Error("live attendu");
    expect(status.current).toBeNull();
    expect(status.next?.spotId).toBe("parc-heller");
    expect(Math.round(status.minutesToNext!)).toBe(5);
  });

  it("pendant : signale le passage en cours dans sa fourchette", () => {
    const status = computeDayStatus(passages, start, at("14:45"), day);
    if (status?.kind !== "live") throw new Error("live attendu");
    expect(status.current?.spotId).toBe("parc-heller");
    expect(status.next?.spotId).not.toBe("parc-heller");
  });

  it("après l'arrivée : course terminée", () => {
    const status = computeDayStatus(passages, start, at("17:00"), day);
    expect(status).toMatchObject({ kind: "finished" });
    if (status?.kind === "finished") expect(status.finish.estimatedTime).toBe("16:26");
  });

  it("sans passages (saisie invalide) : pas d'état", () => {
    expect(computeDayStatus([], start, at("14:40"), day)).toBeNull();
  });
});

describe("horloge", () => {
  it("lit le mode démo", () => {
    expect(parseDemoParams("?demo=1&now=14:40")).toEqual({ demo: true, nowMinutes: 880 });
    expect(parseDemoParams("?now=14:40")).toEqual({ demo: false, nowMinutes: null });
    expect(parseDemoParams("?demo=1&now=25:00")).toEqual({ demo: true, nowMinutes: null });
  });

  it("en démo, se place le jour J et fait avancer l'heure simulée", () => {
    const startedAt = new Date("2026-10-17T08:00:00Z");
    const clock = eventClock({
      realNow: new Date(startedAt.getTime() + 90_000),
      demoStartedAt: startedAt,
      demo: { demo: true, nowMinutes: 880 },
      eventDate: day,
      timeZone: "Europe/Paris",
    });
    expect(clock).toEqual({ date: day, minutes: 881.5, demo: true });
  });

  it("convertit l'heure réelle dans le fuseau de l'événement", () => {
    // 12:30 UTC = 14:30 à Paris en heure d'été.
    expect(zonedDateTime(new Date("2026-06-01T12:30:00Z"), "Europe/Paris")).toEqual({ date: "2026-06-01", minutes: 870 });
  });

  it("compte les jours entre deux dates", () => {
    expect(daysBetween("2027-03-20", "2027-03-21")).toBe(1);
    expect(daysBetween("2027-03-22", "2027-03-21")).toBe(-1);
  });

  it("formate un délai et une date", () => {
    expect(formatDelay(0.4)).toBe("moins d'1 min");
    expect(formatDelay(12.2)).toBe("12 min");
    expect(formatDelay(65)).toBe("1 h 05");
    expect(formatLongDate("2027-03-21")).toBe("dimanche 21 mars 2027");
  });
});
