// Retour haptique léger, si l'appareil le permet (Android ; ignoré sur iOS).
// Les navigateurs refusent la vibration avant un premier geste de
// l'utilisateur : on ne la tente qu'après (pas d'erreur en console).
export function haptic(pattern: number | number[] = 10) {
  try {
    const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (activation && !activation.hasBeenActive) return;
    navigator.vibrate?.(pattern);
  } catch {
    // pas de vibration : aucun impact
  }
}
