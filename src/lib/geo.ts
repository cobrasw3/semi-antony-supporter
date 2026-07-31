// Géométrie pure sur des tracés lat/lng : distances, longueur de parcours,
// projection d'un point sur le tracé (pour caler un point d'observation),
// et découpage d'un tracé multi-boucles en boucles individuelles.
//
// Fonctions pures uniquement, réutilisées à la fois par l'app (mode
// calibrage sur la carte) et par le script CLI d'import GPX/KML
// (scripts/import-track.ts), qui exécute ce fichier directement via le
// support TypeScript natif de Node — pas de syntaxe avancée (enums,
// namespaces) ici pour rester compatible avec ça.

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distance à vol d'oiseau entre deux points (formule de Haversine), en km. */
export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Distance cumulée (km) depuis le premier point jusqu'à chaque point du tracé. */
export function cumulativeDistancesKm(points: LatLng[]): number[] {
  const result: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    result.push(result[i - 1] + haversineDistanceKm(points[i - 1], points[i]));
  }
  return result;
}

/** Longueur totale d'un tracé (somme des segments), en km. */
export function routeLengthKm(points: LatLng[]): number {
  if (points.length < 2) return 0;
  const cumulative = cumulativeDistancesKm(points);
  return cumulative[cumulative.length - 1];
}

export interface RouteProjection {
  /** Distance le long du tracé (depuis le premier point) jusqu'à la projection, en km. */
  distanceAlongRouteKm: number;
  /** Distance entre le point cible et sa projection sur le tracé, en km (indicateur de fiabilité). */
  distanceFromRouteKm: number;
  /** Index du segment [i, i+1] du tracé sur lequel tombe la projection. */
  segmentIndex: number;
}

/**
 * Projette un point (ex: cliqué sur la carte) sur le tracé le plus proche,
 * et renvoie à quelle distance-le-long-du-parcours ça correspond. Sert à
 * caler la `distanceInLoopKm` d'un point d'observation à partir du vrai
 * tracé plutôt qu'à l'estimer à l'œil.
 *
 * Approximation : les coordonnées sont traitées comme un plan localement
 * plat (conversion degrés -> km via un facteur de latitude constant), ce
 * qui est largement suffisant à l'échelle d'un tracé de quelques km.
 */
export function projectPointOntoRoute(points: LatLng[], target: LatLng): RouteProjection {
  if (points.length < 2) {
    return { distanceAlongRouteKm: 0, distanceFromRouteKm: 0, segmentIndex: 0 };
  }

  const cumulative = cumulativeDistancesKm(points);
  const kmPerDegLat = 111.32;
  const kmPerDegLng = 111.32 * Math.cos(toRadians(target.lat));

  const toPlaneKm = (p: LatLng) => ({
    x: (p.lng - target.lng) * kmPerDegLng,
    y: (p.lat - target.lat) * kmPerDegLat,
  });

  let best: RouteProjection = {
    distanceAlongRouteKm: 0,
    distanceFromRouteKm: Infinity,
    segmentIndex: 0,
  };

  for (let i = 0; i < points.length - 1; i++) {
    const a = toPlaneKm(points[i]);
    const b = toPlaneKm(points[i + 1]);
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const segLenSq = abx * abx + aby * aby;

    // t = position de la projection sur le segment [a, b], bornée à [0, 1].
    const t = segLenSq === 0 ? 0 : Math.min(1, Math.max(0, (-a.x * abx + -a.y * aby) / segLenSq));

    const projX = a.x + t * abx;
    const projY = a.y + t * aby;
    const distFromRoute = Math.sqrt(projX * projX + projY * projY);

    if (distFromRoute < best.distanceFromRouteKm) {
      const segmentLengthKm = cumulative[i + 1] - cumulative[i];
      best = {
        distanceAlongRouteKm: cumulative[i] + t * segmentLengthKm,
        distanceFromRouteKm: distFromRoute,
        segmentIndex: i,
      };
    }
  }

  return best;
}

/**
 * Découpe un tracé qui contient plusieurs boucles identiques bout à bout
 * (ex: un GPX exporté avec les 3 tours) en `loopCount` tracés individuels,
 * en coupant par distance cumulée (pas par nombre de points, qui peut être
 * irrégulier selon la fréquence d'enregistrement GPS).
 */
export function splitIntoEqualLoops(points: LatLng[], loopCount: number): LatLng[][] {
  if (loopCount <= 1) return [points];

  const cumulative = cumulativeDistancesKm(points);
  const total = cumulative[cumulative.length - 1];
  const loopLength = total / loopCount;

  const loops: LatLng[][] = [];
  for (let loopIndex = 0; loopIndex < loopCount; loopIndex++) {
    const startKm = loopIndex * loopLength;
    const endKm = (loopIndex + 1) * loopLength;
    const loopPoints = points.filter((_, i) => cumulative[i] >= startKm - 1e-9 && cumulative[i] <= endKm + 1e-9);
    loops.push(loopPoints);
  }
  return loops;
}

/**
 * Estime combien de fois un tracé répète une boucle de longueur connue
 * (ex: pour distinguer un GPX d'1 seule boucle de 7 km d'un GPX des 3
 * boucles à 21 km). Arrondit au nombre de boucles le plus proche.
 */
export function detectLoopCount(points: LatLng[], expectedLoopLengthKm: number): number {
  const total = routeLengthKm(points);
  if (expectedLoopLengthKm <= 0) return 1;
  return Math.max(1, Math.round(total / expectedLoopLengthKm));
}
