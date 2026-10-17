// Config de l'événement embarquée dans le bundle : c'est la même source que
// public/data/event.json (servi tel quel, et rechargé à chaud par l'app pour
// diffuser un changement d'horaire sans nouvelle version). L'embarquer
// garantit un affichage immédiat, y compris hors-ligne au premier lancement.
import rawEvent from "../../public/data/event.json";
import { parseEventConfig } from "../lib/event";

export const BUNDLED_EVENT = parseEventConfig(rawEvent);
