// Logique de calcul des horaires de passage. Fonctions pures uniquement :
// pas d'accès aux fichiers de config ici, tout est passé en paramètre pour
// rester facilement testable.

export interface MarginConfig {
  minPercent: number;
  maxPercent: number;
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

/** Convertit des minutes depuis minuit en "HH:MM" (24h, boucle après minuit). */
export function minutesToTimeString(totalMinutes: number): string {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Allure (min/km) à partir d'un temps visé (en minutes) sur une distance donnée. */
export function paceFromTargetTime(targetTimeMinutes: number, totalDistanceKm: number): number {
  return targetTimeMinutes / totalDistanceKm;
}

/**
 * Pourcentage de marge à appliquer pour une distance cumulée donnée :
 * interpolation linéaire entre minPercent (à 0 km) et maxPercent (à
 * totalDistanceKm), plafonnée à ces deux bornes.
 */
export function computeMarginPercent(
  cumulativeDistanceKm: number,
  totalDistanceKm: number,
  margin: MarginConfig
): number {
  const fraction = Math.min(Math.max(cumulativeDistanceKm / totalDistanceKm, 0), 1);
  return margin.minPercent + (margin.maxPercent - margin.minPercent) * fraction;
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
  totalDistanceKm: number;
  margin: MarginConfig;
}): CrossingEstimate[] {
  const {
    startTimeMinutes,
    paceMinPerKm,
    distanceInLoopKm,
    loopCount,
    loopLengthKm,
    totalDistanceKm,
    margin,
  } = params;

  const crossings: CrossingEstimate[] = [];

  for (let loopIndex = 1; loopIndex <= loopCount; loopIndex++) {
    const cumulativeDistanceKm = distanceInLoopKm + (loopIndex - 1) * loopLengthKm;
    const elapsedMinutes = cumulativeDistanceKm * paceMinPerKm;
    const marginPercent = computeMarginPercent(cumulativeDistanceKm, totalDistanceKm, margin);
    const marginMinutes = elapsedMinutes * marginPercent;

    const estimatedMinutes = startTimeMinutes + elapsedMinutes;
    const windowStartMinutes = estimatedMinutes - marginMinutes;
    const windowEndMinutes = estimatedMinutes + marginMinutes;

    crossings.push({
      loopIndex,
      cumulativeDistanceKm,
      estimatedTime: minutesToTimeString(estimatedMinutes),
      windowStart: minutesToTimeString(windowStartMinutes),
      windowEnd: minutesToTimeString(windowEndMinutes),
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
    totalDistanceKm: number;
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
