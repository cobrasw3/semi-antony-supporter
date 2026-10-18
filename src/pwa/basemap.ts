// Fond de carte hébergé (PMTiles) : téléchargé une fois en entier dans le
// cache, puis le service worker sert les lectures partielles (Range) depuis
// ce cache -> carte disponible hors-ligne, même zoomée.

export const BASEMAP_CACHE = "fond-de-carte";

export async function warmBasemap(path: string | undefined) {
  if (!path || !("caches" in window) || !navigator.onLine) return;
  try {
    const url = new URL(path, window.location.origin).href;
    const cache = await caches.open(BASEMAP_CACHE);
    // Un seul fond à la fois : on supprime les anciennes versions.
    for (const key of await cache.keys()) if (key.url !== url) await cache.delete(key);
    if (await cache.match(url)) return;
    const response = await fetch(url);
    if (response.status === 200) await cache.put(url, response);
  } catch {
    // pas grave : la carte se chargera en ligne, ou le plan statique prendra le relais
  }
}
