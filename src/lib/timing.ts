// Logique de calcul des horaires de passage. Fonctions pures uniquement :
// pas d'accès aux fichiers de config ici, tout est passé en paramètre pour
// rester facilement testable.

export interface MarginConfig {
  /** Part du temps écoulé appliquée comme demi-largeur de marge (ex. 0.035 = ±3,5 %). */
  percentage: number;
  /** Plancher de la demi-largeur, en minutes, même tout près du départ. */
  minMinutes: number;
}

export interface CrossingEstimate {
  /** Numéro de la boucle (1, 2, 3, ...). */
  loopIndex: number;
  /** Distance cumulée depuis le départ, en km. */
  cumulativeDistanceKm: number;
  /** Heure de passage estimée, au centre de la fenêtre ("HH:MM"). */
  estimatedTime: string;
  /** Début de la fenêtre de passage ("HH:MM"). */
  windowStart: string;
  /** Fin de la fenêtre de passage ("HH:MM"). */
  windowEnd: string;
  /** Début de fenêtre en minutes depuis minuit, pour trier facilement. */
  windowStartMinutes: number;
}

export interface PointCrossings {
  pointId: string;
  pointName: string;
  crossings: CrossingEstimate[];
}

/** Convertit "HH:MM" en minutes depuis minuit. */
export function timeStringToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatMinutesOfDay(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Convertit des minutes depuis minuit en "HH:MM" (24h, boucle après minuit), arrondi au plus proche. */
export function minutesToTimeString(totalMinutes: number): string {
  return formatMinutesOfDay(Math.round(totalMinutes));
}

/**
 * Comme minutesToTimeString, mais arrondi vers le bas — pour la borne basse
 * d'une fenêtre de passage, afin de ne jamais afficher une heure de début
 * plus tardive (donc plus rassurante à tort) que ce que le calcul donne.
 */
export function floorMinutesToTimeString(totalMinutes: number): string {
  return formatMinutesOfDay(Math.floor(totalMinutes));
}

/**
 * Comme minutesToTimeString, mais arrondi vers le haut — pour la borne
 * haute d'une fenêtre de passage, afin de ne jamais afficher une heure de
 * fin plus précoce que ce que le calcul donne.
 */
export function ceilMinutesToTimeString(totalMinutes: number): string {
  return formatMinutesOfDay(Math.ceil(totalMinutes));
}

/** Allure (min/km) à partir d'un temps visé (en minutes) sur une distance donnée. */
export function paceFromTargetTime(targetTimeMinutes: number, totalDistanceKm: number): number {
  return targetTimeMinutes / totalDistanceKm;
}

/**
 * Demi-largeur de la fenêtre de passage, en minutes : un pourcentage du
 * temps déjà écoulé, avec un plancher pour rester significative même juste
 * après le départ. Croît naturellement avec la distance parcourue (donc
 * avec le temps écoulé), sans avoir besoin de connaître la distance totale
 * du parcours — volontairement plus simple que l'ancien modèle par
 * interpolation sur la distance.
 */
export function computeMarginMinutes(elapsedMinutes: number, margin: MarginConfig): number {
  return Math.max(elapsedMinutes * margin.percentage, margin.minMinutes);
}

/**
 * Calcule, pour un point d'observation situé à `distanceInLoopKm` sur une
 * boucle, ses heures de passage estimées à chaque boucle (1..loopCount).
 */
export function computeCrossingsForPoint(params: {
  startTimeMinutes: number;
  paceMinPerKm: number;
  distanceInLoopKm: number;
  loopCount: number;
  loopLengthKm: number;
  margin: MarginConfig;
}): CrossingEstimate[] {
  const { startTimeMinutes, paceMinPerKm, distanceInLoopKm, loopCount, loopLengthKm, margin } = params;

  const crossings: CrossingEstimate[] = [];

  for (let loopIndex = 1; loopIndex <= loopCount; loopIndex++) {
    const cumulativeDistanceKm = distanceInLoopKm + (loopIndex - 1) * loopLengthKm;
    const elapsedMinutes = cumulativeDistanceKm * paceMinPerKm;
    const marginMinutes = computeMarginMinutes(elapsedMinutes, margin);

    const estimatedMinutes = startTimeMinutes + elapsedMinutes;
    const windowStartMinutes = estimatedMinutes - marginMinutes;
    const windowEndMinutes = estimatedMinutes + marginMinutes;

    crossings.push({
      loopIndex,
      cumulativeDistanceKm,
      estimatedTime: minutesToTimeString(estimatedMinutes),
      // Bornes arrondies "vers l'extérieur" (floor/ceil) : la fenêtre ne se
      // rétrécit jamais à l'arrondi, elle ne fait que s'élargir un peu plus.
      windowStart: floorMinutesToTimeString(windowStartMinutes),
      windowEnd: ceilMinutesToTimeString(windowEndMinutes),
      windowStartMinutes,
    });
  }

  return crossings;
}

/**
 * Calcule les passages pour une liste de points d'observation, et retourne
 * aussi une liste "à plat" de tous les créneaux triés par heure croissante —
 * c'est cette liste triée qui alimente le récapitulatif.
 */
export function computeAllCrossings(
  points: Array<{ id: string; name: string; distanceInLoopKm: number }>,
  params: {
    startTimeMinutes: number;
    paceMinPerKm: number;
    loopCount: number;
    loopLengthKm: number;
    margin: MarginConfig;
  }
): PointCrossings[] {
  return points.map((point) => ({
    pointId: point.id,
    pointName: point.name,
    crossings: computeCrossingsForPoint({
      ...params,
      distanceInLoopKm: point.distanceInLoopKm,
    }),
  }));
}
