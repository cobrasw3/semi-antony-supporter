// Modèle de la configuration d'un événement (public/data/event.json) et sa
// validation. Tout ce qui est propre à une course (tracé, spots, horaires,
// marges…) vit dans ce fichier JSON : réutiliser l'app pour un autre
// événement = remplacer ce fichier, sans toucher au code.

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MarginConfig {
  /** Part du temps écoulé appliquée comme demi-largeur de marge (ex. 0.035 = ±3,5 %). */
  percentage: number;
  /** Plancher de la demi-largeur, en minutes, même tout près du départ. */
  minMinutes: number;
}

export interface WalkingConfig {
  /** Vitesse de marche du supporter, en km/h. */
  speedKmh: number;
  /** Facteur appliqué à la distance à vol d'oiseau pour approximer le trajet réel. */
  detourFactor: number;
  /** Marge (min) à avoir en arrivant avant le début de la fourchette suivante. */
  safetyMarginMinutes: number;
}

export interface Spot {
  id: string;
  name: string;
  /** Nom court pour les phrases (« Léa passe au Parc Heller vers… »). */
  shortName: string;
  address: string;
  lat: number;
  lng: number;
  /** Comment s'y rendre. */
  access: string;
  /** Conseil pratique pour un supporter sur place. */
  description: string;
  /** Meilleur spot (mis en avant). */
  highlight?: boolean;
  /** Positions (km depuis le départ) où le parcours passe par ce spot. */
  km: number[];
}

export interface Race {
  id: string;
  name: string;
  distanceKm: number;
  /** Heure de départ "HH:MM". */
  startTime: string;
  /** Nombre de boucles (1 si parcours simple). */
  loops: number;
  /** Longueur officielle d'une boucle, en km. */
  loopLengthKm: number;
  /** Dénivelé positif total, en mètres. */
  elevationGainM?: number;
  /** TODO organisateur : le dénivelé n'est pas encore vérifié. */
  elevationToConfirm?: boolean;
  defaultPace: string;
  defaultTargetTime: string;
  /** Tracé d'UNE boucle, en paires [lat, lng]. */
  track: Array<[number, number]>;
  spots: Spot[];
}

export interface EventConfig {
  contentVersion: string;
  contentUpdatedAt: string;
  event: {
    id: string;
    name: string;
    shortName: string;
    city: string;
    /** Date "AAAA-MM-JJ" (heure locale du fuseau `timeZone`). */
    date: string;
    dateToConfirm?: boolean;
    timeZone: string;
  };
  settings: {
    margin: MarginConfig;
    walking: WalkingConfig;
    pace: { minMinPerKm: number; maxMinPerKm: number };
  };
  races: Race[];
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`event.json invalide : ${message}`);
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;

/**
 * Valide (sans dépendance) la structure d'un event.json. Lève une erreur
 * explicite au premier problème : un fichier distant mal formé ne doit
 * jamais remplacer une config valide déjà affichée.
 */
export function parseEventConfig(raw: unknown): EventConfig {
  const c = raw as EventConfig;
  assert(c && typeof c === "object", "objet attendu");
  assert(isStr(c.contentVersion), "contentVersion manquant");
  assert(c.event && isStr(c.event.name) && /^\d{4}-\d{2}-\d{2}$/.test(c.event.date), "event.name / event.date");
  assert(c.settings?.margin && isNum(c.settings.margin.percentage), "settings.margin");
  assert(c.settings?.walking && isNum(c.settings.walking.speedKmh) && c.settings.walking.speedKmh > 0, "settings.walking");
  assert(Array.isArray(c.races) && c.races.length > 0, "au moins une course attendue");
  for (const race of c.races) {
    assert(isStr(race.id) && isNum(race.distanceKm) && race.distanceKm > 0, `course ${race.id} : distanceKm`);
    assert(/^\d{1,2}:\d{2}$/.test(race.startTime), `course ${race.id} : startTime "HH:MM"`);
    assert(Number.isInteger(race.loops) && race.loops >= 1, `course ${race.id} : loops`);
    assert(Array.isArray(race.track) && race.track.length >= 2, `course ${race.id} : track`);
    assert(Array.isArray(race.spots), `course ${race.id} : spots`);
    for (const spot of race.spots) {
      assert(isStr(spot.id) && isNum(spot.lat) && isNum(spot.lng), `spot ${spot.id} : id/coordonnées`);
      assert(
        Array.isArray(spot.km) && spot.km.length > 0 && spot.km.every((k) => isNum(k) && k >= 0 && k <= race.distanceKm + 1e-6),
        `spot ${spot.id} : km doit lister des positions entre 0 et ${race.distanceKm}`
      );
    }
  }
  return c;
}

/** Tracé d'une course au format {lat, lng}. */
export function trackOf(race: Race): LatLng[] {
  return race.track.map(([lat, lng]) => ({ lat, lng }));
}

/** Course demandée (par id), ou la première de l'événement. */
export function findRace(config: EventConfig, raceId: string | null | undefined): Race {
  return config.races.find((r) => r.id === raceId) ?? config.races[0];
}
