import { describe, it, expect } from "vitest";
import {
  timeStringToMinutes,
  minutesToTimeString,
  paceFromTargetTime,
  computeMarginPercent,
  computeCrossingsForPoint,
  computeAllCrossings,
} from "./timing";

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

describe("paceFromTargetTime", () => {
  it("déduit l'allure d'un temps visé", () => {
    // 2h05 (125 min) sur 21.1 km ≈ 5.92 min/km
    expect(paceFromTargetTime(125, 21.1)).toBeCloseTo(5.924, 2);
  });
});

describe("computeMarginPercent", () => {
  const margin = { minPercent: 0.01, maxPercent: 0.03 };

  it("vaut minPercent au tout début du parcours", () => {
    expect(computeMarginPercent(0, 21, margin)).toBeCloseTo(0.01);
  });

  it("vaut maxPercent à la fin du parcours", () => {
    expect(computeMarginPercent(21, 21, margin)).toBeCloseTo(0.03);
  });

  it("interpole linéairement entre les deux", () => {
    expect(computeMarginPercent(10.5, 21, margin)).toBeCloseTo(0.02);
  });
});

describe("computeCrossingsForPoint", () => {
  // Cas de l'énoncé : départ 14h30, allure 5 min/km, point au km 2 d'une
  // boucle de 7 km -> passage boucle 1 à 14h40.
  const baseParams = {
    startTimeMinutes: timeStringToMinutes("14:30"),
    paceMinPerKm: 5,
    distanceInLoopKm: 2,
    loopCount: 3,
    loopLengthKm: 7,
    totalDistanceKm: 21,
    margin: { minPercent: 0, maxPercent: 0 }, // marge désactivée pour isoler le calcul central
  };

  it("calcule l'heure de passage exacte de la boucle 1", () => {
    const [loop1] = computeCrossingsForPoint(baseParams);
    expect(loop1.cumulativeDistanceKm).toBe(2);
    expect(loop1.estimatedTime).toBe("14:40");
  });

  it("calcule les 3 passages cumulés (d, d+7, d+14)", () => {
    const crossings = computeCrossingsForPoint(baseParams);
    expect(crossings).toHaveLength(3);
    expect(crossings.map((c) => c.cumulativeDistanceKm)).toEqual([2, 9, 16]);
    // 9 km * 5 min/km = 45 min -> 14:30 + 45 = 15:15
    expect(crossings[1].estimatedTime).toBe("15:15");
    // 16 km * 5 min/km = 80 min -> 14:30 + 80 = 15:50
    expect(crossings[2].estimatedTime).toBe("15:50");
  });

  it("élargit la fenêtre avec la distance quand la marge est active", () => {
    const withMargin = computeCrossingsForPoint({
      ...baseParams,
      margin: { minPercent: 0.01, maxPercent: 0.03 },
    });

    const [loop1, , loop3] = withMargin;
    const widthLoop1 = timeStringToMinutes(loop1.windowEnd) - timeStringToMinutes(loop1.windowStart);
    const widthLoop3 = timeStringToMinutes(loop3.windowEnd) - timeStringToMinutes(loop3.windowStart);

    // La fenêtre du 3e passage (16 km parcourus) doit être nettement plus
    // large que celle du 1er passage (2 km parcourus) : à faible distance,
    // la marge est de l'ordre de la dizaine de secondes et peut arrondir à 0
    // minute à l'affichage, ce qui est attendu.
    expect(widthLoop3).toBeGreaterThan(widthLoop1);
    expect(widthLoop3).toBeGreaterThan(0);
    // L'heure centrale reste identique au cas sans marge.
    expect(loop1.estimatedTime).toBe("14:40");
  });
});

describe("computeAllCrossings", () => {
  it("trie implicitement calculable via windowStartMinutes toutes boucles/points confondus", () => {
    const points = [
      { id: "a", name: "Point A", distanceInLoopKm: 2 },
      { id: "b", name: "Point B", distanceInLoopKm: 5 },
    ];

    const result = computeAllCrossings(points, {
      startTimeMinutes: timeStringToMinutes("14:30"),
      paceMinPerKm: 5,
      loopCount: 3,
      loopLengthKm: 7,
      totalDistanceKm: 21,
      margin: { minPercent: 0.01, maxPercent: 0.03 },
    });

    expect(result).toHaveLength(2);
    expect(result[0].crossings).toHaveLength(3);

    const allStarts = result.flatMap((p) => p.crossings.map((c) => c.windowStartMinutes));
    const sorted = [...allStarts].sort((a, b) => a - b);
    expect(allStarts.some((_, i) => allStarts[i] !== sorted[i])).toBe(true); // les deux points s'entremêlent dans le temps
  });
});
