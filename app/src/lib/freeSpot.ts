// Points libres : un endroit du parcours choisi en touchant la carte. Le
// point est ramené sur le tracé (km dans la boucle), devient un spot comme
// les autres (passages à chaque boucle) ; la marche depuis / vers les autres
// spots vient de la grille de distances à pied (src/lib/walkingGrid.ts), à
// 100 m près. Fonctions pures, testées.

import type { LatLng, Race, Spot } from "./event";
import { cumulativeDistancesKm, haversineDistanceKm, pointAtDistance, projectPointOntoRoute, routeLengthKm } from "./geo.ts";

/** Au-delà, le point touché est jugé trop loin du parcours (km). */
export const MAX_OFF_ROUTE_KM = 0.15;
/** Préfixe des identifiants de points libres. */
export const FREE_SPOT_PREFIX = "libre-";

/** Ce qui est gardé sur l'appareil pour un point libre. */
export interface FreeSpotData {
  id: string;
  raceId: string;
  /** Position sur le tracé (km dans la boucle, à l'échelle officielle). */
  kmInLoop: number;
  /**
   * Tous les passages (km) quand le tracé est le parcours entier et repasse
   * par ce point (ex. deux boucles différentes) ; sinon déduits des boucles.
   */
  km?: number[];
}

export interface CoursePoint {
  lat: number;
  lng: number;
  kmInLoop: number;
  /** Positions (km depuis le départ) où le coureur passe à ce point. */
  km: number[];
}

type RaceShape = Pick<Race, "loops" | "loopLengthKm" | "distanceKm">;

const officialLoopKm = (race: RaceShape) => (race.loops > 1 ? race.loopLengthKm : race.distanceKm);
const round2 = (x: number) => Math.round(x * 100) / 100;

/** Km de passage d'un point situé à `kmInLoop` dans la boucle, à chaque boucle. */
export function passageKms(kmInLoop: number, race: RaceShape): number[] {
  const loop = officialLoopKm(race);
  const kms: number[] = [];
  for (let i = 0; i < Math.max(1, race.loops); i++) {
    const km = round2(kmInLoop + i * loop);
    if (km <= race.distanceKm + 1e-9) kms.push(km);
  }
  return kms;
}

/**
 * Point du parcours le plus proche de l'endroit touché, ou null s'il est à
 * plus de `maxOffKm` du tracé. Le tracé ne contient qu'une boucle (GPX), mis
 * à l'échelle de la longueur officielle.
 */
export function coursePointAt(track: LatLng[], race: RaceShape, target: LatLng, maxOffKm = MAX_OFF_ROUTE_KM): CoursePoint | null {
  if (track.length < 2) return null;
  const proj = projectPointOntoRoute(track, target);
  if (proj.distanceFromRouteKm > maxOffKm) return null;
  const trackKm = routeLengthKm(track);
  const kmInLoop = round2((proj.distanceAlongRouteKm * officialLoopKm(race)) / trackKm);
  const point = pointOf(track, race, kmInLoop);
  // Boucles identiques : un passage par boucle. Parcours entier : tous les
  // endroits du tracé qui repassent par ce point.
  const km = race.loops > 1 ? passageKms(kmInLoop, race) : passagesThrough(track, race, point);
  return { ...point, kmInLoop, km: km.length ? km : [kmInLoop] };
}

/**
 * Km (officiels) de chaque passage du tracé à moins de `radiusKm` du point,
 * un par passage (passages séparés d'au moins 0,5 km sur le parcours).
 */
export function passagesThrough(track: LatLng[], race: RaceShape, point: LatLng, radiusKm = 0.04): number[] {
  const cum = cumulativeDistancesKm(track);
  const scale = officialLoopKm(race) / cum[cum.length - 1];
  const runs: Array<{ km: number; d: number }> = [];
  // Échantillonnage tous les 10 m le long du tracé.
  for (let d = 0, i = 0; d <= cum[cum.length - 1]; d += 0.01) {
    while (i < track.length - 2 && cum[i + 1] < d) i++;
    const seg = cum[i + 1] - cum[i];
    const t = seg === 0 ? 0 : Math.min(1, (d - cum[i]) / seg);
    const p = { lat: track[i].lat + (track[i + 1].lat - track[i].lat) * t, lng: track[i].lng + (track[i + 1].lng - track[i].lng) * t };
    const dist = haversineDistanceKm(p, point);
    if (dist > radiusKm) continue;
    const last = runs.at(-1);
    if (last && d * scale - last.km < 0.5) {
      if (dist < last.d) Object.assign(last, { km: d * scale, d: dist });
    } else runs.push({ km: d * scale, d: dist });
  }
  return runs.map((r) => round2(r.km));
}

function pointOf(track: LatLng[], race: RaceShape, kmInLoop: number): LatLng {
  const p = pointAtDistance(track, (kmInLoop * routeLengthKm(track)) / officialLoopKm(race));
  return { lat: p.lat, lng: p.lng };
}

/** « 3,4 » */
const kmFr = (km: number) => Number(km.toFixed(1)).toLocaleString("fr-FR");

/** Spot complet d'un point libre (nom, phrases, passages). */
export function freeSpotToSpot(data: FreeSpotData, track: LatLng[], race: RaceShape): Spot {
  const p = pointOf(track, race, data.kmInLoop);
  const km = kmFr(data.kmInLoop);
  return {
    id: data.id,
    name: `Ton point du km ${km}`,
    shortName: `Km ${km}`,
    where: `au km ${km}`,
    address: "Point choisi sur la carte",
    lat: p.lat,
    lng: p.lng,
    access: "Distances à pied calculées par les rues, à 100 m près : garde un peu de marge.",
    description: "Ton point à toi, choisi sur la carte.",
    km: data.km ?? passageKms(data.kmInLoop, race),
    free: true,
  };
}

export const isFreeSpotId = (id: string) => id.startsWith(FREE_SPOT_PREFIX);

/** Libellé court d'un point pour les phrases (« Km 3,4 »). */
export const coursePointLabel = (kmInLoop: number) => `Km ${kmFr(kmInLoop)}`;

/**
 * Pour un pointage à `minutes` en un point du parcours vu à plusieurs
 * boucles : le passage dont l'heure prévue est la plus proche.
 */
export function nearestPassageKm(kms: number[], minutes: number, startMinutes: number, paceMinPerKm: number): number | null {
  let best: number | null = null;
  for (const km of kms) {
    if (best === null || Math.abs(startMinutes + km * paceMinPerKm - minutes) < Math.abs(startMinutes + best * paceMinPerKm - minutes)) best = km;
  }
  return best;
}
