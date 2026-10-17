// Règle pure : quand afficher l'assistant de premier lancement.

/**
 * Faut-il montrer l'assistant ? Non si le lien partagé contient déjà
 * l'allure (et éventuellement le prénom), ni si l'assistant a déjà été fait
 * sur cet appareil.
 */
export function needsOnboarding(search: string, onboarded: boolean): boolean {
  const params = new URLSearchParams(search);
  return !params.has("pace") && !onboarded;
}
