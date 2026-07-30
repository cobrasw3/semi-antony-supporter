// Tout ce qui doit pouvoir se régler facilement sans toucher à la logique
// ou aux composants.

export const RACE_NAME = "Semi-marathon d'Antony";

/** Heure de départ officielle du semi, au format "HH:MM" (24h). */
export const RACE_START_TIME = "14:30";

/**
 * Marge d'incertitude appliquée aux heures de passage estimées, exprimée en
 * pourcentage du temps écoulé. Elle s'élargit linéairement entre minPercent
 * (au départ) et maxPercent (à la fin du parcours), pour refléter le fait
 * qu'un coureur tient rarement une allure parfaitement constante sur la
 * durée.
 */
export const MARGIN_CONFIG = {
  minPercent: 0.01, // ±1 % en tout début de parcours
  maxPercent: 0.03, // ±3 % en fin de parcours
};
