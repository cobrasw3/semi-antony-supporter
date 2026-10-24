// Saisie de l'objectif (temps visé ou allure), partagée par l'assistant et
// le tiroir « Modifier ». Affichage seulement.

import { formatDuration, formatPace, parseDuration, parsePace } from "../lib/format";
import { minutesToTimeString } from "../lib/timing";
import { Chip, Segmented, Stepper } from "../ui/components";
import type { Supporter } from "./useSupporter";

const TIME_PRESETS = [90, 105, 120, 135, 150];

export function GoalControls({ s }: { s: Supporter }) {
  const { prefs, updatePrefs, race, config, pace, startMinutes } = s;
  const bounds = config.settings.pace;
  const minSec = Math.round(bounds.minMinPerKm * 60);
  const maxSec = Math.round(bounds.maxMinPerKm * 60);
  const minTime = Math.ceil(bounds.minMinPerKm * race.distanceKm);
  const maxTime = Math.floor(bounds.maxMinPerKm * race.distanceKm);
  const paceSec = Math.round((parsePace(prefs.paceText) ?? parsePace(race.defaultPace) ?? 5.5) * 60);
  const targetMin = parseDuration(prefs.durationText) ?? parseDuration(race.defaultTargetTime) ?? 117;
  const arrival = pace ? minutesToTimeString(startMinutes + pace * race.distanceKm) : null;

  return (
    <div className="goal">
      <Segmented
        label="Type d'objectif"
        value={prefs.mode}
        onChange={(mode) =>
          // Garde la cohérence : en changeant de mode, on reprend l'objectif équivalent.
          updatePrefs(
            pace
              ? mode === "pace"
                ? { mode, paceText: formatPace(Math.min(bounds.maxMinPerKm, Math.max(bounds.minMinPerKm, Math.round(pace * 12) / 12))) }
                : { mode, durationText: formatDuration(Math.round(pace * race.distanceKm)) }
              : { mode }
          )
        }
        options={[
          { value: "duration", label: "Temps visé" },
          { value: "pace", label: "Allure" },
        ]}
      />
      {prefs.mode === "duration" ? (
        <>
          <div className="chips chips--fit" role="group" aria-label="Temps courants">
            {TIME_PRESETS.filter((t) => t >= minTime && t <= maxTime).map((t) => (
              <Chip key={t} selected={t === targetMin} onClick={() => updatePrefs({ durationText: formatDuration(t) })}>
                {formatDuration(t).replace(":", "h")}
              </Chip>
            ))}
          </div>
          <Stepper
            label="Temps visé"
            value={targetMin}
            onChange={(v) => updatePrefs({ durationText: formatDuration(v) })}
            min={minTime}
            max={maxTime}
            step={1}
            unit="heures : minutes"
            format={formatDuration}
            valueText={(v) => `${Math.floor(v / 60)} heure ${v % 60} minutes`}
          />
        </>
      ) : (
        <Stepper
          label="Allure"
          value={paceSec}
          onChange={(v) => updatePrefs({ paceText: formatPace(v / 60) })}
          min={minSec}
          max={maxSec}
          step={5}
          unit="min / km"
          format={(v) => formatPace(v / 60)}
          valueText={(v) => `${Math.floor(v / 60)} minutes ${v % 60} secondes par kilomètre`}
        />
      )}
      <p className="goal__estimate" aria-live="polite">
        <span>Arrivée estimée</span>
        <span className="num">{arrival ?? "—"}</span>
        {pace && (
          <span className="caption">
            {prefs.mode === "duration" ? `soit ${formatPace(pace)} min/km` : `soit ${formatDuration(pace * race.distanceKm)} de course`}
          </span>
        )}
      </p>
    </div>
  );
}
