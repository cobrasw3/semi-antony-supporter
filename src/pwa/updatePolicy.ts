// Décision à prendre quand une nouvelle version de l'app prend la main.
// Pure et testée : le reste (service worker, DOM) est dans serviceWorker.ts.

/** Intervalle entre deux vérifications de mise à jour quand l'app est ouverte. */
export const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;
/** Une saisie plus récente que ce délai = l'utilisateur est en train de taper. */
export const TYPING_GRACE_MS = 5_000;
/** Garde-fou anti-boucle : pas deux rechargements automatiques aussi rapprochés. */
export const MIN_RELOAD_INTERVAL_MS = 60_000;

export type UpdateAction = "reload" | "toast";

export function decideUpdateAction(params: {
  now: number;
  /** Un champ de saisie a le focus. */
  editing: boolean;
  /** Horodatage de la dernière frappe (0 si aucune). */
  lastInputAt: number;
  /** Horodatage du dernier rechargement automatique (null si aucun). */
  lastAutoReloadAt: number | null;
}): UpdateAction {
  const { now, editing, lastInputAt, lastAutoReloadAt } = params;
  if (editing || now - lastInputAt < TYPING_GRACE_MS) return "toast";
  if (lastAutoReloadAt !== null && now - lastAutoReloadAt < MIN_RELOAD_INTERVAL_MS) return "toast";
  return "reload";
}
