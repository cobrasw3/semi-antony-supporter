// Rappels « il arrive dans 10 min » (logique reprise de l'ancien composant
// Rappels, séparée de l'affichage) : alertes tant que l'app est ouverte +
// export agenda .ics. Voir src/lib/reminders.ts pour la limite assumée.

import { useCallback, useEffect, useRef, useState } from "react";
import { spotWhere } from "../lib/event";
import { RunnerLabel } from "../lib/format";
import { buildIcs, dueReminders, passageKey } from "../lib/reminders";
import { readJson, readSession, writeJson, writeSession } from "../lib/storage";
import { currentNotificationSupport } from "../pwa/platform";
import { haptic } from "../ui/haptics";
import type { Supporter } from "./useSupporter";

const ENABLED_KEY = "semi-supporter:alertes";
const ALERTED_KEY = "semi-supporter:alertes-envoyees";

async function notify(title: string, body: string, tag: string) {
  haptic([200, 100, 200]);
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) await registration.showNotification(title, { body, tag, icon: "/icons/icon-192.png" });
    else new Notification(title, { body, tag, icon: "/icons/icon-192.png" });
  } catch {
    // refusé par le système : l'alerte dans l'app suffit
  }
}

export function useReminders(s: Supporter) {
  const { plan, clock, config, spotById, runnerName } = s;
  const passages = plan.steps;
  const [enabled, setEnabled] = useState(() => readJson<boolean>(ENABLED_KEY) === true);
  const [alert, setAlert] = useState<string | null>(null);
  const alerted = useRef(new Set<string>(JSON.parse(readSession(ALERTED_KEY) ?? "[]") as string[]));
  const support = currentNotificationSupport();
  const Name = RunnerLabel(runnerName);

  useEffect(() => {
    if (!enabled || clock.date !== config.event.date) return;
    for (const p of dueReminders(passages, clock.minutes, alerted.current)) {
      alerted.current.add(passageKey(p));
      const spot = spotById[p.spotId];
      const delay = Math.max(1, Math.round(p.estimatedMinutes - clock.minutes));
      const text = `${Name} passe ${spot ? spotWhere(spot) : ""} dans ${delay} min (vers ${p.estimatedTime}).`;
      setAlert(text);
      notify(`${Name} arrive !`, text, passageKey(p));
    }
    writeSession(ALERTED_KEY, JSON.stringify([...alerted.current]));
  }, [enabled, clock, passages, config.event.date, spotById, Name]);

  const enable = useCallback(async () => {
    if (support === "supported" && Notification.permission === "default") await Notification.requestPermission();
    setEnabled(true);
    writeJson(ENABLED_KEY, true);
  }, [support]);

  const disable = useCallback(() => {
    setEnabled(false);
    writeJson(ENABLED_KEY, false);
  }, []);

  const downloadIcs = useCallback(() => {
    const ics = buildIcs({
      items: passages.map((p) => {
        const spot = spotById[p.spotId];
        return { passage: p, title: `${Name} passe ${spot ? spotWhere(spot) : ""}`.trim(), location: spot?.address ?? "" };
      }),
      eventId: config.event.id,
      eventDate: config.event.date,
      timeZone: config.event.timeZone,
    });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.event.id}-passages.ics`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, [passages, spotById, Name, config.event]);

  return { enabled, enable, disable, alert, dismissAlert: () => setAlert(null), downloadIcs, support, count: passages.length };
}
