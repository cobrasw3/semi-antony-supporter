// Définition géométrique du parcours : la boucle de base + les métadonnées
// qui en découlent (nombre de boucles, distance totale).
//
// ⚠️ PLACEHOLDER : les coordonnées ci-dessous ne représentent PAS le vrai
// parcours du semi d'Antony. C'est une forme arbitraire (en boucle fermée)
// centrée approximativement sur le Stade Georges Suant, uniquement pour
// avoir quelque chose à afficher sur la carte avant d'avoir le GPX réel.
// Remplacer PLACEHOLDER_LOOP_POINTS par le tracé réel dès qu'il est
// disponible (via createLoopFromPoints, voir plus bas).

export interface LatLng {
  lat: number;
  lng: number;
}

/** Nombre de boucles du parcours. */
export const LOOP_COUNT = 3;

/** Longueur d'une boucle, en kilomètres. */
export const LOOP_LENGTH_KM = 7;

/** Distance totale du parcours (somme des boucles), en kilomètres. */
export const TOTAL_DISTANCE_KM = LOOP_COUNT * LOOP_LENGTH_KM;

/**
 * Construit une boucle (tableau de LatLng) à partir d'un tableau de tuples
 * [lat, lng] — le format le plus courant en sortie d'export GPX / outils de
 * tracé. Permet de remplacer facilement le tracé placeholder par le vrai
 * parcours : `export const LOOP_POINTS = createLoopFromPoints([[48.75, 2.29], ...])`.
 */
export function createLoopFromPoints(points: Array<[number, number]>): LatLng[] {
  return points.map(([lat, lng]) => ({ lat, lng }));
}

const STADE_LAT = 48.753;
const STADE_LNG = 2.297;

// Approximation locale : à cette latitude, 1 km ≈ 0.009° en latitude et
// ≈ 0.0137° en longitude. Sert uniquement à dessiner la forme placeholder.
const KM_LAT = 0.009;
const KM_LNG = 0.0137;

/**
 * Tracé placeholder d'une boucle, en boucle fermée (le dernier point revient
 * au premier). À remplacer par le vrai tracé du semi d'Antony.
 */
export const PLACEHOLDER_LOOP_POINTS: Array<[number, number]> = [
  [STADE_LAT, STADE_LNG],
  [STADE_LAT + 0.3 * KM_LAT, STADE_LNG + 1.0 * KM_LNG],
  [STADE_LAT + 1.0 * KM_LAT, STADE_LNG + 1.3 * KM_LNG],
  [STADE_LAT + 1.8 * KM_LAT, STADE_LNG + 1.0 * KM_LNG],
  [STADE_LAT + 2.2 * KM_LAT, STADE_LNG + 0.3 * KM_LNG],
  [STADE_LAT + 2.2 * KM_LAT, STADE_LNG - 0.5 * KM_LNG],
  [STADE_LAT + 1.6 * KM_LAT, STADE_LNG - 1.1 * KM_LNG],
  [STADE_LAT + 0.8 * KM_LAT, STADE_LNG - 1.2 * KM_LNG],
  [STADE_LAT + 0.2 * KM_LAT, STADE_LNG - 0.6 * KM_LNG],
  [STADE_LAT, STADE_LNG],
];

export const LOOP_POINTS: LatLng[] = createLoopFromPoints(PLACEHOLDER_LOOP_POINTS);
