// Pointage « mon coureur est passé ici à telle heure » : recale les horaires
// suivants sur l'allure réellement observée. Tout reste sur l'appareil.
// Fonctions pures, testées.

import type { MarginConfig, Race } from "./event";
import {
  ceilMinutesToTimeString,
  computeMarginMinutes,
  floorMinutesToTimeString,
  minutesToTimeString,
  timeStringToMinutes,
  type Passage,
} from "./timing";

export interface Checkin {
  /** Spot et position (km) du passage pointé. */
  spotId: string;
  km: number;
  /** Heure réelle du passage, en minutes depuis minuit. */
  minutes: number;
  /** Nom du lieu quand ce n'est pas un spot (point touché sur la carte). */
  label?: string;
}

const KM_EPSILON = 0.05;

/** Distance (km) à laquelle on fait autant confiance à l'allure observée qu'à l'allure prévue. */
export const TRUST_HALF_KM = 5;

/**
 * Allure à utiliser après un pointage : mélange de l'allure prévue et de
 * l'allure observée du départ au pointage, d'autant plus proche de
 * l'observée que le pointage est loin dans la course (un écart au km 2,7
 * reflète souvent la cohue du départ). Bornée aux allures plausibles.
 */
export function observedPace(
  checkin: Checkin,
  startMinutes: number,
  plannedPace: number,
  bounds: { minMinPerKm: number; maxMinPerKm: number }
): number {
  if (checkin.km < 0.5) return plannedPace;
  const raw = (checkin.minutes - startMinutes) / checkin.km;
  const trust = checkin.km / (checkin.km + TRUST_HALF_KM);
  const pace = plannedPace + trust * (raw - plannedPace);
  return Math.min(bounds.maxMinPerKm, Math.max(bounds.minMinPerKm, pace));
}

/** Avance (négatif) ou retard (positif) au pointage par rapport à l'horaire prévu, en minutes. */
export function checkinDelay(checkin: Checkin, startMinutes: number, plannedPace: number): number {
  return checkin.minutes - (startMinutes + checkin.km * plannedPace);
}

/**
 * Passages recalés : ceux d'avant le pointage ne bougent pas (ils sont
 * passés) ; le passage pointé prend l'heure réelle ; les suivants sont
 * projetés depuis le pointage avec l'allure observée, et leur fourchette
 * repart de zéro (l'incertitude ne court que depuis le pointage).
 */
export function recalibratePassages(
  passages: Passage[],
  checkin: Checkin,
  race: Pick<Race, "startTime">,
  plannedPace: number,
  margin: MarginConfig,
  bounds: { minMinPerKm: number; maxMinPerKm: number }
): Passage[] {
  const pace = observedPace(checkin, timeStringToMinutes(race.startTime), plannedPace, bounds);
  return passages.map((p) => {
    if (p.km < checkin.km - KM_EPSILON) return p;
    if (Math.abs(p.km - checkin.km) <= KM_EPSILON && p.spotId === checkin.spotId) {
      return withTimes(p, checkin.minutes, 0.5);
    }
    if (p.km <= checkin.km + KM_EPSILON) return p;
    const elapsed = (p.km - checkin.km) * pace;
    return withTimes(p, checkin.minutes + elapsed, computeMarginMinutes(elapsed, margin));
  });
}

function withTimes(p: Passage, estimated: number, halfWindow: number): Passage {
  return {
    ...p,
    estimatedMinutes: estimated,
    windowStartMinutes: estimated - halfWindow,
    windowEndMinutes: estimated + halfWindow,
    estimatedTime: minutesToTimeString(estimated),
    windowStart: floorMinutesToTimeString(estimated - halfWindow),
    windowEnd: ceilMinutesToTimeString(estimated + halfWindow),
  };
}

/** Km parcourus estimés après un pointage (projection à l'allure observée), bornés à l'arrivée. */
export function estimatedKmAfterCheckin(nowMinutes: number, checkin: Checkin, pace: number, distanceKm: number): number {
  return Math.min(distanceKm, Math.max(checkin.km, checkin.km + (nowMinutes - checkin.minutes) / pace));
}

/** « Léa a 3 min de retard », « Léa a 2 min d'avance », « Léa est pile à l'heure ». */
export function delaySentence(name: string, delay: number): string {
  const text = formatDelayFr(delay);
  return Math.round(delay) === 0 ? `${name} est ${text}` : `${name} a ${text}`;
}

/** « 3 min de retard », « 2 min d'avance », « pile à l'heure ». */
export function formatDelayFr(delay: number): string {
  const m = Math.round(delay);
  if (m === 0) return "pile à l'heure";
  return m > 0 ? `${m} min de retard` : `${-m} min d'avance`;
}
