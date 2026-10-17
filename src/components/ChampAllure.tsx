import { autoFormatTimeInput, formatDuration, formatPace, type InputMode, type RunnerPrefs } from "../lib/format";

interface ChampAllureProps {
  prefs: RunnerPrefs;
  onChange: (patch: Partial<RunnerPrefs>) => void;
  totalDistanceKm: number;
  /** Allure résolue (null si la saisie est invalide). */
  activePace: number | null;
  /** Message d'erreur de saisie, s'il y en a un. */
  error: string | null;
}

export function ChampAllure({ prefs, onChange, totalDistanceKm, activePace, error }: ChampAllureProps) {
  const { mode } = prefs;
  const setMode = (m: InputMode) => onChange({ mode: m });
  const errorId = "champ-allure-erreur";

  return (
    <div className="champ-allure">
      <label className="champ-input-label champ-runner-label">
        Qui encourages-tu ? (optionnel)
        <input
          className="champ-input champ-runner-input"
          type="text"
          name="prenom"
          autoComplete="off"
          enterKeyHint="done"
          maxLength={40}
          placeholder="Prénom du coureur"
          value={prefs.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </label>

      <div className="mode-toggle" role="group" aria-label="Choix de saisie">
        <button
          type="button"
          className={mode === "pace" ? "mode-btn active" : "mode-btn"}
          aria-pressed={mode === "pace"}
          onClick={() => setMode("pace")}
        >
          Allure (min/km)
        </button>
        <button
          type="button"
          className={mode === "duration" ? "mode-btn active" : "mode-btn"}
          aria-pressed={mode === "duration"}
          onClick={() => setMode("duration")}
        >
          Temps visé
        </button>
      </div>

      {mode === "pace" ? (
        <label className="champ-input-label">
          Allure (min:s par km)
          <input
            className="champ-input"
            type="text"
            inputMode="numeric"
            enterKeyHint="done"
            placeholder="5:30"
            aria-invalid={error !== null}
            aria-describedby={error ? errorId : undefined}
            value={prefs.paceText}
            onChange={(e) => onChange({ paceText: autoFormatTimeInput(e.target.value) })}
          />
        </label>
      ) : (
        <label className="champ-input-label">
          Temps visé (h:min)
          <input
            className="champ-input"
            type="text"
            inputMode="numeric"
            enterKeyHint="done"
            placeholder="1:57"
            aria-invalid={error !== null}
            aria-describedby={error ? errorId : undefined}
            value={prefs.durationText}
            onChange={(e) => onChange({ durationText: autoFormatTimeInput(e.target.value) })}
          />
          {activePace !== null && <span className="champ-hint">≈ allure {formatPace(activePace)} min/km</span>}
        </label>
      )}

      {activePace !== null && (
        <p className="champ-total" aria-live="polite">
          Temps total estimé : <strong>{formatDuration(activePace * totalDistanceKm)}</strong>
        </p>
      )}

      {error && (
        <p className="champ-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
