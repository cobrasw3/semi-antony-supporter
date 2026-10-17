import { describe, it, expect } from "vitest";
import rawEvent from "../../public/data/event.json";
import { parseEventConfig, type Spot } from "./event";
import { chronologicalTransitions, evaluateTransition, indexSpots, optimalPlan, walkBetween } from "./itinerary";
import { computeAllPassages, type Passage } from "./timing";

const walking = { speedKmh: 4.5, detourFactor: 1.3, safetyMarginMinutes: 3 };

function passage(spotId: string, estimated: number, halfWindow = 2): Passage {
  return {
    spotId,
    km: 0,
    loopIndex: 1,
    kind: "loop",
    label: "",
    estimatedMinutes: estimated,
    windowStartMinutes: estimated - halfWindow,
    windowEndMinutes: estimated + halfWindow,
    estimatedTime: "",
    windowStart: "",
    windowEnd: "",
  };
}

// À 48.75°N, 0.009° de latitude ≈ 1 km.
const spot = (id: string, latOffsetKm: number): Spot => ({
  id,
  name: id,
  shortName: id,
  address: "",
  access: "",
  description: "",
  lat: 48.75 + latOffsetKm * 0.008993,
  lng: 2.29,
  km: [0],
});

describe("walkBetween", () => {
  it("applique le facteur de détour et la vitesse de marche", () => {
    const leg = walkBetween(spot("a", 0), spot("b", 1), walking);
    expect(leg.directKm).toBeCloseTo(1, 2);
    expect(leg.walkKm).toBeCloseTo(1.3, 2);
    // 1,3 km à 4,5 km/h = 17,3 min
    expect(leg.minutes).toBeCloseTo(17.33, 1);
  });
});

describe("evaluateTransition", () => {
  const spots = indexSpots([spot("a", 0), spot("b", 1)]);

  it("✅ quand on arrive avec 3 min de marge avant la fourchette", () => {
    // départ 0 + 17,3 min de marche = 17,3 ; fourchette suivante dès 21 -> 3,7 min d'avance
    expect(evaluateTransition(passage("a", 0), passage("b", 23), spots, walking).status).toBe("ok");
  });

  it("⚠️ quand on arrive avant l'heure estimée mais sans la marge", () => {
    expect(evaluateTransition(passage("a", 0), passage("b", 19), spots, walking).status).toBe("tight");
  });

  it("❌ quand on arrive après l'heure estimée", () => {
    expect(evaluateTransition(passage("a", 0), passage("b", 15), spots, walking).status).toBe("impossible");
  });

  it("rester sur place ne coûte aucune marche", () => {
    const t = evaluateTransition(passage("a", 0), passage("a", 40), spots, walking);
    expect(t.sameSpot).toBe(true);
    expect(t.walk.minutes).toBe(0);
    expect(t.status).toBe("ok");
  });
});

/** Plus longue chaîne par énumération exhaustive (référence pour la DP). */
function bruteForceBest(passages: Passage[], spots: Spot[]): number {
  const byId = indexSpots(spots);
  const sorted = [...passages].sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
  const longestFrom = (i: number): number => {
    let best = 1;
    for (let j = i + 1; j < sorted.length; j++) {
      if (evaluateTransition(sorted[i], sorted[j], byId, walking).status === "ok") best = Math.max(best, 1 + longestFrom(j));
    }
    return best;
  };
  return Math.max(...sorted.map((_, i) => longestFrom(i)));
}

describe("optimalPlan", () => {
  it("enchaîne les spots quand c'est faisable et écarte les transitions trop justes", () => {
    // b@22 est trop juste depuis a@0 (2,7 min de marge < 3) : le plan reste
    // en a, puis fait l'aller-retour vers c, tout proche.
    const spots = [spot("a", 0), spot("b", 1), spot("c", 0.2)];
    const passages = [passage("a", 0), passage("b", 22), passage("a", 25), passage("c", 35), passage("a", 45)];
    const plan = optimalPlan(passages, spots, walking);
    expect(plan.steps.map((p) => `${p.spotId}@${p.estimatedMinutes}`)).toEqual(["a@0", "a@25", "c@35", "a@45"]);
    expect(plan.transitions).toHaveLength(3);
    expect(plan.transitions.every((t) => t.status === "ok")).toBe(true);
  });

  it("égale l'optimum exhaustif sur des cas aléatoires", () => {
    let seed = 42;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let run = 0; run < 30; run++) {
      const spots = ["a", "b", "c", "d"].map((id) => spot(id, rand() * 1.5));
      const passages = Array.from({ length: 9 }, () => passage(spots[Math.floor(rand() * 4)].id, Math.round(rand() * 90)));
      expect(optimalPlan(passages, spots, walking).steps).toHaveLength(bruteForceBest(passages, spots));
    }
  });

  it("sur le semi à 5:30, fait au moins aussi bien que rester au stade (4 passages)", () => {
    const config = parseEventConfig(rawEvent);
    const semi = config.races[0];
    const passages = computeAllPassages(semi, 5.5, config.settings.margin);
    const plan = optimalPlan(passages, semi.spots, config.settings.walking);
    expect(plan.steps.length).toBeGreaterThanOrEqual(4);
    expect(plan.steps.length).toBe(bruteForceBest(passages, semi.spots));
    for (let i = 1; i < plan.steps.length; i++) {
      expect(plan.steps[i].estimatedMinutes).toBeGreaterThan(plan.steps[i - 1].estimatedMinutes);
    }
  });

  it("liste vide -> plan vide", () => {
    expect(optimalPlan([], [], walking).steps).toEqual([]);
  });
});

describe("chronologicalTransitions", () => {
  it("donne une transition entre chaque passage consécutif", () => {
    const spots = [spot("a", 0), spot("b", 1)];
    const t = chronologicalTransitions([passage("a", 0), passage("b", 30), passage("a", 35)], spots, walking);
    expect(t.map((x) => x.status)).toEqual(["ok", "impossible"]);
  });
});
