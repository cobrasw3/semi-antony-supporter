interface BandeauConnexionProps {
  online: boolean;
  /** Le dernier rafraîchissement des données a échoué. */
  stale: boolean;
  /** Date ISO du dernier téléchargement des données (null : version intégrée). */
  fetchedAt: string | null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Bandeau discret et non bloquant : hors connexion (ou réseau saturé), l'app
 * reste entièrement utilisable, les horaires étant calculés sur l'appareil.
 */
export function BandeauConnexion({ online, stale, fetchedAt }: BandeauConnexionProps) {
  if (online && !stale) return null;
  const since = fetchedAt ? `données mises à jour à ${formatTime(fetchedAt)}` : "données intégrées à l'app";
  return (
    <div className="bandeau-connexion" role="status">
      {online ? "📶 Réseau lent" : "📴 Hors connexion"} — l'app reste utilisable ({since}).
    </div>
  );
}
