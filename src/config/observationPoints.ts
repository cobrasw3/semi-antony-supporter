// Points d'observation affichés sur la carte. Chaque point est défini une
// seule fois avec sa distance sur UNE boucle (distanceInLoopKm) ; comme le
// parcours fait plusieurs boucles, timing.ts se charge de calculer les
// passages cumulés (d, d+7, d+14, ...).
//
// ⚠️ À VÉRIFIER SUR LE TERRAIN : coordonnées, accès et astuces sont des
// placeholders réalistes, à confirmer/ajuster avec le club avant la démo.
// Tout champ encore incertain est explicitement marqué ⟨à vérifier⟩.
//
// Pour caler distanceInLoopKm précisément une fois le vrai tracé en place :
// ouvrir l'app avec ?calibrage=1 et cliquer sur la carte au niveau du point
// — la distance-dans-la-boucle correspondante s'affiche instantanément.

export interface ObservationPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Distance depuis le départ, à l'intérieur d'UNE boucle (en km). */
  distanceInLoopKm: number;
  /** Comment se rendre à ce point (transport, entrée...). */
  acces: string;
  /** Conseil pratique pour un supporter sur place. */
  astuce: string;
  /**
   * Marque le meilleur point du parcours : celui où l'on voit son coureur
   * le plus souvent sans bouger. Mis en avant dans l'UI (badge + marqueur
   * distinct sur la carte). Un seul point devrait porter ce flag.
   */
  pointFort?: boolean;
}

export const OBSERVATION_POINTS: ObservationPoint[] = [
  {
    id: "stade-suant",
    name: "Stade Georges Suant (départ / arrivée)",
    lat: 48.753,
    lng: 2.297,
    distanceInLoopKm: 0,
    acces:
      "⟨à vérifier⟩ À ~5 min à pied du RER B Antony, puis rue du Stade. Parkings visiteurs autour du stade.",
    astuce:
      "Le seul endroit d'où on voit son coureur passer 3 fois sans bouger : au départ, et à la fin de chaque boucle.",
    pointFort: true,
  },
  {
    id: "parc-heller",
    name: "Parc Heller",
    lat: 48.756,
    lng: 2.301,
    distanceInLoopKm: 2,
    acces: "⟨à vérifier⟩ Entrée par l'allée principale du parc, côté ⟨rue à préciser⟩.",
    astuce: "Coin ombragé, bonne visibilité sur une portion droite : parfait pour les photos.",
  },
  {
    id: "point-3-a-nommer",
    name: "⟨Point 3 à nommer — carrefour ou lieu-repère sur la boucle⟩",
    lat: 48.7515,
    lng: 2.291,
    distanceInLoopKm: 5,
    acces: "⟨à définir avec le club⟩",
    astuce: "⟨à définir — ex. un carrefour où la route se rétrécit, bon point sonore⟩",
  },
];
