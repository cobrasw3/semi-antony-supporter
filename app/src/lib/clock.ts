// Horloge de l'événement : heure réelle dans le fuseau de la course, ou
// heure simulée en mode démo (?demo=1&now=14:40) pour présenter l'app jour J
// à n'importe quel moment. Fonctions pures, testées.

export interface EventClock {
  /** Date "AAAA-MM-JJ" dans le fuseau de l'événement. */
  date: string;
  /** Minutes depuis minuit (fractionnaires) dans le fuseau de l'événement. */
  minutes: number;
  demo: boolean;
}

export interface DemoParams {
  demo: boolean;
  /** Heure simulée de départ du mode démo, en minutes depuis minuit. */
  nowMinutes: number | null;
}

export function parseDemoParams(search: string): DemoParams {
  const params = new URLSearchParams(search);
  const demo = params.get("demo") === "1";
  const match = params.get("now")?.match(/^(\d{1,2})[:h](\d{2})$/);
  const valid = match && Number(match[1]) < 24 && Number(match[2]) < 60;
  const nowMinutes = valid ? Number(match[1]) * 60 + Number(match[2]) : null;
  return { demo, nowMinutes: demo ? nowMinutes : null };
}

/** Date et heure de `instant` dans le fuseau `timeZone`. */
export function zonedDateTime(instant: Date, timeZone: string): { date: string; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute) + Number(parts.second) / 60,
  };
}

/**
 * Heure de l'événement. En mode démo, on se place le jour de la course et,
 * si `now` est donné, l'heure simulée avance en temps réel à partir de
 * l'ouverture de la page (la démo reste « vivante » pendant le pitch).
 */
export function eventClock(params: {
  realNow: Date;
  demoStartedAt: Date;
  demo: DemoParams;
  eventDate: string;
  timeZone: string;
}): EventClock {
  const real = zonedDateTime(params.realNow, params.timeZone);
  if (!params.demo.demo) return { ...real, demo: false };
  const elapsed = (params.realNow.getTime() - params.demoStartedAt.getTime()) / 60000;
  const minutes = params.demo.nowMinutes !== null ? params.demo.nowMinutes + elapsed : real.minutes;
  return { date: params.eventDate, minutes, demo: true };
}

/** Nombre de jours de `from` à `to` (dates "AAAA-MM-JJ"). */
export function daysBetween(from: string, to: string): number {
  const toUtc = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

/** « dimanche 21 mars 2027 ». */
export function formatLongDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d))
  );
}
