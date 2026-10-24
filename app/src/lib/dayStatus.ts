// État « jour J » : avant le départ, pendant, après l'arrivée, ou pas le
// jour de la course. Fonction pure à partir des passages calculés et de
// l'horloge de l'événement.

import { daysBetween, type EventClock } from "./clock";
import type { Passage } from "./timing";

export type DayStatus =
  | { kind: "notRaceDay"; daysUntil: number; first: Passage; finish: Passage }
  | { kind: "beforeStart"; minutesToStart: number; next: Passage }
  | { kind: "live"; current: Passage | null; next: Passage | null; minutesToNext: number | null }
  | { kind: "finished"; finish: Passage };

/**
 * @param passages tous les passages de la course, triés chronologiquement.
 * @param startMinutes heure de départ de la course (minutes depuis minuit).
 */
export function computeDayStatus(
  passages: Passage[],
  startMinutes: number,
  clock: EventClock,
  eventDate: string
): DayStatus | null {
  if (passages.length === 0) return null;
  const first = passages[0];
  const finish = passages.reduce((a, b) => (b.km >= a.km ? b : a));

  if (clock.date !== eventDate) {
    return { kind: "notRaceDay", daysUntil: daysBetween(clock.date, eventDate), first, finish };
  }

  const now = clock.minutes;
  if (now < first.windowStartMinutes) {
    return { kind: "beforeStart", minutesToStart: startMinutes - now, next: first };
  }
  if (now > finish.windowEndMinutes) {
    return { kind: "finished", finish };
  }

  const current = passages.find((p) => p.windowStartMinutes <= now && now <= p.windowEndMinutes) ?? null;
  const next = passages.find((p) => p.windowStartMinutes > now && p !== current) ?? null;
  return { kind: "live", current, next, minutesToNext: next ? next.estimatedMinutes - now : null };
}

/** « 12 min », « 1 h 05 », « moins d'1 min ». */
export function formatDelay(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 1) return "moins d'1 min";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}
