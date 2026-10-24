// Mesure d'audience respectueuse de la vie privée : Cloudflare Web Analytics
// (sans cookie de suivi, pas de bandeau de consentement nécessaire ; les
// paramètres d'URL — prénom, allure — ne sont pas enregistrés par Cloudflare).
// Activée seulement si VITE_CF_ANALYTICS_TOKEN est défini au build
// (Cloudflare → Pages → projet → Settings → Variables, environnement
// Production uniquement : les liens de test ne sont pas comptés).
//
// Cloudflare ne compte que les pages vues : les événements ci-dessous sont
// conservés dans le code (track) pour un futur compteur, sans effet pour l'instant.

export type AnalyticsEvent =
  | "partage"
  | "installation"
  | "notifications_activees"
  | "agenda_telecharge"
  | "itineraire_ouvert"
  | "plan_optimal"
  | "ouverture_app_installee";

/** Retire paramètres et ancre d'une URL (ils peuvent contenir un prénom). */
export function stripUrl(url: string): string {
  const u = new URL(url);
  return `${u.origin}${u.pathname}`;
}

export const BEACON_SRC = "https://static.cloudflareinsights.com/beacon.min.js";

export function initAnalytics(options: { demo: boolean }) {
  const token = import.meta.env.VITE_CF_ANALYTICS_TOKEN;
  // Pas de mesure en mode démo (présentations), en développement ni sans token.
  if (options.demo || import.meta.env.DEV || !token) return;
  try {
    const script = document.createElement("script");
    script.defer = true;
    script.src = BEACON_SRC;
    // spa:false : les replaceState (saisie du prénom…) ne sont pas des pages vues.
    script.dataset.cfBeacon = JSON.stringify({ token, spa: false });
    document.head.appendChild(script);
  } catch {
    // la mesure d'audience ne doit jamais casser l'app
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function track(_event: AnalyticsEvent, _properties?: Record<string, string>) {
  // Cloudflare Web Analytics ne gère pas d'événements personnalisés.
}
