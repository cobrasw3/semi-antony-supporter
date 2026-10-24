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

export type InputMode = "pace" | "duration";

/** Préférences du supporter : mémorisées sur l'appareil, jamais envoyées à un serveur. */
export interface RunnerPrefs {
  name: string;
  mode: InputMode;
  paceText: string;
  durationText: string;
}

/** Paramètres d'URL. `runner` est l'ancien nom de `name`, toujours accepté. */
const PACE_URL_PARAM = "pace";
const NAME_URL_PARAM = "name";
const LEGACY_NAME_URL_PARAM = "runner";
const MAX_NAME_LENGTH = 40;

export function sanitizeName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

/**
 * Préférences initiales : l'URL (lien partagé) prime, puis ce qui a été
 * mémorisé sur l'appareil (app installée : start_url sans paramètres),
 * puis les valeurs par défaut de la course.
 */
export function resolveInitialPrefs(
  search: string,
  stored: Partial<RunnerPrefs> | null,
  defaults: { pace: string; targetTime: string }
): RunnerPrefs {
  const params = new URLSearchParams(search);
  const urlPace = params.get(PACE_URL_PARAM);
  const urlName = params.get(NAME_URL_PARAM) ?? params.get(LEGACY_NAME_URL_PARAM);
  const fromUrl = urlPace !== null || urlName !== null;

  if (fromUrl) {
    return {
      name: sanitizeName(urlName ?? ""),
      mode: "pace",
      paceText: urlPace && parsePace(urlPace) ? autoFormatTimeInput(urlPace) : defaults.pace,
      durationText: defaults.targetTime,
    };
  }
  return {
    name: sanitizeName(stored?.name ?? ""),
    mode: stored?.mode === "duration" ? "duration" : "pace",
    paceText: stored?.paceText ?? defaults.pace,
    durationText: stored?.durationText ?? defaults.targetTime,
  };
}

/** Le prénom s'il est connu, sinon « ton coureur ». */
export function runnerLabel(name: string): string {
  return sanitizeName(name) || "ton coureur";
}

/** Même chose avec une majuscule, pour un début de phrase. */
export function RunnerLabel(name: string): string {
  const label = runnerLabel(name);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Lien de partage « propre » : uniquement le prénom, l'allure et la course
 * (pas les paramètres techniques comme demo/now/calibrage).
 */
export function buildShareUrl(
  base: string,
  paceMinPerKm: number | null,
  runnerName: string,
  raceId?: string | null
): string {
  const url = new URL("/", base);
  const name = sanitizeName(runnerName);
  if (name) url.searchParams.set(NAME_URL_PARAM, name);
  if (paceMinPerKm) url.searchParams.set(PACE_URL_PARAM, formatPace(paceMinPerKm));
  if (raceId) url.searchParams.set("race", raceId);
  return url.toString();
}

/**
 * URL courante mise à jour avec l'allure et le prénom (conserve les autres
 * paramètres, ex. demo/now), pour un rechargement ou un favori fidèles.
 */
export function updateCurrentUrl(
  current: string,
  paceMinPerKm: number | null,
  runnerName: string,
  raceId?: string | null
): string {
  const url = new URL(current);
  url.searchParams.delete(LEGACY_NAME_URL_PARAM);
  const name = sanitizeName(runnerName);
  if (name) url.searchParams.set(NAME_URL_PARAM, name);
  else url.searchParams.delete(NAME_URL_PARAM);
  if (paceMinPerKm) url.searchParams.set(PACE_URL_PARAM, formatPace(paceMinPerKm));
  else url.searchParams.delete(PACE_URL_PARAM);
  if (raceId) url.searchParams.set("race", raceId);
  else url.searchParams.delete("race");
  return url.toString();
}

/** Message de partage (« Suis Léa au Semi d'Antony 👉 »). */
export function buildShareText(runnerName: string, eventShortName: string): string {
  const name = sanitizeName(runnerName);
  return name ? `Suis ${name} au ${eventShortName} 👉` : `Suis le ${eventShortName} en direct 👉`;
}

export interface PaceBounds {
  minMinPerKm: number;
  maxMinPerKm: number;
}

/**
 * Allure active à partir de la saisie (allure directe ou temps visé), avec
 * un message d'erreur clair si la saisie est invalide ou hors bornes.
 */
export function resolvePace(
  prefs: Pick<RunnerPrefs, "mode" | "paceText" | "durationText">,
  totalDistanceKm: number,
  bounds: PaceBounds
): { pace: number | null; error: string | null } {
  const min = formatPace(bounds.minMinPerKm);
  const max = formatPace(bounds.maxMinPerKm);

  if (prefs.mode === "pace") {
    if (!prefs.paceText.trim()) return { pace: null, error: "Indique une allure, par ex. 530 pour 5:30 min/km." };
    const pace = parsePace(prefs.paceText);
    if (pace === null) return { pace: null, error: "Allure non reconnue : tape juste les chiffres, par ex. 530 pour 5:30." };
    if (pace < bounds.minMinPerKm || pace > bounds.maxMinPerKm) {
      return { pace: null, error: `L'allure doit être comprise entre ${min} et ${max} min/km.` };
    }
    return { pace, error: null };
  }

  const minTime = formatDuration(Math.ceil(bounds.minMinPerKm * totalDistanceKm));
  const maxTime = formatDuration(Math.floor(bounds.maxMinPerKm * totalDistanceKm));
  if (!prefs.durationText.trim()) return { pace: null, error: "Indique un temps visé, par ex. 157 pour 1h57." };
  const duration = parseDuration(prefs.durationText);
  if (duration === null) return { pace: null, error: "Temps non reconnu : tape juste les chiffres, par ex. 157 pour 1h57." };
  const pace = duration / totalDistanceKm;
  if (pace < bounds.minMinPerKm || pace > bounds.maxMinPerKm) {
    return { pace: null, error: `Le temps visé doit être compris entre ${minTime} et ${maxTime} (allure ${min} à ${max} min/km).` };
  }
  return { pace, error: null };
}
