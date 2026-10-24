// Fond de carte hébergé (PMTiles, quelques Mo) : téléchargé une fois EN
// ENTIER, gardé dans le cache du navigateur, puis découpé en mémoire.
// Aucune dépendance aux requêtes partielles (Range) du serveur, et carte
// complète hors-ligne dès que le fichier a été chargé une fois.

import type { RangeResponse, Source } from "pmtiles";

export const BASEMAP_CACHE = "fond-de-carte";

const loads = new Map<string, Promise<ArrayBuffer>>();

/** Contenu du fond de carte : depuis le cache, sinon téléchargé et mis en cache. */
export function loadBasemap(path: string): Promise<ArrayBuffer> {
  const url = new URL(path, window.location.origin).href;
  let load = loads.get(url);
  if (!load) {
    load = fetchAndCache(url);
    // En cas d'échec (hors-ligne sans cache), on réessaiera au prochain appel.
    load.catch(() => loads.delete(url));
    loads.set(url, load);
  }
  return load;
}

async function fetchAndCache(url: string): Promise<ArrayBuffer> {
  const cache = "caches" in window ? await caches.open(BASEMAP_CACHE).catch(() => undefined) : undefined;
  const cached = await cache?.match(url);
  if (cached) return cached.arrayBuffer();
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fond de carte indisponible (${response.status})`);
  if (cache) {
    try {
      // Un seul fond à la fois : on supprime les anciennes versions.
      for (const key of await cache.keys()) if (key.url !== url) await cache.delete(key);
      await cache.put(url, response.clone());
    } catch {
      // cache plein ou indisponible : la carte marche quand même en ligne
    }
  }
  return response.arrayBuffer();
}

/** Préchargement en arrière-plan, pour avoir la carte hors-ligne le jour J. */
export function warmBasemap(path: string | undefined) {
  if (!path || !navigator.onLine) return;
  loadBasemap(path).catch(() => {
    // pas grave : nouvel essai à l'ouverture de la carte
  });
}

/** Source PMTiles lue dans le fichier entier en mémoire. */
export function wholeFileSource(path: string): Source {
  return {
    getKey: () => path,
    getBytes: async (offset: number, length: number): Promise<RangeResponse> => {
      const data = await loadBasemap(path);
      return { data: data.slice(offset, offset + length) };
    },
  };
}
