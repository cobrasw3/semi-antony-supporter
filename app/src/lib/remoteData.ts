// Contenu séparé du code : event.json et annonces.json sont affichés tout
// de suite (copie embarquée dans l'app, ou dernière copie téléchargée), puis
// rafraîchis en arrière-plan ; l'écran se met à jour sans rechargement.
// Ainsi, un changement d'horaire arrive sans nouvelle version de l'app.

export interface StoredCopy<T> {
  data: T;
  /** Date ISO du téléchargement. */
  fetchedAt: string;
}

export interface RemoteState<T> {
  data: T;
  /** Date ISO du dernier téléchargement réussi (null : copie embarquée). */
  fetchedAt: string | null;
  /** Le dernier essai de rafraîchissement a échoué (hors-ligne, réseau saturé). */
  stale: boolean;
}

/**
 * Copie à afficher au démarrage : la copie téléchargée si elle est plus
 * récente que la version de l'app (sinon l'app, fraîchement mise à jour,
 * embarque des données au moins aussi récentes).
 */
export function pickInitial<T>(bundled: T, stored: StoredCopy<T> | null, buildTime: string, parse: (raw: unknown) => T): RemoteState<T> {
  if (stored && stored.fetchedAt > buildTime) {
    try {
      return { data: parse(stored.data), fetchedAt: stored.fetchedAt, stale: false };
    } catch {
      // copie locale corrompue : on l'ignore
    }
  }
  return { data: bundled, fetchedAt: null, stale: false };
}
