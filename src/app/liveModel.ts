// Modèle de présentation de l'onglet Live et de l'en-tête : transforme
// l'état « jour J » (src/lib/dayStatus) en textes et valeurs d'affichage.
// Pur, testé. Aucun calcul d'horaire ici.

import type { DayStatus } from "../lib/dayStatus";
import { formatKmFr } from "../lib/runnerPosition";
import type { Passage } from "../lib/timing";

export interface Countdown {
  value: string;
  unit: string;
}

/** 5 → « 5 min » ; 65 → « 1:05 h » ; 0,4 → « <1 min ». */
export function countdown(minutes: number): Countdown {
  const m = Math.max(0, Math.round(minutes));
  if (minutes < 1) return { value: "<1", unit: "min" };
  if (m < 60) return { value: String(m), unit: "min" };
  return { value: `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`, unit: "h" };
}

/**
 * Progression de l'anneau (0 → 1) vers le prochain passage : part du passage
 * précédent (ou du départ) et se remplit jusqu'au suivant.
 */
export function ringProgress(passages: Passage[], next: Passage, nowMinutes: number, startMinutes: number): number {
  const previous = passages.filter((p) => p.estimatedMinutes <= nowMinutes).at(-1);
  const from = previous?.estimatedMinutes ?? Math.min(startMinutes, nowMinutes);
  const span = next.estimatedMinutes - from;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (nowMinutes - from) / span));
}

/** Progression vers le départ, sur les 2 dernières heures. */
export function startProgress(minutesToStart: number): number {
  return Math.min(1, Math.max(0, 1 - minutesToStart / 120));
}

export interface HeaderInfo {
  strong: string;
  text: string;
}

/** « dim. 21 mars » */
export function shortDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d))
  );
}

/** Info du moment affichée à droite de la puce coureur. */
export function headerInfo(
  status: DayStatus | null,
  params: { eventDate: string; startTime: string; runnerKm: number | null }
): HeaderInfo {
  if (!status) return { strong: "Départ", text: params.startTime };
  switch (status.kind) {
    case "notRaceDay":
      return status.daysUntil > 0
        ? { strong: `J-${status.daysUntil}`, text: `${shortDate(params.eventDate)} · ${params.startTime}` }
        : { strong: "Terminé", text: shortDate(params.eventDate) };
    case "beforeStart": {
      const c = countdown(status.minutesToStart);
      return { strong: "Départ", text: `dans ${c.value} ${c.unit}` };
    }
    case "live":
      return params.runnerKm !== null
        ? { strong: formatKmFr(params.runnerKm).replace("km", "Km"), text: "estimé" }
        : { strong: "En course", text: "" };
    case "finished":
      return { strong: "Arrivée", text: status.finish.estimatedTime };
  }
}

/**
 * Prochains passages à montrer sous la carte live. Avant le jour J (ou sans
 * heure courante) : les premiers de la course.
 */
export function upcomingPassages(passages: Passage[], nowMinutes: number | null, count = 3): Passage[] {
  if (nowMinutes === null) return passages.slice(0, count);
  return passages.filter((p) => p.windowEndMinutes >= nowMinutes).slice(0, count);
}

/**
 * Où en est-on dans le plan : étape en cours et prochaine étape. Une étape
 * reste « en cours » `graceMinutes` après sa fourchette (coureur en retard),
 * sauf si elle a déjà été pointée (`isDone`).
 */
export function planProgress(
  steps: Passage[],
  nowMinutes: number,
  graceMinutes = 0,
  isDone: (p: Passage) => boolean = () => false
): { current: Passage | null; next: Passage | null; nextIndex: number } {
  const current =
    steps.find((p) => !isDone(p) && p.windowStartMinutes <= nowMinutes && nowMinutes <= p.windowEndMinutes + graceMinutes) ?? null;
  const nextIndex = steps.findIndex((p) => p.windowStartMinutes > nowMinutes && p !== current);
  return { current, next: nextIndex >= 0 ? steps[nextIndex] : null, nextIndex };
}

/**
 * Étape à pointer quand on touche « Il vient de passer » : celle du plan la
 * plus proche de l'heure actuelle (± `windowMinutes`), pas encore pointée.
 */
export function checkinTarget(
  steps: Passage[],
  nowMinutes: number,
  isDone: (p: Passage) => boolean,
  windowMinutes = 15
): Passage | null {
  return (
    steps
      .filter((p) => !isDone(p) && Math.abs(p.estimatedMinutes - nowMinutes) <= windowMinutes)
      .sort((a, b) => Math.abs(a.estimatedMinutes - nowMinutes) - Math.abs(b.estimatedMinutes - nowMinutes))[0] ?? null
  );
}
