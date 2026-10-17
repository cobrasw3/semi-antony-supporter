import { describe, it, expect } from "vitest";
import rawEvent from "../../public/data/event.json";
import { parseEventConfig, trackOf } from "./event";
import { haversineDistanceKm } from "./geo";
import { estimatedKm, formatKmFr, positionOnTrack } from "./runnerPosition";

const semi = parseEventConfig(rawEvent).races[0];
const track = trackOf(semi);

describe("estimatedKm", () => {
  it("vaut null avant le départ, puis avance avec l'allure", () => {
    expect(estimatedKm(860, 870, 5.5, 21.0975)).toBeNull();
    expect(estimatedKm(870, 870, 5.5, 21.0975)).toBe(0);
    expect(estimatedKm(870 + 55, 870, 5.5, 21.0975)).toBeCloseTo(10);
  });

  it("s'arrête à l'arrivée", () => {
    expect(estimatedKm(870 + 300, 870, 5.5, 21.0975)).toBe(21.0975);
  });
});

describe("positionOnTrack", () => {
  it("place le km 0, 7, 14 et l'arrivée au départ de la boucle", () => {
    const start = track[0];
    for (const km of [0, 7, 14, 21.0975]) {
      expect(haversineDistanceKm(positionOnTrack(km, track, semi), start)).toBeLessThan(0.05);
    }
  });

  it("retrouve le même point à chaque tour", () => {
    const a = positionOnTrack(2.7, track, semi);
    const b = positionOnTrack(9.7, track, semi);
    expect(haversineDistanceKm(a, b)).toBeLessThan(0.001);
  });

  it("km 2,7 tombe près du parc Heller", () => {
    const heller = semi.spots.find((s) => s.id === "parc-heller")!;
    expect(haversineDistanceKm(positionOnTrack(2.7, track, semi), heller)).toBeLessThan(0.15);
  });
});

describe("formatKmFr", () => {
  it("formate à la française", () => {
    expect(formatKmFr(8.24)).toBe("km 8,2");
    expect(formatKmFr(14)).toBe("km 14");
  });
});
