// Points d'observation affichés sur la carte. Chaque point est défini une
// seule fois avec sa distance sur UNE boucle (distanceInLoopKm) ; comme le
// parcours fait plusieurs boucles, timing.ts se charge de calculer les
// passages cumulés (d, d+7, d+14, ...).
//
// Coordonnées et distances calées sur le vrai tracé (src/config/course.ts,
// importé le 2026-07-31 depuis semi-marathon_Antony.gpx) : distanceInLoopKm
// vient de la projection du point réel (adresse officielle / OSM) sur le
// tracé, via projectPointOntoRoute (src/lib/geo.ts). Détail par point :
//
// - Stade Georges Suant : le tracé GPX démarre et se termine à ~49 m de
//   l'adresse officielle (165 avenue François-Molé) — cohérent avec le
//   départ/arrivée réels. distanceInLoopKm = 0 par construction.
// - Rue Marius Hue : point du tracé au ~1er km (portion sud, vers
//   Verrières-le-Buisson), reverse-géocodé depuis les coordonnées du GPX.
// - Parc Heller : centre du parc (source OSM) à 105 m du tracé -> le
//   tracé longe/traverse le parc sans passer par son centre géométrique.
//   distanceInLoopKm ≈ 2.70 km.
// - Rue des Champs : point du tracé le plus proche du 4e km officiel
//   (montée confirmée par l'organisateur, répétée aux 11e et 18e km).
//   distanceInLoopKm = 4.0 km, directement sur le tracé.
// - Rue des Sources Prolongée : ~5.2 km, sur la descente confirmée par
//   l'organisateur entre le 5e et le 7e km.
// - Rue des Hautes Bièvres : ~6.5 km, dernière ligne droite avant la fin
//   de chaque boucle (le stade).
//
// Pour recaler un point plus finement (ou en ajouter un), utiliser le mode
// calibrage : ouvrir l'app avec ?calibrage=1 et cliquer sur la carte.
//
// ⚠️ Accès et astuces restent à valider sur le terrain avec le club — les
// distances/coordonnées, elles, sont désormais basées sur le vrai tracé.

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
    lat: 48.745326,
    lng: 2.285084,
    distanceInLoopKm: 0,
    acces: "165 avenue François-Molé, Antony — départ et arrivée officiels du semi.",
    astuce:
      "Le seul endroit d'où on voit son coureur passer 3 fois sans bouger : au départ, et à la fin de chaque boucle.",
    pointFort: true,
  },
  {
    id: "rue-marius-hue",
    name: "Rue Marius Hue",
    lat: 48.740664,
    lng: 2.275916,
    distanceInLoopKm: 1.0,
    acces: "Rue Marius Hue, Antony — portion sud du parcours, vers Verrières-le-Buisson.",
    astuce: "Juste après le départ : le peloton est encore groupé, ambiance de premier passage garantie.",
  },
  {
    id: "parc-heller",
    name: "Parc Heller",
    lat: 48.7465275,
    lng: 2.2893536,
    distanceInLoopKm: 2.7,
    acces: "Parc Heller, Antony — accessible notamment par la rue Prosper Legouté.",
    astuce: "Le parcours longe/traverse le parc : coin ombragé, bonne visibilité, loin du bruit de la route.",
  },
  {
    id: "rue-des-champs",
    name: "Rue des Champs (montée du 4e km)",
    lat: 48.75303,
    lng: 2.295702,
    distanceInLoopKm: 4.0,
    acces: "Rue des Champs, Antony — sur la portion montante du parcours (dénivelé total ~180 m sur les 21 km).",
    astuce: "Les coureurs ralentissent dans la montée (4e, 11e et 18e km) : le bon endroit pour crier fort et les pousser.",
  },
  {
    id: "rue-des-sources-prolongee",
    name: "Rue des Sources Prolongée (descente)",
    lat: 48.752981,
    lng: 2.284902,
    distanceInLoopKm: 5.2,
    acces: "Rue des Sources Prolongée, Antony.",
    astuce: "Sur la descente confirmée entre le 5e et le 7e km : les coureurs reprennent de la vitesse, bon moment pour les relancer.",
  },
  {
    id: "rue-des-hautes-bievres",
    name: "Rue des Hautes Bièvres (dernière ligne droite)",
    lat: 48.749299,
    lng: 2.288598,
    distanceInLoopKm: 6.5,
    acces: "Rue des Hautes Bièvres, Antony — à ~500 m de la fin de chaque boucle.",
    astuce: "Dernier point avant de refermer la boucle (ou l'arrivée à la 3e fois) : le sprint final se joue souvent ici.",
  },
];
