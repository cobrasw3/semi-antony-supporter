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
 * `requiredSpots` (optionnel) : spots choisis par l'utilisateur. Le plan ne
 * passe alors QUE par ces spots, et par CHACUN d'eux au moins une fois.
 * Liste vide si c'est impossible (spots incompatibles).
 *
 * Programmation dynamique : best[j][k][m] = marche minimale pour une chaîne
 * de k passages finissant en j, ayant visité l'ensemble m de spots choisis
 * (masque de bits, au plus quelques spots).
 */
export function planOptions(
  passages: Passage[],
  spots: Spot[],
  walking: WalkingConfig,
  routes?: WalkingRoutes,
  requiredSpots: string[] = []
): Plan[] {
  const required = requiredSpots.filter((id) => spots.some((s) => s.id === id));
  const pool = required.length ? passages.filter((p) => required.includes(p.spotId)) : passages;
  if (pool.length === 0) return [];
  const byId = indexSpots(spots);
  const sorted = [...pool].sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
  const n = sorted.length;
  const bit = sorted.map((p) => (required.length ? 1 << required.indexOf(p.spotId) : 0));
  const full = required.length ? (1 << required.length) - 1 : 0;
  const masks = full + 1;
  const idx = (j: number, k: number, m: number) => (j * (n + 1) + k) * masks + m;
  const best = new Float64Array(n * (n + 1) * masks).fill(Infinity);
  const prevJ = new Int32Array(best.length).fill(-1);
  const prevM = new Int32Array(best.length).fill(-1);
  const edges: Array<Array<Transition | null>> = Array.from({ length: n }, () => new Array(n).fill(null));

  for (let j = 0; j < n; j++) {
    best[idx(j, 1, bit[j])] = 0;
    for (let i = 0; i < j; i++) {
      const t = evaluateTransition(sorted[i], sorted[j], byId, walking, routes);
      if (t.status !== "ok") continue;
      edges[i][j] = t;
      for (let k = 2; k <= j + 1; k++) {
        for (let m = 0; m < masks; m++) {
          const from = best[idx(i, k - 1, m)];
          if (from === Infinity) continue;
          const to = idx(j, k, m | bit[j]);
          const w = from + t.walk.walkKm;
          if (w < best[to] - 1e-9) {
            best[to] = w;
            prevJ[to] = i;
            prevM[to] = m;
          }
        }
      }
    }
  }

  // Meilleure fin de chaîne pour chaque nombre de passages k (tous les spots
  // choisis visités), en ne gardant que les options non dominées.
  const options: Plan[] = [];
  let minWalkAbove = Infinity;
  for (let k = n; k >= 1; k--) {
    let end = -1;
    for (let j = 0; j < n; j++) if (best[idx(j, k, full)] < (end === -1 ? Infinity : best[idx(end, k, full)]) - 1e-9) end = j;
    if (end === -1) continue;
    const walk = best[idx(end, k, full)];
    if (!(walk < minWalkAbove - 1e-9)) continue;
    minWalkAbove = walk;
    const steps: Passage[] = [];
    const transitions: Transition[] = [];
    for (let j = end, kk = k, m = full; j !== -1; kk--) {
      steps.unshift(sorted[j]);
      const at = idx(j, kk, m);
      const p = prevJ[at];
      if (p !== -1) transitions.unshift(edges[p][j]!);
      m = prevM[at];
      j = p;
    }
    options.unshift({ steps, transitions, totalWalkKm: walk });
  }
  return options;
}

/** Limite entre deux spots choisis : le coureur va plus vite que toi de A à B. */
export interface SpotPairLimit {
  fromSpotId: string;
  toSpotId: string;
  /** Temps mis par le coureur de A au passage suivant en B (le plus court constaté), en minutes. */
  runnerMinutes: number;
  /**
   * Temps dont tu disposerais au mieux pour aller de A à B : du passage en A
   * jusqu'au début de la fourchette en B, moins la marge de sécurité.
   */
  availableMinutes: number;
  /** Temps de marche de A à B, en minutes. */
  walkMinutes: number;
}

/**
 * Pour chaque paire ordonnée de spots choisis (A puis B) : peut-on voir le
 * coureur en A puis le rattraper à son PROCHAIN passage en B ? Si ce n'est
 * jamais possible (spots trop loin à pied, ou trop rapprochés sur le
 * parcours), on renvoie la limite pour l'expliquer à l'utilisateur.
 * Triées de la plus contraignante à la moins contraignante.
 */
export function spotPairLimits(
  passages: Passage[],
  spots: Spot[],
  walking: WalkingConfig,
  chosen: string[],
  routes?: WalkingRoutes
): SpotPairLimit[] {
  const byId = indexSpots(spots);
  const sorted = [...passages].sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
  const limits: SpotPairLimit[] = [];
  for (const from of chosen) {
    for (const to of chosen) {
      if (from === to || !byId[from] || !byId[to]) continue;
      let anyOk = false;
      let shortest = Infinity;
      let available = -Infinity;
      let walkMinutes = 0;
      for (const a of sorted.filter((p) => p.spotId === from)) {
        const b = sorted.find((p) => p.spotId === to && p.estimatedMinutes > a.estimatedMinutes);
        if (!b) continue;
        const t = evaluateTransition(a, b, byId, walking, routes);
        walkMinutes = t.walk.minutes;
        shortest = Math.min(shortest, b.estimatedMinutes - a.estimatedMinutes);
        available = Math.max(available, b.windowStartMinutes - a.estimatedMinutes - walking.safetyMarginMinutes);
        if (t.status === "ok") anyOk = true;
      }
      if (!anyOk && shortest !== Infinity)
        limits.push({ fromSpotId: from, toSpotId: to, runnerMinutes: shortest, availableMinutes: Math.max(0, available), walkMinutes });
    }
  }
  return limits.sort((x, y) => x.availableMinutes - x.walkMinutes - (y.availableMinutes - y.walkMinutes));
}

/** Le spot qui bloque le plus souvent (à proposer de décocher), ou null. */
export function mostLimitingSpot(limits: SpotPairLimit[]): string | null {
  const counts = new Map<string, number>();
  for (const l of limits) for (const id of [l.fromSpotId, l.toSpotId]) counts.set(id, (counts.get(id) ?? 0) + 1);
  let best: string | null = null;
  for (const [id, c] of counts) if (best === null || c > counts.get(best)!) best = id;
  return best;
}
