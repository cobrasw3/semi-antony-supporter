import { useEffect, useState } from "react";
import { eventClock, parseDemoParams, type EventClock } from "../lib/clock";

const DEMO_PARAMS = parseDemoParams(window.location.search);
const DEMO_STARTED_AT = new Date();

export const IS_DEMO = DEMO_PARAMS.demo;

/** Heure de l'événement (réelle ou simulée en démo), rafraîchie toutes les `intervalMs`. */
export function useEventClock(eventDate: string, timeZone: string, intervalMs = 30_000): EventClock {
  const compute = () =>
    eventClock({ realNow: new Date(), demoStartedAt: DEMO_STARTED_AT, demo: DEMO_PARAMS, eventDate, timeZone });
  const [clock, setClock] = useState(compute);

  useEffect(() => {
    const tick = () => setClock(compute());
    tick();
    const id = window.setInterval(tick, intervalMs);
    // Au retour au premier plan, on met à jour tout de suite (minuteries
    // suspendues en arrière-plan sur mobile).
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventDate, timeZone, intervalMs]);

  return clock;
}
