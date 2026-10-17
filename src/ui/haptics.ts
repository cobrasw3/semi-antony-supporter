// Retour haptique léger, si l'appareil le permet (Android ; ignoré sur iOS).
export function haptic(pattern: number | number[] = 10) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // pas de vibration : aucun impact
  }
}
