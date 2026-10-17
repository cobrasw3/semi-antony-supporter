import { describe, it, expect } from "vitest";
import {
  timeStringToMinutes,
  minutesToTimeString,
  floorMinutesToTimeString,
  ceilMinutesToTimeString,
  paceFromTargetTime,
  computeMarginMinutes,
  computePassage,
  computeSpotPassages,
  computeAllPassages,
  groupPassagesBySpot,
  loopIndexAt,
} from "./timing";
import type { Race } from "./event";

describe("timeStringToMinutes / minutesToTimeString", () => {
  it("convertit dans les deux sens", () => {
    expect(timeStringToMinutes("14:30")).toBe(870);
    expect(minutesToTimeString(870)).toBe("14:30");
  });

  it("gère le passage de minuit", () => {
    expect(minutesToTimeString(1440)).toBe("00:00");
    expect(minutesToTimeString(1500)).toBe("01:00");
  });
});

describe("floorMinutesToTimeString / ceilMinutesToTimeString", () => {
  it("arrondissent vers le bas / le haut, jamais vers le plus proche", () => {
    expect(floorMinutesToTimeString(870.9)).toBe("14:30");
    expect(ceilMinutesToTimeString(870.1)).toBe("14:31");
  });

  it("laissent les minutes entières inchangées", () => {
    expect(floorMinutesToTimeString(870)).toBe("14:30");
    expect(ceilMinutesToTimeString(870)).toBe("14:30");
  });
});

describe("paceFromTargetTime", () => {
  it("déduit l'allure d'un temps visé", () => {
    // 2h05 (125 min) sur 21.1 km ≈ 5.92 min/km
    expect(paceFromTargetTime(125, 21.1)).toBeCloseTo(5.924, 2);
  });
});

describe("computeMarginMinutes", () => {
  const margin = { percentage: 0.035, minMinutes: 1.5 };

  it("applique le plancher quand le pourcentage donnerait moins", () => {
    // 10 min écoulées * 3.5% = 0.35 min, bien en dessous du plancher de 1.5 min.
    expect(computeMarginMinutes(10, margin)).toBe(1.5);
  });

  it("applique le pourcentage une fois qu'il dépasse le plancher", () => {
    // 100 min écoulées * 3.5% = 3.5 min > plancher.
    expect(computeMarginMinutes(100, margin)).toBeCloseTo(3.5);
  });

  it("croît avec le temps écoulé (donc avec la distance)", () => {
    expect(computeMarginMinutes(200, margin)).toBeGreaterThan(computeMarginMinutes(100, margin));
  });
});

const race: Race = {
  id: "test",
  name: "Test",
  distanceKm: 21,
  startTime: "14:30",
  loops: 3,
  loopLengthKm: 7,
  defaultPace: "5:00",
  defaultTargetTime: "1:45",
  track: [
    [48.75, 2.29],
    [48.76, 2.3],
  ],
  spots: [
    { id: "a", name: "A", shortName: "A", address: "", lat: 48.75, lng: 2.29, access: "", description: "", km: [2, 9, 16] },
    { id: "b", name: "B", shortName: "B", address: "", lat: 48.76, lng: 2.3, access: "", description: "", km: [5, 12, 19] },
  ],
};
const noMargin = { percentage: 0, minMinutes: 0 };

describe("computePassage", () => {
  it("calcule l'heure de passage à partir du km et de l'allure", () => {
    // Départ 14h30, allure 5 min/km, km 2 -> 14h40.
    const p = computePassage({ spotId: "a", km: 2, race, paceMinPerKm: 5, margin: noMargin });
    expect(p.estimatedTime).toBe("14:40");
    expect(p.loopIndex).toBe(1);
  });
});

describe("computeSpotPassages", () => {
  it("produit un passage par position km, dans l'ordre", () => {
    const passages = computeSpotPassages({ id: "a", km: [16, 2, 9] }, race, 5, noMargin);
    expect(passages.map((p) => p.km)).toEqual([2, 9, 16]);
    // 9 km * 5 = 45 min -> 15:15 ; 16 km * 5 = 80 min -> 15:50
    expect(passages.map((p) => p.estimatedTime)).toEqual(["14:40", "15:15", "15:50"]);
    expect(passages.map((p) => p.loopIndex)).toEqual([1, 2, 3]);
  });

  it("élargit la fenêtre avec la distance quand la marge est active", () => {
    const [p1, , p3] = computeSpotPassages(race.spots[0], race, 5, { percentage: 0.035, minMinutes: 1.5 });
    const width = (p: typeof p1) => p.windowEndMinutes - p.windowStartMinutes;
    expect(width(p3)).toBeGreaterThan(width(p1));
    expect(width(p1)).toBeGreaterThanOrEqual(3);
    expect(p1.estimatedTime).toBe("14:40");
  });

  it("la fenêtre n'est jamais inversée ni nulle, même avec une marge minimale", () => {
    for (const p of computeSpotPassages(race.spots[0], race, 5, { percentage: 0.0001, minMinutes: 0.01 })) {
      expect(timeStringToMinutes(p.windowEnd)).toBeGreaterThan(timeStringToMinutes(p.windowStart));
    }
  });
});

describe("computeAllPassages", () => {
  it("trie tous les passages chronologiquement, spots confondus", () => {
    const passages = computeAllPassages(race, 5, noMargin);
    expect(passages.map((p) => `${p.spotId}${p.km}`)).toEqual(["a2", "b5", "a9", "b12", "a16", "b19"]);
  });

  it("se regroupe par spot", () => {
    const grouped = groupPassagesBySpot(computeAllPassages(race, 5, noMargin));
    expect(grouped.a).toHaveLength(3);
    expect(grouped.b.map((p) => p.km)).toEqual([5, 12, 19]);
  });
});

describe("loopIndexAt", () => {
  it("rattache une fin de boucle à la boucle qui commence", () => {
    expect(loopIndexAt(0, race)).toBe(1);
    expect(loopIndexAt(6.9, race)).toBe(1);
    expect(loopIndexAt(7, race)).toBe(2);
    expect(loopIndexAt(21, race)).toBe(3);
  });

  it("vaut toujours 1 pour un parcours sans boucle", () => {
    expect(loopIndexAt(4.5, { loops: 1, loopLengthKm: 5 })).toBe(1);
  });
});
