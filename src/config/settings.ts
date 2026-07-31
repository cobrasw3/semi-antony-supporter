// Tout ce qui doit pouvoir se régler facilement sans toucher à la logique
// ou aux composants.

export const RACE_NAME = "Semi-marathon d'Antony";

/** Heure de départ officielle du semi, au format "HH:MM" (24h). */
export const RACE_START_TIME = "14:30";

/**
 * Marge d'incertitude appliquée aux heures de passage estimées.
 *
 * Principe : l'erreur est asymétrique. Faire rater le coureur au supporter
 * (fenêtre trop étroite, coureur passé avant l'heure annoncée) coûte cher :
 * perte de confiance immédiate. Le faire arriver un peu en avance et
 * attendre quelques minutes ne coûte presque rien. En cas de doute, la
 * fenêtre doit donc être plus large, pas plus serrée.
 *
 * Demi-largeur de la fenêtre pour un point donné :
 *   max(temps_écoulé_jusqu'au_point × MARGE_POURCENTAGE, MARGE_MIN_MINUTES)
 *
 * Le pourcentage fait naturellement grandir la fenêtre avec la distance
 * (resserrée au 1er passage, large au 3e vers le 16e-18e km) ; le plancher
 * en minutes évite une fenêtre ridiculement étroite juste après le départ.
 * Les deux valeurs sont volontairement isolées ici pour être testées
 * facilement sans toucher à la logique de calcul (src/lib/timing.ts).
 */

/** ±3,5 % du temps écoulé depuis le départ. Monte à ~5 min à allure 5:30/km au 3e passage (~16 km). */
export const MARGE_POURCENTAGE = 0.035;

/** Plancher de marge, même juste après le départ (± ce nombre de minutes minimum). */
export const MARGE_MIN_MINUTES = 1.5;
