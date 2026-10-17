// Annonces de l'organisateur (public/data/annonces.json) : texte, niveau,
// fenêtre d'affichage. Publiées sans nouvelle version de l'app (voir README).

import { zonedDateTime, type EventClock } from "./clock";

export interface Annonce {
  id: string;
  level: "info" | "important";
  text: string;
  /** Début d'affichage, ISO avec fuseau (ex. 2027-03-21T13:00:00+01:00). */
  start: string;
  /** Fin d'affichage, ISO avec fuseau. */
  end: string;
  /** Visible uniquement en mode démo. */
  demoOnly?: boolean;
}

export interface AnnoncesFile {
  annonces: Annonce[];
}

export function parseAnnonces(raw: unknown): AnnoncesFile {
  const file = raw as AnnoncesFile;
  if (!file || !Array.isArray(file.annonces)) throw new Error("annonces.json invalide : tableau « annonces » attendu");
  // Une annonce mal formée est ignorée, sans bloquer les autres.
  const annonces = file.annonces.filter(
    (a) =>
      a &&
      typeof a.id === "string" &&
      typeof a.text === "string" &&
      a.text.trim() !== "" &&
      (a.level === "info" || a.level === "important") &&
      !Number.isNaN(Date.parse(a.start)) &&
      !Number.isNaN(Date.parse(a.end))
  );
  return { annonces };
}

/** Compare deux instants exprimés en (date, minutes) dans le fuseau de l'événement. */
function compareZoned(a: { date: string; minutes: number }, b: { date: string; minutes: number }): number {
  return a.date === b.date ? a.minutes - b.minutes : a.date < b.date ? -1 : 1;
}

/**
 * Annonces à afficher maintenant (heure réelle, ou simulée en démo), les
 * importantes en premier.
 */
export function activeAnnonces(annonces: Annonce[], clock: EventClock, timeZone: string): Annonce[] {
  return annonces
    .filter((a) => !a.demoOnly || clock.demo)
    .filter((a) => {
      const start = zonedDateTime(new Date(a.start), timeZone);
      const end = zonedDateTime(new Date(a.end), timeZone);
      return compareZoned(start, clock) <= 0 && compareZoned(clock, end) < 0;
    })
    .sort((a, b) => (a.level === b.level ? 0 : a.level === "important" ? -1 : 1));
}
