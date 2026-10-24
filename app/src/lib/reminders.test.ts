import { describe, it, expect } from "vitest";
import rawEvent from "../../../courses/antony/event.json";
import { parseEventConfig } from "./event";
import { buildIcs, dueReminders, passageKey, zonedTimeToUtc } from "./reminders";
import { computeAllPassages, timeStringToMinutes } from "./timing";

const config = parseEventConfig(rawEvent);
const semi = config.races[0];
const passages = computeAllPassages(semi, 5.5, config.settings.margin);

describe("dueReminders", () => {
  it("annonce les passages prévus dans les 10 prochaines minutes, une seule fois", () => {
    // 14:40 : ravito sud (≈ 14:43) et rue des Champs (≈ 14:52) ; ce dernier est à plus de 10 min.
    const due = dueReminders(passages, timeStringToMinutes("14:40"), new Set());
    expect(due.map((p) => p.spotId)).toEqual(["ravito-sud"]);
    expect(dueReminders(passages, timeStringToMinutes("14:40"), new Set([passageKey(due[0])]))).toEqual([]);
  });

  it("n'annonce pas un passage déjà passé", () => {
    expect(dueReminders(passages, timeStringToMinutes("14:46"), new Set()).map((p) => p.spotId)).not.toContain("ravito-sud");
  });
});

describe("zonedTimeToUtc", () => {
  it("convertit l'heure de Paris en UTC, en hiver et en été", () => {
    expect(zonedTimeToUtc("2027-03-21", 870, "Europe/Paris").toISOString()).toBe("2027-03-21T13:30:00.000Z");
    expect(zonedTimeToUtc("2026-06-01", 870, "Europe/Paris").toISOString()).toBe("2026-06-01T12:30:00.000Z");
  });
});

describe("buildIcs", () => {
  const finish = passages.find((p) => p.kind === "finish")!;
  const ics = buildIcs({
    items: [{ passage: finish, title: "Léa arrive au stade, ici; vite", location: "165 avenue François-Molé, Antony" }],
    eventId: config.event.id,
    eventDate: config.event.date,
    timeZone: config.event.timeZone,
    now: new Date("2026-10-17T10:00:00Z"),
  });

  it("produit un VEVENT avec la fourchette en UTC et une alarme 10 min avant l'heure estimée", () => {
    // Arrivée ≈ 16:26 (fourchette 16:21–16:31) à Paris = 15:21–15:31 UTC en mars.
    expect(ics).toContain("DTSTART:20270321T152100Z");
    expect(ics).toContain("DTEND:20270321T153100Z");
    // 16:26 − 10 min = 16:16, soit 5 min avant le début de fourchette (16:21).
    expect(ics).toContain("TRIGGER:-PT5M");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });

  it("échappe virgules et points-virgules", () => {
    expect(ics).toContain("SUMMARY:Léa arrive au stade\\, ici\\; vite");
  });
});
