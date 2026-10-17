import { describe, it, expect } from "vitest";
import rawEvent from "../../public/data/event.json";
import { findRace, parseEventConfig } from "./event";

const clone = () => JSON.parse(JSON.stringify(rawEvent));

describe("parseEventConfig", () => {
  it("accepte le event.json livré", () => {
    const config = parseEventConfig(clone());
    expect(config.races[0].spots.length).toBeGreaterThan(0);
  });

  it("rejette une position km hors parcours", () => {
    const bad = clone();
    bad.races[0].spots[0].km = [42];
    expect(() => parseEventConfig(bad)).toThrow(/km/);
  });

  it("rejette une heure de départ mal formée", () => {
    const bad = clone();
    bad.races[0].startTime = "14h30";
    expect(() => parseEventConfig(bad)).toThrow(/startTime/);
  });

  it("rejette un fichier sans course", () => {
    const bad = clone();
    bad.races = [];
    expect(() => parseEventConfig(bad)).toThrow();
  });
});

describe("findRace", () => {
  it("retombe sur la première course si l'id est inconnu", () => {
    const config = parseEventConfig(clone());
    expect(findRace(config, "inconnue").id).toBe(config.races[0].id);
    expect(findRace(config, null).id).toBe(config.races[0].id);
  });
});
