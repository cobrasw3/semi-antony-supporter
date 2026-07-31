import { useEffect, useState } from "react";
import { paceFromTargetTime } from "../lib/timing";
import { autoFormatTimeInput, formatDuration, formatPace, parseDuration, parsePace, readPaceFromUrl } from "../lib/format";

type Mode = "pace" | "duration";

interface ChampAllureProps {
  totalDistanceKm: number;
  onPaceChange: (paceMinPerKm: number | null) => void;
}

export function ChampAllure({ totalDistanceKm, onPaceChange }: ChampAllureProps) {
  const [mode, setMode] = useState<Mode>("pace");
  const [paceText, setPaceText] = useState(() => readPaceFromUrl() ?? "5:30");
  const [durationText, setDurationText] = useState("1:57");

  const resolvedPace = mode === "pace" ? parsePace(paceText) : null;
  const resolvedDuration = mode === "duration" ? parseDuration(durationText) : null;
  const paceFromDuration = resolvedDuration ? paceFromTargetTime(resolvedDuration, totalDistanceKm) : null;
  const activePace = mode === "pace" ? resolvedPace : paceFromDuration;

  useEffect(() => {
    onPaceChange(activePace);
    // onPaceChange est stable (useCallback côté App) : seule activePace doit redéclencher.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePace]);

  return (
    <section className="champ-allure" aria-label="Allure du coureur">
      <div className="mode-toggle" role="group" aria-label="Choix de saisie">
        <button
          type="button"
          className={mode === "pace" ? "mode-btn active" : "mode-btn"}
          onClick={() => setMode("pace")}
        >
          Allure (min/km)
        </button>
        <button
          type="button"
          className={mode === "duration" ? "mode-btn active" : "mode-btn"}
          onClick={() => setMode("duration")}
        >
          Temps visé
        </button>
      </div>

      {mode === "pace" ? (
        <label className="champ-input-label">
          Allure (min:sec / km)
          <input
            className="champ-input"
            type="text"
            inputMode="numeric"
            placeholder="5:30"
            value={paceText}
            onChange={(e) => setPaceText(autoFormatTimeInput(e.target.value))}
          />
          {paceFromDuration === null && resolvedPace && (
            <span className="champ-hint">
              ≈ temps total {formatDuration(resolvedPace * totalDistanceKm)}
            </span>
          )}
        </label>
      ) : (
        <label className="champ-input-label">
          Temps visé sur le semi (h:min)
          <input
            className="champ-input"
            type="text"
            inputMode="numeric"
            placeholder="1:57"
            value={durationText}
            onChange={(e) => setDurationText(autoFormatTimeInput(e.target.value))}
          />
          {paceFromDuration && (
            <span className="champ-hint">≈ allure {formatPace(paceFromDuration)} min/km</span>
          )}
        </label>
      )}

      {activePace === null && (
        <p className="champ-error">
          Tape juste les chiffres, ex. {mode === "pace" ? "530 pour 5:30" : "157 pour 1:57"}
        </p>
      )}
    </section>
  );
}
