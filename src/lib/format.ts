// Parsing/formatage des saisies utilisateur (allure, temps visé). Séparé de
// timing.ts pour garder ce dernier focalisé sur le calcul pur des horaires.

/**
 * Parse une allure en minutes/km décimales. Accepte ":", "." ou "," comme
 * séparateur minutes/secondes ("5:30", "5.30", "5,30") : le clavier
 * numérique mobile (inputMode="decimal") n'a généralement pas de touche
 * ":", seulement un point ou une virgule selon la locale du téléphone.
 */
export function parsePace(input: string): number | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{1,2})(?:[:.,]([0-5]?\d))?$/);
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

/**
 * Parse un temps visé en minutes décimales. Mêmes séparateurs tolérés que
 * parsePace ("2:05", "2.05", "2,05") pour la même raison de clavier mobile.
 */
export function parseDuration(input: string): number | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{1,2})[:.,]([0-5]?\d)$/);
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

/**
 * Reformate en direct une saisie de type "M:SS" ou "H:MM" à partir des
 * chiffres tapés, en insérant automatiquement le séparateur — pour éviter
 * de dépendre d'une touche ":" que la plupart des claviers numériques
 * mobiles n'ont pas (seulement un point ou une virgule selon la locale, et
 * même ça manque parfois). Les 2 derniers chiffres tapés sont toujours
 * interprétés comme secondes/minutes, le reste comme minutes/heures.
 * Tolère aussi ":", "." et "," déjà présents dans la saisie (ignorés, la
 * saisie est reconstruite uniquement à partir des chiffres).
 */
export function autoFormatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, -2)}:${digits.slice(-2)}`;
}

/** Paramètres d'URL utilisés pour partager l'allure et le prénom du coureur suivi. */
const PACE_URL_PARAM = "pace";
const RUNNER_URL_PARAM = "runner";

/** Lit l'allure ("M:SS") depuis le paramètre d'URL, si présent. */
export function readPaceFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(PACE_URL_PARAM);
}

/** Lit le prénom du coureur suivi depuis le paramètre d'URL, si présent. */
export function readRunnerNameFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(RUNNER_URL_PARAM);
}

/**
 * Construit l'URL de partage courante, avec l'allure et le prénom du
 * coureur (si renseigné) encodés en paramètres — pour qu'un lien partagé
 * rouvre directement sur les mêmes horaires, personnalisés.
 */
export function buildShareUrl(paceMinPerKm: number | null, runnerName?: string): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);

  if (paceMinPerKm) {
    url.searchParams.set(PACE_URL_PARAM, formatPace(paceMinPerKm));
  } else {
    url.searchParams.delete(PACE_URL_PARAM);
  }

  const trimmedRunnerName = runnerName?.trim();
  if (trimmedRunnerName) {
    url.searchParams.set(RUNNER_URL_PARAM, trimmedRunnerName);
  } else {
    url.searchParams.delete(RUNNER_URL_PARAM);
  }

  return url.toString();
}
