// Logique de calcul des horaires de passage. Fonctions pures uniquement :
// tout est passé en paramètre (course, allure, marge) pour rester testable.
// Les passages découlent UNIQUEMENT des positions kilométriques des spots
// (event.json) : aucune hypothèse codée en dur sur le nombre de boucles.

import type { MarginConfig, Race, Spot } from "./event";

export type { MarginConfig } from "./event";

export type PassageKind = "start" | "loop" | "loopEnd" | "finish";

export interface Passage {
  spotId: string;
  /** Distance depuis le départ, en km. */
  km: number;
  /** Numéro de la boucle en cours (1..loops). */
  loopIndex: number;
  /** Nature du passage, déduite de sa position sur le parcours. */
  kind: PassageKind;
  /** Étiquette lisible (« Départ », « Boucle 2 », « Fin boucle 1 », « Arrivée »…). */
  label: string;
  /** Heure estimée, en minutes depuis minuit. */
  estimatedMinutes: number;
  windowStartMinutes: number;
  windowEndMinutes: number;
  /** "HH:MM" au centre de la fenêtre. */
  estimatedTime: string;
  /** Début de fenêtre "HH:MM" (arrondi vers le bas). */
  windowStart: string;
  /** Fin de fenêtre "HH:MM" (arrondi vers le haut). */
  windowEnd: string;
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
 * après le départ.
 */
export function computeMarginMinutes(elapsedMinutes: number, margin: MarginConfig): number {
  return Math.max(elapsedMinutes * margin.percentage, margin.minMinutes);
}

const KM_EPSILON = 0.05;

/** Numéro de boucle (1..loops) dans laquelle se trouve la position `km`. */
export function loopIndexAt(km: number, race: Pick<Race, "loops" | "loopLengthKm">): number {
  if (race.loops <= 1) return 1;
  return Math.min(race.loops, Math.floor((km + KM_EPSILON) / race.loopLengthKm) + 1);
}

type RaceShape = Pick<Race, "loops" | "loopLengthKm" | "distanceKm">;

/** Nature d'un passage selon sa position : départ, fin de boucle, arrivée, ou en cours de boucle. */
export function passageKind(km: number, race: RaceShape): PassageKind {
  if (km <= KM_EPSILON) return "start";
  if (Math.abs(km - race.distanceKm) <= KM_EPSILON) return "finish";
  if (race.loops > 1) {
    const n = Math.round(km / race.loopLengthKm);
    if (n >= 1 && n < race.loops && Math.abs(km - n * race.loopLengthKm) <= KM_EPSILON) return "loopEnd";
  }
  return "loop";
}

function formatKm(km: number): string {
  return `km ${Number(km.toFixed(1)).toLocaleString("fr-FR")}`;
}

/**
 * Étiquette d'un passage, générée automatiquement depuis sa position :
 * « Départ », « Boucle N », « Fin boucle N », « Arrivée » (ou « km X » pour
 * un parcours sans boucle).
 */
export function passageLabel(km: number, race: RaceShape): string {
  switch (passageKind(km, race)) {
    case "start":
      return "Départ";
    case "finish":
      return "Arrivée 🏁";
    case "loopEnd":
      return `Fin boucle ${Math.round(km / race.loopLengthKm)}`;
    default:
      return race.loops > 1 ? `Boucle ${loopIndexAt(km, race)}` : formatKm(km);
  }
}

/** Calcule un passage à la position `km`. */
export function computePassage(params: {
  spotId: string;
  km: number;
  race: Pick<Race, "loops" | "loopLengthKm" | "distanceKm" | "startTime">;
  paceMinPerKm: number;
  margin: MarginConfig;
}): Passage {
  const { spotId, km, race, paceMinPerKm, margin } = params;
  const elapsedMinutes = km * paceMinPerKm;
  const marginMinutes = computeMarginMinutes(elapsedMinutes, margin);
  const estimatedMinutes = timeStringToMinutes(race.startTime) + elapsedMinutes;
  const windowStartMinutes = estimatedMinutes - marginMinutes;
  const windowEndMinutes = estimatedMinutes + marginMinutes;

  return {
    spotId,
    km,
    loopIndex: loopIndexAt(km, race),
    kind: passageKind(km, race),
    label: passageLabel(km, race),
    estimatedMinutes,
    windowStartMinutes,
    windowEndMinutes,
    estimatedTime: minutesToTimeString(estimatedMinutes),
    // Bornes arrondies "vers l'extérieur" (floor/ceil) : la fenêtre ne se
    // rétrécit jamais à l'arrondi, elle ne fait que s'élargir un peu plus.
    windowStart: floorMinutesToTimeString(windowStartMinutes),
    windowEnd: ceilMinutesToTimeString(windowEndMinutes),
  };
}

/** Passages d'un spot, dans l'ordre du parcours. */
export function computeSpotPassages(
  spot: Pick<Spot, "id" | "km">,
  race: Pick<Race, "loops" | "loopLengthKm" | "distanceKm" | "startTime">,
  paceMinPerKm: number,
  margin: MarginConfig
): Passage[] {
  return [...spot.km]
    .sort((a, b) => a - b)
    .map((km) => computePassage({ spotId: spot.id, km, race, paceMinPerKm, margin }));
}

/** Tous les passages de la course, tous spots confondus, triés chronologiquement. */
export function computeAllPassages(race: Race, paceMinPerKm: number, margin: MarginConfig): Passage[] {
  return race.spots
    .flatMap((spot) => computeSpotPassages(spot, race, paceMinPerKm, margin))
    .sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
}

/** Passages regroupés par spot (clé = id du spot). */
export function groupPassagesBySpot(passages: Passage[]): Record<string, Passage[]> {
  const result: Record<string, Passage[]> = {};
  for (const p of passages) (result[p.spotId] ??= []).push(p);
  return result;
}
