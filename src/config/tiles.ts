// Fournisseur de tuiles, choisi au build via variables d'environnement
// (Cloudflare → Pages → Settings → Variables) :
//   VITE_TILE_PROVIDER = local (défaut : fond hébergé avec l'app) | osm | maptiler | stadia
//   VITE_TILE_API_KEY  = clé du fournisseur (MapTiler, Stadia)
// OSM convient pour une démo ; pour un usage public le jour J (trafic
// important), préférer MapTiler ou Stadia (politique d'usage OSM).
// ⚠️ Tout nouveau domaine de tuiles doit être ajouté à la CSP (public/_headers).

export interface TileConfig {
  url: string;
  attribution: string;
  maxZoom: number;
}

const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export function tileConfig(provider: string | undefined, apiKey: string | undefined): TileConfig {
  switch (provider) {
    case "maptiler":
      if (apiKey)
        return {
          url: `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${apiKey}`,
          attribution: `&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> ${OSM_ATTRIBUTION}`,
          maxZoom: 19,
        };
      break;
    case "stadia":
      return {
        url: `https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png${apiKey ? `?api_key=${apiKey}` : ""}`,
        attribution: `&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> ${OSM_ATTRIBUTION}`,
        maxZoom: 20,
      };
  }
  return { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: OSM_ATTRIBUTION, maxZoom: 19 };
}

export const TILES = tileConfig(import.meta.env.VITE_TILE_PROVIDER, import.meta.env.VITE_TILE_API_KEY);

/**
 * Par défaut, la carte utilise le fond hébergé avec l'app (event.json →
 * map.basemap). VITE_TILE_PROVIDER=osm|maptiler|stadia force un service de
 * tuiles en ligne.
 */
export const USE_LOCAL_BASEMAP = !import.meta.env.VITE_TILE_PROVIDER || import.meta.env.VITE_TILE_PROVIDER === "local";
