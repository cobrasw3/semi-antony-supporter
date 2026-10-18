// Rappels « il arrive dans 10 min ».
//
// Limite assumée : sans serveur de push, une PWA ne peut pas planifier une
// notification fiable app fermée (l'API Notification Triggers a été
// abandonnée ; iOS suspend le JS en arrière-plan). Deux mécanismes, donc :
//  1. Export agenda (.ics) avec alarme 10 min avant chaque passage : géré
//     par le téléphone lui-même, fiable app fermée et hors-ligne.
//  2. Alerte dans l'app (notification + vibration) tant qu'elle est ouverte.

import { zonedDateTime } from "./clock";
import { minutesToTimeString, type Passage } from "./timing";

export const REMINDER_LEAD_MINUTES = 10;

/** Clé unique d'un passage (pour ne pas alerter deux fois). */
export const passageKey = (p: Pick<Passage, "spotId" | "km">) => `${p.spotId}@${p.km}`;

/** Passages à annoncer maintenant : prévus dans (0, lead] minutes et pas encore annoncés. */
export function dueReminders(
  passages: Passage[],
  nowMinutes: number,
  alreadyAlerted: ReadonlySet<string>,
  leadMinutes = REMINDER_LEAD_MINUTES
): Passage[] {
  return passages.filter((p) => {
    const delay = p.estimatedMinutes - nowMinutes;
    return delay > 0 && delay <= leadMinutes && !alreadyAlerted.has(passageKey(p));
  });
}

/** Instant UTC correspondant à `date` + `minutes` (heure locale du fuseau `timeZone`). */
export function zonedTimeToUtc(date: string, minutes: number, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  let guess = Date.UTC(y, m - 1, d, 0, 0, 0) + minutes * 60_000;
  // Deux itérations suffisent pour corriger le décalage horaire (y compris
  // les jours de changement d'heure, hors heure « inexistante »).
  for (let i = 0; i < 2; i++) {
    const z = zonedDateTime(new Date(guess), timeZone);
    const dayShift = z.date === date ? 0 : z.date > date ? 1440 : -1440;
    guess -= (z.minutes + dayShift - minutes) * 60_000;
  }
  return new Date(Math.round(guess / 1000) * 1000);
}

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");

export interface IcsItem {
  passage: Passage;
  /** Titre de l'événement agenda (« Léa passe rue des Champs »). */
  title: string;
  location: string;
}

/**
 * Fichier iCalendar : un événement par passage (fourchette de passage),
 * avec une alarme 10 min avant l'heure estimée.
 */
export function buildIcs(params: {
  items: IcsItem[];
  eventId: string;
  eventDate: string;
  timeZone: string;
  now?: Date;
  leadMinutes?: number;
}): string {
  const { items, eventId, eventDate, timeZone, now = new Date(), leadMinutes = REMINDER_LEAD_MINUTES } = params;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Semi Antony Supporter//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const { passage: p, title, location } of items) {
    const start = zonedTimeToUtc(eventDate, Math.floor(p.windowStartMinutes), timeZone);
    const end = zonedTimeToUtc(eventDate, Math.ceil(p.windowEndMinutes), timeZone);
    // Alarme relative au début de la fourchette, calée sur « heure estimée − 10 min ».
    const trigger = Math.round(p.estimatedMinutes - leadMinutes - Math.floor(p.windowStartMinutes));
    lines.push(
      "BEGIN:VEVENT",
      `UID:${eventId}-${p.spotId}-${p.km}@semi-antony-supporter`,
      `DTSTAMP:${icsDate(now)}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsText(title)}`,
      `LOCATION:${icsText(location)}`,
      `DESCRIPTION:${icsText(`${p.label} — passage estimé vers ${p.estimatedTime} (fourchette ${p.windowStart}–${p.windowEnd}).`)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsText(`${title} dans ${leadMinutes} min (vers ${minutesToTimeString(p.estimatedMinutes)})`)}`,
      `TRIGGER:${trigger < 0 ? "-" : ""}PT${Math.abs(trigger)}M`,
      "END:VALARM",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
