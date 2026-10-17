// Itinéraire du supporter : temps de marche entre spots, faisabilité de
// chaque transition, et plan optimal (voir le coureur le plus de fois).
// Fonctions pures, testées.

import type { LatLng, Spot, WalkingConfig } from "./event";
import { haversineDistanceKm } from "./geo";
import type { Passage } from "./timing";

export interface WalkLeg {
  /** Distance à vol d'oiseau, en km. */
  directKm: number;
  /** Distance à pied, en km (itinéraire réel, ou estimation). */
  walkKm: number;
  /** Durée de marche, en minutes (à la vitesse de marche configurée). */
  minutes: number;
  /** « route » : itinéraire piéton réel ; « estimate » : vol d'oiseau × détour. */
  source: "route" | "estimate";
}

/** Distances à pied réelles entre spots (km), clé « idDépart>idArrivée ». */
export type WalkingRoutes = Record<string, number>;

/** Estimation à vol d'oiseau × facteur de détour (ex. depuis la position de l'utilisateur). */
export function walkBetween(a: LatLng, b: LatLng, walking: WalkingConfig): WalkLeg {
  const directKm = haversineDistanceKm(a, b);
  const walkKm = directKm * walking.detourFactor;
  return { directKm, walkKm, minutes: (walkKm / walking.speedKmh) * 60, source: "estimate" };
}

/** Trajet entre deux spots : itinéraire réel s'il est connu, sinon estimation. */
export function walkBetweenSpots(
  from: Pick<Spot, "id" | "lat" | "lng">,
  to: Pick<Spot, "id" | "lat" | "lng">,
  walking: WalkingConfig,
  routes?: WalkingRoutes
): WalkLeg {
  const routeKm = routes?.[`${from.id}>${to.id}`];
  if (routeKm === undefined) return walkBetween(from, to, walking);
  return {
    directKm: haversineDistanceKm(from, to),
    walkKm: routeKm,
    minutes: (routeKm / walking.speedKmh) * 60,
    source: "route",
  };
}

/**
 * ✅ ok : on arrive avant le début de la fourchette suivante, avec la marge de sécurité.
 * ⚠️ tight : on arrive avant l'heure estimée, mais sans cette marge.
 * ❌ impossible : on arrive après l'heure estimée.
 */
export type TransitionStatus = "ok" | "tight" | "impossible";

export interface Transition {
  from: Passage;
  to: Passage;
  sameSpot: boolean;
  walk: WalkLeg;
  /** Heure d'arrivée au spot suivant, en minutes depuis minuit. */
  arrivalMinutes: number;
  /** Avance sur le début de la fourchette suivante (négatif = en retard), en minutes. */
  slackMinutes: number;
  status: TransitionStatus;
}

/**
 * On part dès que le coureur est passé (heure estimée du passage `from`) :
 * s'il est en avance ou en retard, il le sera aussi au spot suivant, donc
 * le calcul relatif reste valable.
 */
export function evaluateTransition(
  from: Passage,
  to: Passage,
  spotsById: Record<string, Pick<Spot, "lat" | "lng">>,
  walking: WalkingConfig,
  routes?: WalkingRoutes
): Transition {
  const sameSpot = from.spotId === to.spotId;
  const walk: WalkLeg = sameSpot
    ? { directKm: 0, walkKm: 0, minutes: 0, source: "route" }
    : walkBetweenSpots(
        { id: from.spotId, ...spotsById[from.spotId] },
        { id: to.spotId, ...spotsById[to.spotId] },
        walking,
        routes
      );
  const arrivalMinutes = from.estimatedMinutes + walk.minutes;
  const slackMinutes = to.windowStartMinutes - arrivalMinutes;
  const status: TransitionStatus =
    slackMinutes >= walking.safetyMarginMinutes ? "ok" : arrivalMinutes <= to.estimatedMinutes ? "tight" : "impossible";
  return { from, to, sameSpot, walk, arrivalMinutes, slackMinutes, status };
}

export function indexSpots<T extends { id: string }>(spots: T[]): Record<string, T> {
  return Object.fromEntries(spots.map((s) => [s.id, s]));
}

/** Transitions entre passages consécutifs de la liste chronologique. */
export function chronologicalTransitions(
  passages: Passage[],
  spots: Spot[],
  walking: WalkingConfig,
  routes?: WalkingRoutes
): Transition[] {
  const byId = indexSpots(spots);
  return passages.slice(1).map((to, i) => evaluateTransition(passages[i], to, byId, walking, routes));
}

export interface Plan {
  steps: Passage[];
  transitions: Transition[];
  totalWalkKm: number;
}

/**
 * Plan optimal : les passages triés par heure forment un graphe orienté
 * acyclique (on ne remonte pas le temps) ; une arête i → j existe si la
 * transition est ✅. Programmation dynamique : pour chaque passage, la plus
 * longue chaîne qui s'y termine (à égalité, celle qui marche le moins).
 */
export function optimalPlan(passages: Passage[], spots: Spot[], walking: WalkingConfig, routes?: WalkingRoutes): Plan {
  if (passages.length === 0) return { steps: [], transitions: [], totalWalkKm: 0 };
  const byId = indexSpots(spots);
  const sorted = [...passages].sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
  const n = sorted.length;
  const count = new Array<number>(n).fill(1);
  const walked = new Array<number>(n).fill(0);
  const prev = new Array<number>(n).fill(-1);
  const edge: Array<Transition | null> = new Array(n).fill(null);

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < j; i++) {
      const t = evaluateTransition(sorted[i], sorted[j], byId, walking, routes);
      if (t.status !== "ok") continue;
      const c = count[i] + 1;
      const w = walked[i] + t.walk.walkKm;
      if (c > count[j] || (c === count[j] && w < walked[j])) {
        count[j] = c;
        walked[j] = w;
        prev[j] = i;
        edge[j] = t;
      }
    }
  }

  let best = 0;
  for (let j = 1; j < n; j++) {
    if (count[j] > count[best] || (count[j] === count[best] && walked[j] < walked[best])) best = j;
  }

  const steps: Passage[] = [];
  const transitions: Transition[] = [];
  for (let j = best; j !== -1; j = prev[j]) {
    steps.unshift(sorted[j]);
    if (edge[j]) transitions.unshift(edge[j]!);
  }
  return { steps, transitions, totalWalkKm: walked[best] };
}

/**
 * Compromis « nombre de passages ↔ marche » : pour chaque nombre de passages
 * atteignable, le plan qui demande le MOINS de marche ; on ne garde que les
 * options utiles (on n'affiche pas « 5 fois en marchant 2 km » si « 6 fois en
 * marchant 2 km » existe). La première option est souvent « sans bouger ».
 *
 * Programmation dynamique sur le même graphe que optimalPlan :
 * best[j][k] = marche minimale pour une chaîne de k passages finissant en j.
 */
export function planOptions(passages: Passage[], spots: Spot[], walking: WalkingConfig, routes?: WalkingRoutes): Plan[] {
  if (passages.length === 0) return [];
  const byId = indexSpots(spots);
  const sorted = [...passages].sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
  const n = sorted.length;
  const best: number[][] = Array.from({ length: n }, () => new Array<number>(n + 1).fill(Infinity));
  const prev: number[][] = Array.from({ length: n }, () => new Array<number>(n + 1).fill(-1));
  const edges: Array<Array<Transition | null>> = Array.from({ length: n }, () => new Array(n).fill(null));

  for (let j = 0; j < n; j++) {
    best[j][1] = 0;
    for (let i = 0; i < j; i++) {
      const t = evaluateTransition(sorted[i], sorted[j], byId, walking, routes);
      if (t.status !== "ok") continue;
      edges[i][j] = t;
      for (let k = 2; k <= j + 1; k++) {
        const w = best[i][k - 1] + t.walk.walkKm;
        if (w < best[j][k] - 1e-9) {
          best[j][k] = w;
          prev[j][k] = i;
        }
      }
    }
  }

  // Meilleure fin de chaîne pour chaque nombre de passages k.
  const options: Plan[] = [];
  let minWalkAbove = Infinity;
  for (let k = n; k >= 1; k--) {
    let end = -1;
    for (let j = 0; j < n; j++) if (best[j][k] < (end === -1 ? Infinity : best[end][k]) - 1e-9) end = j;
    if (end === -1 || !(best[end][k] < minWalkAbove - 1e-9)) continue;
    minWalkAbove = best[end][k];
    const steps: Passage[] = [];
    const transitions: Transition[] = [];
    for (let j = end, kk = k; j !== -1; kk--) {
      steps.unshift(sorted[j]);
      const p = prev[j][kk];
      if (p !== -1) transitions.unshift(edges[p][j]!);
      j = p;
    }
    options.unshift({ steps, transitions, totalWalkKm: best[end][k] });
  }
  return options;
}
