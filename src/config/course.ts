// Définition géométrique du parcours : la boucle de base + les métadonnées
// qui en découlent (nombre de boucles, distance totale).

export interface LatLng {
  lat: number;
  lng: number;
}

/** Nombre de boucles du parcours. */
export const LOOP_COUNT = 3;

/**
 * Longueur d'une boucle, en kilomètres — distance officielle confirmée par
 * l'organisateur (7 km x 3 = 21,1 km). Le tracé GPX ci-dessous mesure
 * ~6.97 km (bruit GPS habituel), volontairement pas utilisé pour ce chiffre :
 * on garde la distance officielle comme source de vérité pour les calculs
 * d'horaires.
 */
export const LOOP_LENGTH_KM = 7;

/** Distance totale du parcours (somme des boucles), en kilomètres. */
export const TOTAL_DISTANCE_KM = LOOP_COUNT * LOOP_LENGTH_KM;

/**
 * Construit une boucle (tableau de LatLng) à partir d'un tableau de tuples
 * [lat, lng] — le format le plus courant en sortie d'export GPX / outils de
 * tracé. Utilisé pour importer le tracé (voir scripts/import-track.ts).
 */
export function createLoopFromPoints(points: Array<[number, number]>): LatLng[] {
  return points.map(([lat, lng]) => ({ lat, lng }));
}

/**
 * Tracé réel d'une boucle du semi d'Antony (départ/arrivée Stade Georges
 * Suant), importé le 2026-07-31 depuis semi-marathon_Antony.gpx via
 * `node scripts/import-track.ts` — le fichier contenait les 3 boucles
 * (21,09 km), découpées automatiquement pour n'en garder qu'une seule
 * (~6.97 km, cohérent avec les 7 km officiels).
 */
export const ANTONY_LOOP_POINTS: Array<[number, number]> = [
  [48.745326, 2.285084],
  [48.746361, 2.284291],
  [48.745266, 2.283047],
  [48.743705, 2.280407],
  [48.742305, 2.277858],
  [48.740664, 2.275916],
  [48.738883, 2.275158],
  [48.738522, 2.275401],
  [48.739643, 2.278497],
  [48.740724, 2.281592],
  [48.742045, 2.285264],
  [48.743145, 2.284808],
  [48.743946, 2.286325],
  [48.744826, 2.288055],
  [48.745747, 2.290149],
  [48.746047, 2.291909],
  [48.746667, 2.292546],
  [48.747267, 2.293244],
  [48.747868, 2.293699],
  [48.748408, 2.294094],
  [48.748728, 2.294549],
  [48.748308, 2.294701],
  [48.748348, 2.295065],
  [48.748828, 2.295490],
  [48.749288, 2.296066],
  [48.749808, 2.297432],
  [48.750449, 2.297189],
  [48.750889, 2.296642],
  [48.751369, 2.295853],
  [48.751489, 2.296400],
  [48.751829, 2.296703],
  [48.752109, 2.296764],
  [48.752549, 2.296309],
  [48.753030, 2.295702],
  [48.753503, 2.294913],
  [48.754043, 2.294124],
  [48.754403, 2.293456],
  [48.754295, 2.292852],
  [48.754135, 2.292699],
  [48.754312, 2.292418],
  [48.754337, 2.291920],
  [48.754463, 2.290568],
  [48.754766, 2.289317],
  [48.755161, 2.287952],
  [48.755498, 2.286549],
  [48.755700, 2.285056],
  [48.755759, 2.284699],
  [48.753567, 2.283677],
  [48.752981, 2.284902],
  [48.752330, 2.286077],
  [48.752342, 2.286817],
  [48.752246, 2.287449],
  [48.751985, 2.288170],
  [48.751652, 2.288964],
  [48.751259, 2.289758],
  [48.750747, 2.290679],
  [48.750489, 2.291163],
  [48.751260, 2.292650],
  [48.750549, 2.293833],
  [48.749999, 2.293090],
  [48.750109, 2.291967],
  [48.749619, 2.290677],
  [48.749489, 2.290298],
  [48.749299, 2.288598],
  [48.748899, 2.286899],
  [48.748739, 2.286429],
  [48.748278, 2.285989],
  [48.747728, 2.285534],
  [48.747258, 2.285109],
  [48.746878, 2.284729],
  [48.746337, 2.284213],
];

export const LOOP_POINTS: LatLng[] = createLoopFromPoints(ANTONY_LOOP_POINTS);
