// Position estimée du coureur (pour la frise et le point sur la carte).
// Même hypothèse que les horaires de passage : allure constante depuis le
// départ. Fonctions pures, testées.

import type { LatLng, Race } from "./event";
import { pointAtDistance, routeLengthKm } from "./geo.ts";

/**
 * Km parcourus estimés à `nowMinutes`, bornés à [0, distance].
 * null avant le départ.
 */
export function estimatedKm(nowMinutes: number, startMinutes: number, paceMinPerKm: number, distanceKm: number): number | null {
  if (nowMinutes < startMinutes || paceMinPerKm <= 0) return null;
  return Math.min(distanceKm, (nowMinutes - startMinutes) / paceMinPerKm);
}

/**
 * Point du tracé correspondant à `km` depuis le départ. Le tracé ne contient
 * qu'une boucle : on se ramène à la position dans la boucle, mise à l'échelle
 * de la longueur réelle du tracé GPX (≈ 6,97 km pour 7 km officiels).
 */
export function positionOnTrack(km: number, track: LatLng[], race: Pick<Race, "loops" | "loopLengthKm" | "distanceKm">): LatLng {
  const official = race.loops > 1 ? race.loopLengthKm : race.distanceKm;
  let inLoop = race.loops > 1 ? km % official : km;
  // L'arrivée (21,0975 km) dépasse légèrement 3 × 7 km : on reste au stade.
  if (race.loops > 1 && km >= race.loops * official) inLoop = 0;
  const p = pointAtDistance(track, (inLoop * routeLengthKm(track)) / official);
  return { lat: p.lat, lng: p.lng };
}

/** « km 8,2 » */
export function formatKmFr(km: number): string {
  return `km ${Number(km.toFixed(1)).toLocaleString("fr-FR")}`;
}
