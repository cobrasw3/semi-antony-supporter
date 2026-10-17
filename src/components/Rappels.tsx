import { useEffect, useRef, useState } from "react";
import type { EventClock } from "../lib/clock";
import { spotWhere, type Spot } from "../lib/event";
import { RunnerLabel } from "../lib/format";
import { buildIcs, dueReminders, passageKey, REMINDER_LEAD_MINUTES } from "../lib/reminders";
import { readJson, readSession, writeJson, writeSession } from "../lib/storage";
import type { Passage } from "../lib/timing";
import { currentNotificationSupport } from "../pwa/platform";

interface RappelsProps {
  /** Passages concernés (ceux du plan optimal). */
  passages: Passage[];
  spots: Spot[];
  runnerName: string;
  clock: EventClock;
  event: { id: string; date: string; timeZone: string };
  onTrack: (event: "agenda_telecharge" | "notifications_activees") => void;
}

const ENABLED_KEY = "semi-supporter:alertes";
const ALERTED_KEY = "semi-supporter:alertes-envoyees";

async function notify(title: string, body: string, tag: string) {
  navigator.vibrate?.([200, 100, 200]);
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) await registration.showNotification(title, { body, tag, icon: "/icons/icon-192.png" });
    else new Notification(title, { body, tag, icon: "/icons/icon-192.png" });
  } catch {
    // notification refusée par le système : l'alerte dans l'app suffit
  }
}

export function Rappels({ passages, spots, runnerName, clock, event, onTrack }: RappelsProps) {
  const [enabled, setEnabled] = useState(() => readJson<boolean>(ENABLED_KEY) === true);
  const [alert, setAlert] = useState<string | null>(null);
  const alerted = useRef(new Set<string>(JSON.parse(readSession(ALERTED_KEY) ?? "[]") as string[]));
  const support = currentNotificationSupport();
  const spotById = (id: string) => spots.find((s) => s.id === id);
  const Name = RunnerLabel(runnerName);

  // Alerte dans l'app, vérifiée à chaque tic de l'horloge (30 s).
  useEffect(() => {
    if (!enabled || clock.date !== event.date) return;
    for (const p of dueReminders(passages, clock.minutes, alerted.current)) {
      alerted.current.add(passageKey(p));
      const spot = spotById(p.spotId);
      const delay = Math.max(1, Math.round(p.estimatedMinutes - clock.minutes));
      const text = `${Name} passe ${spot ? spotWhere(spot) : ""} dans ${delay} min (vers ${p.estimatedTime}).`;
      setAlert(text);
      notify(`🏃 ${Name} arrive !`, text, passageKey(p));
    }
    writeSession(ALERTED_KEY, JSON.stringify([...alerted.current]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, clock, passages, event.date]);

  if (passages.length === 0) return null;

  const enable = async () => {
    if (support === "supported" && Notification.permission === "default") await Notification.requestPermission();
    setEnabled(true);
    writeJson(ENABLED_KEY, true);
    onTrack("notifications_activees");
  };
  const disable = () => {
    setEnabled(false);
    writeJson(ENABLED_KEY, false);
  };

  const downloadIcs = () => {
    const ics = buildIcs({
      items: passages.map((p) => {
        const spot = spotById(p.spotId);
        return {
          passage: p,
          title: `${Name} passe ${spot ? spotWhere(spot) : ""}`.trim(),
          location: spot?.address ?? "",
        };
      }),
      eventId: event.id,
      eventDate: event.date,
      timeZone: event.timeZone,
    });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "semi-antony-passages.ics";
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    onTrack("agenda_telecharge");
  };

  return (
    <section className="rappels" aria-labelledby="rappels-titre">
      <h2 id="rappels-titre">🔔 Être prévenu {REMINDER_LEAD_MINUTES} min avant</h2>
      {alert && (
        <p className="rappels-alerte" role="alert">
          {alert}
        </p>
      )}
      <p className="rappels-intro">Pour les {passages.length} passages du plan optimal.</p>

      <button type="button" className="rappels-btn" onClick={downloadIcs}>
        📅 Ajouter à mon agenda
      </button>
      <p className="rappels-note">
        Le plus fiable : ton téléphone sonne {REMINDER_LEAD_MINUTES} min avant chaque passage, même app fermée et sans
        réseau.
      </p>

      {support === "needs-install" ? (
        <p className="rappels-note">
          Sur iPhone, les notifications ne marchent qu'une fois l'app installée (Partager → « Sur l'écran d'accueil »).
        </p>
      ) : enabled ? (
        <p className="rappels-note">
          ✅ Alertes activées tant que l'app reste ouverte.{" "}
          <button type="button" className="link-btn" onClick={disable}>
            Désactiver
          </button>
        </p>
      ) : (
        <>
          <button type="button" className="rappels-btn rappels-btn-secondaire" onClick={enable}>
            Activer les alertes dans l'app
          </button>
          <p className="rappels-note">Notification et vibration, uniquement tant que l'app reste ouverte.</p>
        </>
      )}
    </section>
  );
}
