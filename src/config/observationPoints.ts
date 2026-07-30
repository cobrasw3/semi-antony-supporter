// Points d'observation affichés sur la carte. Chaque point est défini une
// seule fois avec sa distance sur UNE boucle (distanceInLoopKm) ; comme le
// parcours fait plusieurs boucles, timing.ts se charge de calculer les
// passages cumulés (d, d+7, d+14, ...).
//
// ⚠️ PLACEHOLDER : coordonnées et notes d'accès à valider/remplacer avec les
// vrais points choisis pour le semi d'Antony.

export interface ObservationPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Distance depuis le départ, à l'intérieur d'UNE boucle (en km). */
  distanceInLoopKm: number;
  /** Indication d'accès libre, affichée au clic sur le marqueur. */
  accessNote: string;
}

export const OBSERVATION_POINTS: ObservationPoint[] = [
  {
    id: "stade-suant",
    name: "Stade Georges Suant (départ / arrivée)",
    lat: 48.753,
    lng: 2.297,
    distanceInLoopKm: 0,
    accessNote:
      "Meilleur point pour voir le départ et chaque fin de boucle. Accès direct, tribunes disponibles.",
  },
  {
    id: "parc-heller",
    name: "Parc Heller",
    lat: 48.756,
    lng: 2.301,
    distanceInLoopKm: 2,
    accessNote: "Entrée par l'allée principale du parc. Bonne visibilité, coin ombragé.",
  },
  {
    id: "point-3-placeholder",
    name: "⟨Point 3 à définir⟩",
    lat: 48.7515,
    lng: 2.291,
    distanceInLoopKm: 5,
    accessNote: "Placeholder — à remplacer une fois le vrai point choisi.",
  },
];
