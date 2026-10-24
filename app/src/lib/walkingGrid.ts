// Distances à pied par les rues pour n'importe quel point du parcours :
// chaque point est rattaché au point de la grille le plus proche (tous les
// 100 m le long de la boucle, cf. scripts/compute-walking-grid.ts).
// Fonctions pures, testées.

import type { LatLng, Spot } from "./event";
import { haversineDistanceKm } from "./geo.ts";
import type { WalkingRoutes } from "./itinerary";

export interface WalkingGrid {
  stepKm: number;
  /** Points de la grille, en [lat, lng]. */
  points: Array<[number, number]>;
  /** km[i][j] : distance à pied du point i au point j, en km. */
  km: number[][];
}

/** Index du point de grille le plus proche. */
export function nearestGridIndex(grid: WalkingGrid, p: LatLng): number {
  let best = 0;
  let bestKm = Infinity;
  grid.points.forEach(([lat, lng], i) => {
    const d = haversineDistanceKm(p, { lat, lng });
    if (d < bestKm) {
      best = i;
      bestKm = d;
    }
  });
  return best;
}

/**
 * Distance à pied entre deux endroits du parcours d'après la grille, ou
 * null s'ils tombent sur le même point de grille (trop proches : on garde
 * alors l'estimation à vol d'oiseau, plus juste à cette échelle).
 */
export function gridWalkKm(grid: WalkingGrid, a: LatLng, b: LatLng): number | null {
  const i = nearestGridIndex(grid, a);
  const j = nearestGridIndex(grid, b);
  if (i === j) return null;
  return grid.km[i]?.[j] ?? null;
}

/**
 * Distances à pied complétées pour les paires de spots sans itinéraire
 * pré-calculé (points libres) : valeur de la grille. Les itinéraires
 * exacts entre spots officiels restent prioritaires.
 */
export function withGridRoutes(routes: WalkingRoutes | undefined, spots: Spot[], grid: WalkingGrid | undefined): WalkingRoutes | undefined {
  if (!grid) return routes;
  const out: WalkingRoutes = { ...routes };
  for (const a of spots) {
    for (const b of spots) {
      const key = `${a.id}>${b.id}`;
      if (a.id === b.id || out[key] !== undefined) continue;
      const km = gridWalkKm(grid, a, b);
      if (km !== null) out[key] = km;
    }
  }
  return out;
}
