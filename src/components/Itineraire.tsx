import { useMemo, useState } from "react";
import type { Spot, WalkingConfig } from "../lib/event";
import { RunnerLabel } from "../lib/format";
import { chronologicalTransitions, optimalPlan, type Transition } from "../lib/itinerary";
import { minutesToTimeString, type Passage } from "../lib/timing";

interface ItineraireProps {
  passages: Passage[];
  spots: Spot[];
  walking: WalkingConfig;
  runnerName: string;
  spotNumbers: Record<string, number>;
  onSelectSpot: (spotId: string) => void;
  onOpen?: () => void;
  onPlan?: () => void;
}

const STATUS_ICON = { ok: "✅", tight: "⚠️", impossible: "❌" } as const;

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round((km * 1000) / 10) * 10} m` : `${km.toFixed(1).replace(".", ",")} km`;
}

function TransitionRow({ t, safety }: { t: Transition; safety: number }) {
  if (t.sameSpot) {
    return (
      <p className="iti-transition iti-ok">
        <span aria-hidden="true">{STATUS_ICON[t.status]}</span> Reste sur place
      </p>
    );
  }
  const slack = Math.round(t.slackMinutes);
  const verdict =
    t.status === "ok"
      ? `${slack} min d'avance`
      : t.status === "tight"
        ? `juste : moins de ${safety} min de marge`
        : `trop tard (arrivée vers ${minutesToTimeString(t.arrivalMinutes)})`;
  return (
    <p className={`iti-transition iti-${t.status}`}>
      <span aria-hidden="true">{STATUS_ICON[t.status]}</span> 🚶 {Math.ceil(t.walk.minutes)} min à pied (
      {formatDistance(t.walk.walkKm)}) — {verdict}
    </p>
  );
}

function PassageRow({
  p,
  spot,
  number,
  onSelectSpot,
  step,
}: {
  p: Passage;
  spot: Spot | undefined;
  number: number | undefined;
  onSelectSpot: (id: string) => void;
  step?: number;
}) {
  return (
    <div className={p.kind === "finish" ? "iti-passage iti-finish" : "iti-passage"}>
      {step !== undefined && <span className="iti-step">Étape {step}</span>}
      <span className="iti-time">
        {p.windowStart}–{p.windowEnd}
      </span>
      <button type="button" className="link-btn iti-spot" onClick={() => onSelectSpot(p.spotId)}>
        <span className="spot-num" aria-hidden="true">
          {number}
        </span>
        {spot?.shortName ?? p.spotId}
      </button>
      <span className="iti-label">{p.label}</span>
    </div>
  );
}

export function Itineraire({ passages, spots, walking, runnerName, spotNumbers, onSelectSpot, onOpen, onPlan }: ItineraireProps) {
  const [showPlan, setShowPlan] = useState(false);
  const spotById = useMemo(() => Object.fromEntries(spots.map((s) => [s.id, s])), [spots]);
  const transitions = useMemo(() => chronologicalTransitions(passages, spots, walking), [passages, spots, walking]);
  const plan = useMemo(() => optimalPlan(passages, spots, walking), [passages, spots, walking]);

  if (passages.length === 0) return null;

  const rows = showPlan ? plan.steps : passages;
  const rowTransitions = showPlan ? plan.transitions : transitions;

  return (
    <details className="itineraire" onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && onOpen?.()}>
      <summary>🚶 Itinéraire : quels spots enchaîner ?</summary>
      <div className="iti-body">
        <div className="mode-toggle" role="group" aria-label="Affichage de l'itinéraire">
          <button
            type="button"
            className={!showPlan ? "mode-btn active" : "mode-btn"}
            aria-pressed={!showPlan}
            onClick={() => setShowPlan(false)}
          >
            Tous les passages
          </button>
          <button
            type="button"
            className={showPlan ? "mode-btn active" : "mode-btn"}
            aria-pressed={showPlan}
            onClick={() => {
              setShowPlan(true);
              onPlan?.();
            }}
          >
            Plan optimal
          </button>
        </div>

        {showPlan ? (
          <p className="iti-intro">
            <strong>
              {RunnerLabel(runnerName)} vu {plan.steps.length} fois
            </strong>{" "}
            en marchant environ {formatDistance(plan.totalWalkKm)}. On part dès que le coureur est passé.
          </p>
        ) : (
          <p className="iti-intro">
            Tous les passages dans l'ordre. Entre deux lignes : le temps de marche et s'il est possible d'y être à temps
            (✅ avec {walking.safetyMarginMinutes} min de marge, ⚠️ juste, ❌ impossible).
          </p>
        )}

        <ol className="iti-list">
          {rows.map((p, i) => (
            <li key={`${p.spotId}-${p.km}`} className="iti-item">
              {i > 0 && <TransitionRow t={rowTransitions[i - 1]} safety={walking.safetyMarginMinutes} />}
              <PassageRow
                p={p}
                spot={spotById[p.spotId]}
                number={spotNumbers[p.spotId]}
                onSelectSpot={onSelectSpot}
                step={showPlan ? i + 1 : undefined}
              />
            </li>
          ))}
        </ol>
        <p className="iti-note">
          Temps de marche estimés à vol d'oiseau × {String(walking.detourFactor).replace(".", ",")}, à{" "}
          {String(walking.speedKmh).replace(".", ",")} km/h. Les rues fermées à la circulation peuvent allonger le trajet.
        </p>
      </div>
    </details>
  );
}
