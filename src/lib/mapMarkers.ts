// Repères dessinés sur le tracé : flèches de sens de course et bornes km.
// Le tracé GPX d'une boucle ne mesure pas exactement la longueur officielle
// (bruit GPS) : on met donc les distances officielles à l'échelle du tracé.

import type { LatLng, Race } from "./event";
import { pointAtDistance, routeLengthKm } from "./geo.ts";

export interface TrackMark extends LatLng {
  bearing: number;
  label?: string;
}

/** Bornes kilométriques ; sur un parcours en boucles : « 1 · 8 · 15 ». */
export function kmMarks(track: LatLng[], race: Pick<Race, "loops" | "loopLengthKm" | "distanceKm">): TrackMark[] {
  const officialLength = race.loops > 1 ? race.loopLengthKm : race.distanceKm;
  const scale = routeLengthKm(track) / officialLength;
  const marks: TrackMark[] = [];
  for (let k = 1; k < officialLength - 0.05; k++) {
    const labels = Array.from({ length: race.loops }, (_, i) => k + i * race.loopLengthKm).filter((km) => km < race.distanceKm);
    marks.push({ ...pointAtDistance(track, k * scale), label: labels.join(" · ") });
  }
  return marks;
}

/** Flèches de sens de course, régulièrement espacées (entre les bornes km). */
export function directionArrows(track: LatLng[], spacingKm = 0.5): TrackMark[] {
  const total = routeLengthKm(track);
  const arrows: TrackMark[] = [];
  for (let d = spacingKm / 2; d < total; d += spacingKm) arrows.push(pointAtDistance(track, d));
  return arrows;
}
