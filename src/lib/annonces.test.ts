import { describe, it, expect } from "vitest";
import { activeAnnonces, parseAnnonces, type Annonce } from "./annonces";

const TZ = "Europe/Paris";
const base: Annonce = {
  id: "a",
  level: "info",
  text: "Info",
  start: "2027-03-21T13:00:00+01:00",
  end: "2027-03-21T18:00:00+01:00",
};
const at = (date: string, hhmm: string, demo = false) => {
  const [h, m] = hhmm.split(":").map(Number);
  return { date, minutes: h * 60 + m, demo };
};

describe("activeAnnonces", () => {
  it("affiche une annonce entre son début et sa fin (heure de Paris)", () => {
    expect(activeAnnonces([base], at("2027-03-21", "12:59"), TZ)).toHaveLength(0);
    expect(activeAnnonces([base], at("2027-03-21", "13:00"), TZ)).toHaveLength(1);
    expect(activeAnnonces([base], at("2027-03-21", "18:00"), TZ)).toHaveLength(0);
    expect(activeAnnonces([base], at("2027-03-22", "10:00"), TZ)).toHaveLength(0);
  });

  it("met les annonces importantes en premier", () => {
    const list = [base, { ...base, id: "b", level: "important" as const }];
    expect(activeAnnonces(list, at("2027-03-21", "14:00"), TZ).map((a) => a.id)).toEqual(["b", "a"]);
  });

  it("n'affiche les annonces demoOnly qu'en mode démo", () => {
    const demo = { ...base, demoOnly: true };
    expect(activeAnnonces([demo], at("2027-03-21", "14:00"), TZ)).toHaveLength(0);
    expect(activeAnnonces([demo], at("2027-03-21", "14:00", true), TZ)).toHaveLength(1);
  });
});

describe("parseAnnonces", () => {
  it("ignore les annonces mal formées sans bloquer les autres", () => {
    const file = parseAnnonces({ annonces: [base, { ...base, id: "x", level: "urgent" }, { ...base, id: "y", start: "demain" }] });
    expect(file.annonces.map((a) => a.id)).toEqual(["a"]);
  });

  it("rejette un fichier sans tableau", () => {
    expect(() => parseAnnonces({})).toThrow();
  });
});
