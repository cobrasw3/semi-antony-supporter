// Config de l'événement embarquée dans le bundle : c'est la même source que
// courses/<slug>/event.json, servi en /data/event.json (servi tel quel, et rechargé à chaud par l'app pour
// diffuser un changement d'horaire sans nouvelle version). L'embarquer
// garantit un affichage immédiat, y compris hors-ligne au premier lancement.
import rawAnnonces from "@course/annonces.json";
import rawEvent from "@course/event.json";
import { parseAnnonces } from "../lib/annonces";
import { parseEventConfig } from "../lib/event";

export const BUNDLED_EVENT = parseEventConfig(rawEvent);
export const BUNDLED_ANNONCES = parseAnnonces(rawAnnonces);
