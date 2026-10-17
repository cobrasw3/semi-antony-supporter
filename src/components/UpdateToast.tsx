import { useEffect, useState } from "react";
import { onUpdateReady, reloadKeepingState } from "../pwa/serviceWorker";

/** Toast affiché quand une nouvelle version est prête mais que l'utilisateur saisit. */
export function UpdateToast() {
  const [ready, setReady] = useState(false);
  useEffect(() => onUpdateReady(setReady), []);
  if (!ready) return null;
  return (
    <div className="update-toast" role="status">
      <span>Nouvelle version disponible</span>
      <button type="button" onClick={reloadKeepingState}>
        Mettre à jour
      </button>
    </div>
  );
}
