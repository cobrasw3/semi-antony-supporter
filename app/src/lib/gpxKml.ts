// Parsing GPX/KML en tableau de LatLng. Implémenté par expressions
// régulières plutôt que via un parseur XML/DOM : ça reste suffisant pour
// des exports GPX/KML standards (Strava, Garmin, Google Earth/My Maps...),
// et surtout ça marche identiquement dans le navigateur et sous Node (pas
// de DOMParser en environnement Node) — important puisque ce module est
// utilisé aussi bien par l'app que par le script CLI d'import
// (scripts/import-track.ts).

import type { LatLng } from "./geo";

/** Parse les points d'un fichier GPX (balises <trkpt>, <rtept> ou <wpt> avec lat/lon). */
export function parseGpx(xml: string): LatLng[] {
  const points: LatLng[] = [];
  const pointTagRe = /<(?:trkpt|rtept|wpt)\b([^>]*)>/g;
  let match: RegExpExecArray | null;

  while ((match = pointTagRe.exec(xml)) !== null) {
    const attrs = match[1];
    const lat = attrs.match(/\blat="(-?\d+(?:\.\d+)?)"/)?.[1];
    const lon = attrs.match(/\blon="(-?\d+(?:\.\d+)?)"/)?.[1];
    if (lat && lon) {
      points.push({ lat: Number(lat), lng: Number(lon) });
    }
  }

  return points;
}

/**
 * Parse les points d'un fichier KML : concatène les points de toutes les
 * balises <coordinates> trouvées (typiquement une par <LineString>).
 * Format KML : "lng,lat[,altitude]" par point, séparés par espaces/retours
 * à la ligne — attention à l'ordre inversé par rapport au GPX.
 */
export function parseKml(xml: string): LatLng[] {
  const points: LatLng[] = [];
  const coordsBlockRe = /<coordinates>([\s\S]*?)<\/coordinates>/g;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = coordsBlockRe.exec(xml)) !== null) {
    const tokens = blockMatch[1].trim().split(/\s+/);
    for (const token of tokens) {
      if (!token) continue;
      const [lngStr, latStr] = token.split(",");
      const lng = Number(lngStr);
      const lat = Number(latStr);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        points.push({ lat, lng });
      }
    }
  }

  return points;
}

/** Détecte le format à partir du contenu (peu importe l'extension du fichier) et parse. */
export function parseTrack(content: string): LatLng[] {
  const trimmed = content.trimStart();
  if (trimmed.includes("<gpx") || trimmed.includes("<trkpt") || trimmed.includes("<rtept")) {
    return parseGpx(content);
  }
  return parseKml(content);
}
