// Itinéraire du supporter : temps de marche entre spots, faisabilité de
// chaque transition, et plan optimal (voir le coureur le plus de fois).
// Fonctions pures, testées.

import type { LatLng, Spot, WalkingConfig } from "./event";
import { haversineDistanceKm } from "./geo";
import type { Passage } from "./timing";

export interface WalkLeg {
  /** Distance à vol d'oiseau, en km. */
  directKm: number;
  /** Distance estimée à pied (vol d'oiseau × facteur de détour), en km. */
  walkKm: number;
  /** Durée de marche estimée, en minutes. */
  minutes: number;
}

export function walkBetween(a: LatLng, b: LatLng, walking: WalkingConfig): WalkLeg {
  const directKm = haversineDistanceKm(a, b);
  const walkKm = directKm * walking.detourFactor;
  return { directKm, walkKm, minutes: (walkKm / walking.speedKmh) * 60 };
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
  walking: WalkingConfig
): Transition {
  const sameSpot = from.spotId === to.spotId;
  const walk = sameSpot
    ? { directKm: 0, walkKm: 0, minutes: 0 }
    : walkBetween(spotsById[from.spotId], spotsById[to.spotId], walking);
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
export function chronologicalTransitions(passages: Passage[], spots: Spot[], walking: WalkingConfig): Transition[] {
  const byId = indexSpots(spots);
  return passages.slice(1).map((to, i) => evaluateTransition(passages[i], to, byId, walking));
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
export function optimalPlan(passages: Passage[], spots: Spot[], walking: WalkingConfig): Plan {
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
      const t = evaluateTransition(sorted[i], sorted[j], byId, walking);
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
