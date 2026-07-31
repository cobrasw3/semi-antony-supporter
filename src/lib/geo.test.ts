import { describe, it, expect } from "vitest";
import {
  haversineDistanceKm,
  cumulativeDistancesKm,
  routeLengthKm,
  projectPointOntoRoute,
  splitIntoEqualLoops,
  detectLoopCount,
  type LatLng,
} from "./geo";

// Carré d'environ 1 km de côté centré près d'Antony (48.75°N) : à cette
// latitude, 0.009° de latitude et ~0.0137° de longitude valent chacun ~1 km.
// Pratique pour vérifier les distances "à la main".
const SQUARE_KM: LatLng[] = [
  { lat: 48.75, lng: 2.29 },
  { lat: 48.75, lng: 2.29 + 0.0137 },
  { lat: 48.75 + 0.009, lng: 2.29 + 0.0137 },
  { lat: 48.75 + 0.009, lng: 2.29 },
];

describe("haversineDistanceKm", () => {
  it("vaut ~0 pour un point identique", () => {
    expect(haversineDistanceKm(SQUARE_KM[0], SQUARE_KM[0])).toBeCloseTo(0, 3);
  });

  it("vaut ~1 km pour un côté du carré", () => {
    expect(haversineDistanceKm(SQUARE_KM[0], SQUARE_KM[1])).toBeCloseTo(1, 1);
  });
});

describe("cumulativeDistancesKm / routeLengthKm", () => {
  it("cumule ~1 km par côté du carré", () => {
    const cumulative = cumulativeDistancesKm(SQUARE_KM);
    expect(cumulative[0]).toBe(0);
    expect(cumulative[1]).toBeCloseTo(1, 1);
    expect(cumulative[2]).toBeCloseTo(2, 1);
    expect(cumulative[3]).toBeCloseTo(3, 1);
  });

  it("longueur totale ~= somme des segments (carré ouvert, 3 côtés)", () => {
    expect(routeLengthKm(SQUARE_KM)).toBeCloseTo(3, 1);
  });
});

describe("projectPointOntoRoute", () => {
  it("projette un point exactement sur le tracé à la bonne distance", () => {
    // Milieu du 2e côté (entre les points 1 et 2) : ~1.5 km parcourus.
    const midSecondSide: LatLng = {
      lat: 48.75 + 0.0045,
      lng: 2.29 + 0.0137,
    };
    const projection = projectPointOntoRoute(SQUARE_KM, midSecondSide);
    expect(projection.distanceAlongRouteKm).toBeCloseTo(1.5, 0);
    expect(projection.distanceFromRouteKm).toBeCloseTo(0, 1);
    expect(projection.segmentIndex).toBe(1);
  });

  it("point loin du tracé : distanceFromRouteKm le signale", () => {
    const farAway: LatLng = { lat: 48.9, lng: 2.5 };
    const projection = projectPointOntoRoute(SQUARE_KM, farAway);
    expect(projection.distanceFromRouteKm).toBeGreaterThan(5);
  });
});

describe("splitIntoEqualLoops", () => {
  it("laisse un tracé d'1 seule boucle inchangé", () => {
    const loops = splitIntoEqualLoops(SQUARE_KM, 1);
    expect(loops).toHaveLength(1);
    expect(loops[0]).toEqual(SQUARE_KM);
  });

  it("découpe un tracé 3x plus long en 3 boucles de longueur ~égale", () => {
    // Boucle fermée d'~4 km (carré complet), répétée 3 fois bout à bout.
    const closedLoop = [...SQUARE_KM, SQUARE_KM[0]];
    const threeLoops = [...closedLoop, ...closedLoop, ...closedLoop];

    const loops = splitIntoEqualLoops(threeLoops, 3);
    expect(loops).toHaveLength(3);
    for (const loop of loops) {
      expect(routeLengthKm(loop)).toBeCloseTo(4, 0);
    }
  });
});

describe("detectLoopCount", () => {
  it("détecte 1 boucle quand la longueur correspond à la boucle attendue", () => {
    expect(detectLoopCount(SQUARE_KM, 3)).toBe(1);
  });

  it("détecte 3 boucles quand le tracé fait ~3x la longueur attendue", () => {
    const closedLoop = [...SQUARE_KM, SQUARE_KM[0]];
    const threeLoops = [...closedLoop, ...closedLoop, ...closedLoop];
    expect(detectLoopCount(threeLoops, 4)).toBe(3);
  });
});
