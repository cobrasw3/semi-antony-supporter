// Parsing/formatage des saisies utilisateur (allure, temps visé). Séparé de
// timing.ts pour garder ce dernier focalisé sur le calcul pur des horaires.

/** Parse une allure saisie en "M:SS" (ex: "5:30") en minutes/km décimales. */
export function parsePace(input: string): number | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{1,2})(?::([0-5]?\d))?$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = match[2] ? Number(match[2]) : 0;
  if (minutes === 0 && seconds === 0) return null;
  return minutes + seconds / 60;
}

/** Formate des minutes/km décimales en "M:SS". */
export function formatPace(minPerKm: number): string {
  const minutes = Math.floor(minPerKm);
  const seconds = Math.round((minPerKm - minutes) * 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Parse un temps visé saisi en "H:MM" (ex: "2:05") en minutes décimales. */
export function parseDuration(input: string): number | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{1,2}):([0-5]?\d)$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours === 0 && minutes === 0) return null;
  return hours * 60 + minutes;
}

/** Formate des minutes décimales en temps visé "H:MM". */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}
