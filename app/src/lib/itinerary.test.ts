import { describe, it, expect } from "vitest";
import rawEvent from "../../../courses/antony/event.json";
import { freeSpotToSpot } from "./freeSpot";
import { withGridRoutes } from "./walkingGrid";
import { parseEventConfig, trackOf, type Spot } from "./event";
import {
  chronologicalTransitions,
  evaluateTransition,
  indexSpots,
  optimalPlan,
  planOptions,
  incompatiblePairs,
  mostLimitingSpot,
  spotsToDrop,
  stayPutOption,
  planWalkingPaths,
  walkBetween,
  walkBetweenSpots,
} from "./itinerary";
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

  it("sur le semi à 5:30, fait au moins aussi bien que rester sur place (4 passages)", () => {
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

describe("trajets réels (walkingRoutes)", () => {
  const a = spot("a", 0);
  const b = spot("b", 1);

  it("utilise la distance à pied réelle quand elle est connue", () => {
    const leg = walkBetweenSpots(a, b, walking, { "a>b": 2.25 });
    expect(leg.source).toBe("route");
    expect(leg.walkKm).toBe(2.25);
    expect(leg.minutes).toBeCloseTo(30); // 2,25 km à 4,5 km/h
    expect(leg.directKm).toBeCloseTo(1, 2);
  });

  it("retombe sur l'estimation à vol d'oiseau sinon", () => {
    const leg = walkBetweenSpots(a, b, walking, { "b>a": 2.25 });
    expect(leg.source).toBe("estimate");
    expect(leg.walkKm).toBeCloseTo(1.3, 2);
  });

  it("une route plus longue peut rendre une transition impossible", () => {
    const spots = indexSpots([a, b]);
    expect(evaluateTransition(passage("a", 0), passage("b", 23), spots, walking).status).toBe("ok");
    expect(evaluateTransition(passage("a", 0), passage("b", 23), spots, walking, { "a>b": 2.25 }).status).toBe("impossible");
  });
});

/** Marche minimale pour voir exactement k passages (recherche exhaustive). */
function bruteForceMinWalk(passages: Passage[], spots: Spot[], k: number): number {
  const byId = indexSpots(spots);
  const sorted = [...passages].sort((x, y) => x.estimatedMinutes - y.estimatedMinutes);
  let best = Infinity;
  const go = (i: number, count: number, walked: number) => {
    if (count === k) return void (best = Math.min(best, walked));
    for (let j = i + 1; j < sorted.length; j++) {
      const t = evaluateTransition(sorted[i], sorted[j], byId, walking);
      if (t.status === "ok") go(j, count + 1, walked + t.walk.walkKm);
    }
  };
  sorted.forEach((_, i) => go(i, 1, 0));
  return best;
}

describe("planOptions (compromis passages ↔ marche)", () => {
  it("chaque option voit plus de passages que la précédente, en marchant plus", () => {
    const config = parseEventConfig(rawEvent);
    const semi = config.races[0];
    const passages = computeAllPassages(semi, 5.5, config.settings.margin);
    const options = planOptions(passages, semi.spots, config.settings.walking, semi.walkingRoutes?.km);
    expect(options.length).toBeGreaterThan(1);
    for (let i = 1; i < options.length; i++) {
      expect(options[i].steps.length).toBeGreaterThan(options[i - 1].steps.length);
      expect(options[i].totalWalkKm).toBeGreaterThan(options[i - 1].totalWalkKm);
    }
    // La dernière option = le maximum de optimalPlan.
    expect(options.at(-1)!.steps.length).toBe(optimalPlan(passages, semi.spots, config.settings.walking, semi.walkingRoutes?.km).steps.length);
  });

  it("sur le semi, « sans bouger » = départ puis 3 passages au ravito du virage (140 m à pied)", () => {
    const config = parseEventConfig(rawEvent);
    const semi = config.races[0];
    const passages = computeAllPassages(semi, 5.5, config.settings.margin);
    const stay = stayPutOption(planOptions(passages, semi.spots, config.settings.walking, semi.walkingRoutes?.km))!;
    expect(stay.steps.map((p) => p.spotId)).toEqual(["depart", "ravito-virage", "ravito-virage", "ravito-virage"]);
    expect(stay.totalWalkKm).toBeLessThanOrEqual(0.2);
  });

  it("meilleur parcours : 7 passages entre départ, ravito sud et ravito du virage, moins de 2 km à pied", () => {
    const config = parseEventConfig(rawEvent);
    const semi = config.races[0];
    const passages = computeAllPassages(semi, 5.5, config.settings.margin);
    const best = planOptions(passages, semi.spots, config.settings.walking, semi.walkingRoutes?.km).at(-1)!;
    expect(best.steps).toHaveLength(7);
    expect(new Set(best.steps.map((p) => p.spotId))).toEqual(new Set(["depart", "ravito-sud", "ravito-virage"]));
    expect(best.totalWalkKm).toBeLessThan(2);
  });

  it("donne la marche minimale exacte pour chaque nombre de passages (cas aléatoires)", () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let run = 0; run < 25; run++) {
      const spots = ["a", "b", "c", "d"].map((id) => spot(id, rand() * 1.5));
      const passages = Array.from({ length: 9 }, () => passage(spots[Math.floor(rand() * 4)].id, Math.round(rand() * 120)));
      for (const option of planOptions(passages, spots, walking)) {
        expect(option.totalWalkKm).toBeCloseTo(bruteForceMinWalk(passages, spots, option.steps.length), 6);
        expect(option.transitions).toHaveLength(option.steps.length - 1);
      }
    }
  });
});

/**
 * Le semi + des points libres aux km des anciennes rues (1 ; 4 ; 5,2 ; 6,5),
 * avec les distances à pied de la grille : de quoi tester des combinaisons
 * variées sur le vrai parcours.
 */
function semiAvecPoints() {
  const config = parseEventConfig(rawEvent);
  const base = config.races[0];
  const track = trackOf(base);
  const points = (
    [
      ["rue-marius-hue", 1],
      ["rue-des-champs", 4],
      ["rue-des-sources-prolongee", 5.2],
      ["rue-des-hautes-bievres", 6.5],
    ] as const
  ).map(([id, km]) => freeSpotToSpot({ id, raceId: base.id, kmInLoop: km }, track, base));
  const spots = [...base.spots, ...points];
  const semi = { ...base, spots };
  return {
    config,
    semi,
    passages: computeAllPassages(semi, 5.5, config.settings.margin),
    routes: withGridRoutes(base.walkingRoutes?.km, spots, base.walkingGrid),
  };
}

describe("planOptions avec spots choisis", () => {
  const { config, semi, passages, routes } = semiAvecPoints();

  it("ravito du virage + rue des Hautes Bièvres : chaque option passe par les deux spots, et seulement eux", () => {
    const options = planOptions(passages, semi.spots, config.settings.walking, routes, ["ravito-virage", "rue-des-hautes-bievres"]);
    expect(options.length).toBeGreaterThan(0);
    for (const o of options) {
      const ids = new Set(o.steps.map((p) => p.spotId));
      expect(ids).toEqual(new Set(["ravito-virage", "rue-des-hautes-bievres"]));
      expect(o.transitions.every((t) => t.status === "ok")).toBe(true);
    }
  });

  it("un seul spot choisi : tous ses passages, sans bouger", () => {
    const [only] = planOptions(passages, semi.spots, config.settings.walking, routes, ["rue-des-champs"]);
    expect(only.steps).toHaveLength(3);
    expect(only.totalWalkKm).toBe(0);
  });

  it("spots incompatibles : aucune option", () => {
    const spots = [spot("a", 0), spot("b", 3)];
    // b n'est atteignable depuis a dans aucun ordre (trop loin, trop peu de temps).
    const tight = [passage("a", 0), passage("b", 5), passage("a", 10)];
    expect(planOptions(tight, spots, walking, undefined, ["a", "b"])).toEqual([]);
  });

  it("égale l'optimum exhaustif avec contrainte (cas aléatoires)", () => {
    let seed = 11;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let run = 0; run < 25; run++) {
      const spots = ["a", "b", "c", "d"].map((id) => spot(id, rand() * 1.5));
      const all = Array.from({ length: 9 }, () => passage(spots[Math.floor(rand() * 4)].id, Math.round(rand() * 120)));
      const required = ["a", "c"];
      const pool = all.filter((p) => required.includes(p.spotId));
      const options = planOptions(all, spots, walking, undefined, required);
      // Référence : meilleure chaîne exhaustive passant par a ET c.
      const byId = indexSpots(spots);
      const sorted = [...pool].sort((x, y) => x.estimatedMinutes - y.estimatedMinutes);
      const bestFor = new Map<number, number>();
      const go = (i: number, count: number, walked: number, seen: Set<string>) => {
        if (required.every((r) => seen.has(r))) bestFor.set(count, Math.min(bestFor.get(count) ?? Infinity, walked));
        for (let j = i + 1; j < sorted.length; j++) {
          const t = evaluateTransition(sorted[i], sorted[j], byId, walking);
          if (t.status === "ok") go(j, count + 1, walked + t.walk.walkKm, new Set([...seen, sorted[j].spotId]));
        }
      };
      sorted.forEach((p, i) => go(i, 1, 0, new Set([p.spotId])));
      for (const o of options) expect(o.totalWalkKm).toBeCloseTo(bestFor.get(o.steps.length)!, 6);
      if (bestFor.size === 0) expect(options).toEqual([]);
      else expect(options.at(-1)!.steps.length).toBe(Math.max(...bestFor.keys()));
    }
  });
});

describe("incompatiblePairs", () => {
  const { config, semi, passages, routes } = semiAvecPoints();
  const w = config.settings.walking;

  it("ravito du virage + rue des Sources Prolongée : compatibles", () => {
    expect(incompatiblePairs(passages, semi.spots, w, ["ravito-virage", "rue-des-sources-prolongee"], routes)).toEqual([]);
    const options = planOptions(passages, semi.spots, w, routes, ["ravito-virage", "rue-des-sources-prolongee"]);
    expect(options.length).toBeGreaterThan(0);
  });

  it("ravito du virage + rue des Hautes Bièvres : compatibles", () => {
    expect(incompatiblePairs(passages, semi.spots, w, ["ravito-virage", "rue-des-hautes-bievres"], routes)).toEqual([]);
  });

  it("spots trop éloignés à pied : paire incompatible, spot à décocher désigné", () => {
    const spots = [spot("a", 0), spot("b", 3), spot("c", 0.1)];
    const ps = [passage("a", 0), passage("b", 10), passage("c", 15), passage("a", 20), passage("b", 30)];
    const pairs = incompatiblePairs(ps, spots, walking, ["a", "b", "c"]);
    expect(pairs).toEqual([
      ["a", "b"],
      ["b", "c"],
    ]);
    expect(mostLimitingSpot(pairs)).toBe("b");
    expect(mostLimitingSpot([])).toBeNull();
  });
});

describe("spotsToDrop", () => {
  const { config, semi, passages, routes } = semiAvecPoints();
  const w = config.settings.walking;

  it("sélection possible : rien à décocher", () => {
    expect(spotsToDrop(passages, semi.spots, w, ["ravito-virage", "rue-des-sources-prolongee"], routes)).toEqual([]);
  });

  it("sélection impossible : propose les spots dont le retrait suffit", () => {
    // Marius Hue (km 1) puis le ravito sud (km 2,37) : 1,4 km de marche pour 1,4 km de course.
    const chosen = ["rue-marius-hue", "ravito-sud", "rue-des-champs", "rue-des-sources-prolongee"];
    expect(planOptions(passages, semi.spots, w, routes, chosen)).toEqual([]);
    const drop = spotsToDrop(passages, semi.spots, w, chosen, routes);
    expect(drop.length).toBeGreaterThan(0);
    for (const id of drop) {
      expect(planOptions(passages, semi.spots, w, routes, chosen.filter((x) => x !== id)).length).toBeGreaterThan(0);
    }
  });
});

describe("trajets depuis le départ (retour utilisateur)", () => {
  const { config, semi, passages, routes } = semiAvecPoints();
  const w = config.settings.walking;
  const byId = indexSpots(semi.spots);
  const depart = passages.find((p) => p.spotId === "depart" && p.kind === "start")!;

  it("depuis le départ, on arrive avant la fourchette du 1er passage de chaque spot, sauf la rue Marius Hue", () => {
    const reachable = semi.spots
      .filter((s) => s.id !== "depart")
      .filter((s) => {
        const first = passages.find((p) => p.spotId === s.id)!;
        return evaluateTransition(depart, first, byId, w, routes).slackMinutes >= 0;
      })
      .map((s) => s.id);
    expect(reachable.sort()).toEqual(["ravito-sud", "ravito-virage", "rue-des-champs", "rue-des-hautes-bievres", "rue-des-sources-prolongee"]);
  });

  it("rue des Champs est « juste » : écartée des meilleurs plans, acceptée quand l'utilisateur l'impose", () => {
    const chosen = ["depart", "rue-des-champs"];
    const champs = passages.find((p) => p.spotId === "rue-des-champs")!;
    expect(evaluateTransition(depart, champs, byId, w, routes).status).toBe("tight");
    const strict = planOptions(passages, semi.spots, w, routes, chosen).at(-1)!;
    const tolerant = planOptions(passages, semi.spots, w, routes, chosen, true).at(-1)!;
    expect(strict.steps).not.toContain(champs);
    expect(tolerant.steps.slice(0, 2)).toEqual([depart, champs]);
    expect(tolerant.steps.length).toBeGreaterThan(strict.steps.length);
    expect(tolerant.transitions[0].status).toBe("tight");
  });

  it("le ravito du virage se combine avec n'importe quel autre spot (la rue Marius Hue au tour suivant)", () => {
    for (const s of semi.spots.filter((x) => x.id !== "ravito-virage")) {
      expect(incompatiblePairs(passages, semi.spots, w, ["ravito-virage", s.id], routes)).toEqual([]);
    }
  });
});

describe("planWalkingPaths", () => {
  const config = parseEventConfig(rawEvent);
  const semi = config.races[0];
  const passages = computeAllPassages(semi, 5.5, config.settings.margin);
  const plan = planOptions(passages, semi.spots, config.settings.walking, semi.walkingRoutes?.km).at(-1)!;

  it("trace une seule fois chaque trajet (départ → ravito sud, ravito sud ↔ ravito du virage), par les rues", () => {
    const paths = planWalkingPaths(plan, semi.spots, semi.walkingRoutes?.paths);
    expect(paths).toHaveLength(2);
    for (const path of paths) expect(path.length).toBeGreaterThan(5); // chemin réel, pas une ligne droite
  });

  it("repli en ligne droite si le tracé est inconnu", () => {
    const paths = planWalkingPaths(plan, semi.spots, {});
    const at = (id: string) => {
      const sp = semi.spots.find((x) => x.id === id)!;
      return [sp.lat, sp.lng];
    };
    expect(paths).toEqual([
      [at("depart"), at("ravito-sud")],
      [at("ravito-sud"), at("ravito-virage")],
    ]);
  });
});
