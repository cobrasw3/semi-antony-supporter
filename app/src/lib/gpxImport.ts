// Import d'un tracé GPX pour une nouvelle course : distance, dénivelé,
// simplification, recalage sur la distance officielle, et spots candidats
// (points de passages multiples + points réguliers). Fonctions pures,
// testées ; utilisées par scripts/import-gpx.ts.

import { cumulativeDistancesKm, haversineDistanceKm, type LatLng } from "./geo.ts";

export interface GpxPoint extends LatLng {
  ele?: number;
}

/** Points d'un GPX (trkpt, sinon rtept), avec l'altitude si elle est donnée. */
export function parseGpxPoints(xml: string): GpxPoint[] {
  const read = (tag: string) => {
    const points: GpxPoint[] = [];
    const re = new RegExp(`<${tag}\\b([^>]*?)(\\/>|>([\\s\\S]*?)<\\/${tag}>)`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
      const lat = m[1].match(/\blat="(-?\d+(?:\.\d+)?)"/)?.[1];
      const lon = m[1].match(/\blon="(-?\d+(?:\.\d+)?)"/)?.[1];
      if (!lat || !lon) continue;
      const ele = m[3]?.match(/<ele>\s*(-?\d+(?:\.\d+)?)\s*<\/ele>/)?.[1];
      points.push({ lat: Number(lat), lng: Number(lon), ...(ele !== undefined ? { ele: Number(ele) } : {}) });
    }
    return points;
  };
  const trk = read("trkpt");
  return trk.length >= 2 ? trk : read("rtept");
}

/**
 * Dénivelé positif (m), lissé contre le bruit GPS : moyenne glissante des
 * altitudes sur ± `windowM` mètres, puis on ne compte une montée qu'une fois
 * passée d'au moins `thresholdM` au-dessus du dernier creux (hystérésis).
 * null si le fichier n'a pas d'altitudes.
 */
export function elevationGainM(points: GpxPoint[], windowM = 50, thresholdM = 2): number | null {
  const withEle = points.filter((p) => p.ele !== undefined);
  if (withEle.length < 2 || withEle.length < points.length * 0.8) return null;
  const cum = cumulativeDistancesKm(withEle).map((k) => k * 1000);
  const smooth: number[] = [];
  let lo = 0;
  let hi = 0;
  let sum = 0;
  for (let i = 0; i < withEle.length; i++) {
    while (hi < withEle.length && cum[hi] <= cum[i] + windowM) sum += withEle[hi++].ele!;
    while (cum[lo] < cum[i] - windowM) sum -= withEle[lo++].ele!;
    smooth.push(sum / (hi - lo));
  }
  let gain = 0;
  let ref = smooth[0];
  for (const e of smooth) {
    if (e > ref + thresholdM) {
      gain += e - ref;
      ref = e;
    } else if (e < ref) ref = e;
  }
  return Math.round(gain);
}

/** Simplification de Douglas-Peucker (tolérance en mètres), premier et dernier points gardés. */
export function simplify<T extends LatLng>(points: T[], toleranceM = 5): T[] {
  if (points.length <= 2) return points.slice();
  const lat0 = (points[0].lat * Math.PI) / 180;
  const xy = points.map((p) => ({ x: p.lng * 111320 * Math.cos(lat0), y: p.lat * 110540 }));
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const { x: ax, y: ay } = xy[a];
    const dx = xy[b].x - ax;
    const dy = xy[b].y - ay;
    const len2 = dx * dx + dy * dy;
    let worst = -1;
    let worstD = 0;
    for (let i = a + 1; i < b; i++) {
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((xy[i].x - ax) * dx + (xy[i].y - ay) * dy) / len2));
      const d = Math.hypot(xy[i].x - (ax + t * dx), xy[i].y - (ay + t * dy));
      if (d > worstD) {
        worstD = d;
        worst = i;
      }
    }
    if (worst >= 0 && worstD > toleranceM) {
      keep[worst] = 1;
      stack.push([a, worst], [worst, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Facteur d'échelle tracé → distance officielle, et écart (%) à signaler s'il dépasse 2 %. */
export function scaleToOfficial(trackKm: number, officialKm: number) {
  const factor = officialKm / trackKm;
  const diffPercent = ((trackKm - officialKm) / officialKm) * 100;
  return { factor, diffPercent, warn: Math.abs(diffPercent) > 2 };
}

/** Points rééchantillonnés tous les `stepM` mètres, avec leur km (distance du tracé). */
export function resample(points: LatLng[], stepM = 20): Array<LatLng & { km: number }> {
  const cum = cumulativeDistancesKm(points);
  const total = cum[cum.length - 1];
  const out: Array<LatLng & { km: number }> = [];
  let i = 0;
  for (let d = 0; d <= total + 1e-9; d += stepM / 1000) {
    while (i < points.length - 2 && cum[i + 1] < d) i++;
    const seg = cum[i + 1] - cum[i];
    const t = seg === 0 ? 0 : Math.min(1, (d - cum[i]) / seg);
    out.push({ lat: points[i].lat + (points[i + 1].lat - points[i].lat) * t, lng: points[i].lng + (points[i + 1].lng - points[i].lng) * t, km: d });
  }
  return out;
}

export interface SpotCandidate extends LatLng {
  /** Positions (km officiels depuis le départ) où le parcours passe à cet endroit. */
  km: number[];
  kind: "start" | "finish" | "multiple" | "regular";
}

const round2 = (x: number) => Math.round(x * 100) / 100;

/**
 * Endroits où les coureurs passent plusieurs fois : points à moins de
 * `radiusM` mètres l'un de l'autre mais séparés de plus de `minGapKm` sur le
 * parcours. Ce sont les meilleurs spots pour les supporters. Les km sont
 * convertis en km officiels avec `scale`.
 */
export function detectMultiplePassages(points: LatLng[], scale = 1, radiusM = 40, minGapKm = 1): SpotCandidate[] {
  const pts = resample(points, 20);
  // Paires proches et éloignées sur le parcours.
  const hits: Array<{ i: number; j: number }> = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      if (pts[j].km - pts[i].km < minGapKm) continue;
      if (haversineDistanceKm(pts[i], pts[j]) * 1000 < radiusM) hits.push({ i, j });
    }
  }
  // Regroupement par endroit : chaque point concerné rejoint le groupe le plus proche (< 3 × rayon).
  const groups: Array<{ members: number[] }> = [];
  const centerOf = (g: { members: number[] }) => ({
    lat: g.members.reduce((t, k) => t + pts[k].lat, 0) / g.members.length,
    lng: g.members.reduce((t, k) => t + pts[k].lng, 0) / g.members.length,
  });
  for (const k of [...new Set(hits.flatMap((h) => [h.i, h.j]))].sort((a, b) => a - b)) {
    const g = groups.find((gr) => haversineDistanceKm(centerOf(gr), pts[k]) * 1000 < radiusM * 3);
    if (g) g.members.push(k);
    else groups.push({ members: [k] });
  }
  return groups
    .map((g) => {
      const center = centerOf(g);
      // Un passage = une suite de points consécutifs ; on garde le plus proche du centre.
      const passes: number[][] = [];
      for (const k of [...g.members].sort((a, b) => a - b)) {
        const last = passes.at(-1);
        if (last && pts[k].km - pts[last.at(-1)!].km < minGapKm / 2) last.push(k);
        else passes.push([k]);
      }
      const km = passes.map((run) => {
        const best = run.reduce((a, b) => (haversineDistanceKm(pts[a], center) <= haversineDistanceKm(pts[b], center) ? a : b));
        return round2(pts[best].km * scale);
      });
      return { ...center, km, kind: "multiple" as const };
    })
    .filter((c) => c.km.length >= 2)
    .sort((a, b) => b.km.length - a.km.length || a.km[0] - b.km[0]);
}

/**
 * Spots candidats réguliers : départ, arrivée, et un point environ tous les
 * `everyKm` km, en évitant les endroits déjà proposés (passages multiples).
 */
export function regularCandidates(points: LatLng[], scale = 1, everyKm = 2.5, avoid: LatLng[] = []): SpotCandidate[] {
  const cum = cumulativeDistancesKm(points);
  const total = cum[cum.length - 1];
  const at = (d: number): LatLng => {
    let i = 0;
    while (i < points.length - 2 && cum[i + 1] < d) i++;
    const seg = cum[i + 1] - cum[i];
    const t = seg === 0 ? 0 : (d - cum[i]) / seg;
    return { lat: points[i].lat + (points[i + 1].lat - points[i].lat) * t, lng: points[i].lng + (points[i + 1].lng - points[i].lng) * t };
  };
  const far = (p: LatLng) => avoid.every((a) => haversineDistanceKm(a, p) > 0.2);
  const out: SpotCandidate[] = [];
  const start = points[0];
  const end = points[points.length - 1];
  const loop = haversineDistanceKm(start, end) < 0.1;
  out.push({ ...start, km: loop ? [0, round2(total * scale)] : [0], kind: "start" });
  const officialTotal = total * scale;
  for (let k = everyKm; k < officialTotal - everyKm / 2; k += everyKm) {
    const p = at(k / scale);
    if (far(p)) out.push({ ...p, km: [round2(k)], kind: "regular" });
  }
  if (!loop) out.push({ ...end, km: [round2(officialTotal)], kind: "finish" });
  return out;
}

/** « 4,2 » */
export const kmLabel = (km: number) => Number(km.toFixed(1)).toLocaleString("fr-FR");
