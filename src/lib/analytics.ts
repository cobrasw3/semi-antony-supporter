// Mesure d'audience respectueuse de la vie privée : Vercel Web Analytics
// (sans cookie, pas de bandeau de consentement nécessaire). À activer dans
// le tableau de bord Vercel : projet → Analytics → Enable.
//
// Aucune donnée personnelle : l'URL est envoyée SANS ses paramètres (pas
// de prénom ni d'allure), et les événements ne portent que des catégories.

import { inject, track as vercelTrack } from "@vercel/analytics";

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

let enabled = false;

export function initAnalytics(options: { demo: boolean }) {
  // Pas de mesure en mode démo (présentations) ni en développement.
  if (options.demo || import.meta.env.DEV) return;
  enabled = true;
  inject({
    mode: "production",
    // Les changements d'URL (replaceState à chaque saisie) ne sont pas des pages vues.
    disableAutoTrack: true,
    beforeSend: (event) => ({ ...event, url: stripUrl(event.url) }),
  });
}

export function track(event: AnalyticsEvent, properties?: Record<string, string>) {
  if (!enabled) return;
  try {
    vercelTrack(event, properties);
  } catch {
    // la mesure d'audience ne doit jamais casser l'app
  }
}
