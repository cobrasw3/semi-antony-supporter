import { describe, it, expect } from "vitest";
import {
  timeStringToMinutes,
  minutesToTimeString,
  floorMinutesToTimeString,
  ceilMinutesToTimeString,
  paceFromTargetTime,
  computeMarginMinutes,
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

describe("computeCrossingsForPoint", () => {
  // Cas de l'énoncé : départ 14h30, allure 5 min/km, point au km 2 d'une
  // boucle de 7 km -> passage boucle 1 à 14h40.
  const baseParams = {
    startTimeMinutes: timeStringToMinutes("14:30"),
    paceMinPerKm: 5,
    distanceInLoopKm: 2,
    loopCount: 3,
    loopLengthKm: 7,
    margin: { percentage: 0, minMinutes: 0 }, // marge désactivée pour isoler le calcul central
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
      margin: { percentage: 0.035, minMinutes: 1.5 },
    });

    const [loop1, , loop3] = withMargin;
    const widthLoop1 = timeStringToMinutes(loop1.windowEnd) - timeStringToMinutes(loop1.windowStart);
    const widthLoop3 = timeStringToMinutes(loop3.windowEnd) - timeStringToMinutes(loop3.windowStart);

    // La fenêtre du 3e passage (16 km, donc plus de temps écoulé) doit être
    // plus large que celle du 1er passage (2 km).
    expect(widthLoop3).toBeGreaterThan(widthLoop1);
    // Le plancher garantit au moins 3 min de large (±1.5 min) dès le 1er passage.
    expect(widthLoop1).toBeGreaterThanOrEqual(3);
    // L'heure centrale reste identique au cas sans marge.
    expect(loop1.estimatedTime).toBe("14:40");
  });

  it("la fenêtre n'est jamais inversée ni nulle, même avec une marge minimale", () => {
    const withTinyMargin = computeCrossingsForPoint({
      ...baseParams,
      margin: { percentage: 0.0001, minMinutes: 0.01 },
    });

    for (const crossing of withTinyMargin) {
      const startMin = timeStringToMinutes(crossing.windowStart);
      const endMin = timeStringToMinutes(crossing.windowEnd);
      expect(endMin).toBeGreaterThan(startMin);
    }
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
      margin: { percentage: 0.035, minMinutes: 1.5 },
    });

    expect(result).toHaveLength(2);
    expect(result[0].crossings).toHaveLength(3);

    const allStarts = result.flatMap((p) => p.crossings.map((c) => c.windowStartMinutes));
    const sorted = [...allStarts].sort((a, b) => a - b);
    expect(allStarts.some((_, i) => allStarts[i] !== sorted[i])).toBe(true); // les deux points s'entremêlent dans le temps
  });
});
