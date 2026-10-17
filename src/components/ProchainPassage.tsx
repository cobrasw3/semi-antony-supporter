import type { ReactNode } from "react";
import { formatLongDate } from "../lib/clock";
import { computeDayStatus, formatDelay } from "../lib/dayStatus";
import { spotWhere, type Spot } from "../lib/event";
import { RunnerLabel, runnerLabel } from "../lib/format";
import { minutesToTimeString, type Passage } from "../lib/timing";
import type { EventClock } from "../lib/clock";

interface ProchainPassageProps {
  passages: Passage[];
  spots: Spot[];
  startMinutes: number;
  clock: EventClock;
  eventDate: string;
  dateToConfirm?: boolean;
  runnerName: string;
  onSelectSpot?: (spotId: string) => void;
}

export function ProchainPassage({
  passages,
  spots,
  startMinutes,
  clock,
  eventDate,
  dateToConfirm,
  runnerName,
  onSelectSpot,
}: ProchainPassageProps) {
  const status = computeDayStatus(passages, startMinutes, clock, eventDate);
  if (!status) return null;

  const spotById = (id: string) => spots.find((s) => s.id === id);
  const Name = RunnerLabel(runnerName);
  /** Lien vers le détail du spot ; `phrase` = « au parc Heller » plutôt que « Parc Heller ». */
  const spotLink = (passage: Passage, phrase = false) => {
    const spot = spotById(passage.spotId);
    if (!spot) return null;
    return (
      <button type="button" className="link-btn" onClick={() => onSelectSpot?.(spot.id)}>
        {phrase ? spotWhere(spot) : spot.shortName}
      </button>
    );
  };
  const range = (p: Passage) => `${p.windowStart}–${p.windowEnd}`;

  let body: ReactNode;
  switch (status.kind) {
    case "notRaceDay": {
      const firstSpot = spotById(status.first.spotId);
      const when =
        status.daysUntil > 0
          ? `Course le ${formatLongDate(eventDate)}${dateToConfirm ? " (date à confirmer)" : ""}`
          : `La course a eu lieu le ${formatLongDate(eventDate)}`;
      body = (
        <>
          <p className="np-title">{when}</p>
          <p className="np-main">
            Départ {minutesToTimeString(startMinutes)} · arrivée de {runnerLabel(runnerName)} estimée vers{" "}
            <strong>{status.finish.estimatedTime}</strong>
          </p>
          {status.daysUntil > 0 && (
            <p className="np-sub">
              Le jour J, cette carte t'indiquera en direct le prochain passage. Premier passage : {range(status.first)}{" "}
              {firstSpot ? spotWhere(firstSpot) : ""}.
            </p>
          )}
        </>
      );
      break;
    }
    case "beforeStart":
      body = (
        <>
          <p className="np-title">Départ dans {formatDelay(status.minutesToStart)}</p>
          <p className="np-main">
            Premier passage : {spotLink(status.next)}, <strong>{range(status.next)}</strong>
          </p>
        </>
      );
      break;
    case "finished":
      body = (
        <>
          <p className="np-title">Course terminée 🏁</p>
          <p className="np-main">
            Arrivée de {runnerLabel(runnerName)} estimée à <strong>{status.finish.estimatedTime}</strong>. Bravo !
          </p>
        </>
      );
      break;
    case "live":
      body = (
        <>
          {status.current && (
            <p className="np-now">
              🔔 En ce moment : {Name} peut passer {spotLink(status.current, true)} ({status.current.label}) jusqu'à{" "}
              {status.current.windowEnd}
            </p>
          )}
          {status.next && status.minutesToNext !== null ? (
            <>
              <p className="np-title">Prochain passage : dans {formatDelay(status.minutesToNext)}</p>
              <p className="np-main">
                {Name} passe {spotLink(status.next, true)} vers <strong>{status.next.estimatedTime}</strong>
              </p>
              <p className="np-sub">
                Fourchette {range(status.next)} · {status.next.label}
              </p>
            </>
          ) : (
            <p className="np-title">Dernier passage en cours</p>
          )}
        </>
      );
      break;
  }

  return (
    <section className={`prochain-passage np-${status.kind}`} aria-label="Prochain passage">
      {body}
    </section>
  );
}
