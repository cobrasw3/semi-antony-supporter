import { useEffect, useState } from "react";
import { pickInitial, type RemoteState, type StoredCopy } from "../lib/remoteData";
import { readJson, writeJson } from "../lib/storage";
import { UPDATE_CHECK_INTERVAL_MS } from "../pwa/updatePolicy";

/**
 * Stale-while-revalidate côté app : affiche immédiatement la meilleure copie
 * disponible, puis la rafraîchit en arrière-plan (au montage, au retour au
 * premier plan, au retour du réseau, et toutes les 15 min).
 */
export function useRemoteJson<T>(url: string, storageKey: string, bundled: T, parse: (raw: unknown) => T): RemoteState<T> {
  const [state, setState] = useState<RemoteState<T>>(() =>
    pickInitial(bundled, readJson<StoredCopy<T>>(storageKey), __BUILD_TIME__, parse)
  );

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        // no-cache : revalide auprès du serveur (ETag) au lieu de lire le cache HTTP.
        const response = await fetch(url, { cache: "no-cache" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = parse(await response.json());
        const fetchedAt = new Date().toISOString();
        writeJson(storageKey, { data, fetchedAt } satisfies StoredCopy<T>);
        if (!cancelled) setState({ data, fetchedAt, stale: false });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, stale: true }));
      }
    };

    refresh();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);
    const id = window.setInterval(refresh, UPDATE_CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
      window.clearInterval(id);
    };
  }, [url, storageKey, parse]);

  return state;
}
