import { useCallback, useEffect, useMemo, useState } from "react";
import { APropos } from "./components/APropos";
import { Carte } from "./components/Carte";
import { ChampAllure } from "./components/ChampAllure";
import { Partage } from "./components/Partage";
import { RecapPassages, type RecapPoint } from "./components/RecapPassages";
import { LOOP_COUNT, LOOP_LENGTH_KM, LOOP_POINTS, TOTAL_DISTANCE_KM } from "./config/course";
import { OBSERVATION_POINTS } from "./config/observationPoints";
import { MARGE_MIN_MINUTES, MARGE_POURCENTAGE, RACE_NAME, RACE_START_TIME } from "./config/settings";
import { buildShareUrl } from "./lib/format";
import { computeAllCrossings, timeStringToMinutes, type PointCrossings } from "./lib/timing";
import "./App.css";

function App() {
  const [paceMinPerKm, setPaceMinPerKm] = useState<number | null>(5.5);
  const [runnerName, setRunnerName] = useState("");

  const handlePaceChange = useCallback((pace: number | null) => {
    setPaceMinPerKm(pace);
  }, []);

  const handleRunnerNameChange = useCallback((name: string) => {
    setRunnerName(name);
  }, []);

  // Reflète l'allure et le prénom du coureur dans l'URL (?pace=...&runner=...),
  // pour que le lien partagé (bouton "Partager") rouvre directement sur les
  // mêmes horaires, personnalisés.
  useEffect(() => {
    const url = buildShareUrl(paceMinPerKm, runnerName);
    if (url) window.history.replaceState(null, "", url);
  }, [paceMinPerKm, runnerName]);

  const crossings: PointCrossings[] = useMemo(() => {
    if (!paceMinPerKm) return [];
    return computeAllCrossings(OBSERVATION_POINTS, {
      startTimeMinutes: timeStringToMinutes(RACE_START_TIME),
      paceMinPerKm,
      loopCount: LOOP_COUNT,
      loopLengthKm: LOOP_LENGTH_KM,
      margin: { percentage: MARGE_POURCENTAGE, minMinutes: MARGE_MIN_MINUTES },
    });
  }, [paceMinPerKm]);

  const crossingsByPointId = useMemo(
    () => Object.fromEntries(crossings.map((c) => [c.pointId, c])),
    [crossings]
  );

  const recapPoints: RecapPoint[] = useMemo(
    () =>
      OBSERVATION_POINTS.map((point) => ({
        id: point.id,
        name: point.name,
        acces: point.acces,
        astuce: point.astuce,
        pointFort: point.pointFort,
        crossings: crossingsByPointId[point.id]?.crossings ?? [],
      })),
    [crossingsByPointId]
  );

  const pointFort = OBSERVATION_POINTS.find((p) => p.pointFort);
  const shareUrl = useMemo(() => buildShareUrl(paceMinPerKm, runnerName), [paceMinPerKm, runnerName]);
  const trimmedRunnerName = runnerName.trim();

  return (
    <div className="app">
      <header className="app-header">
        <h1>{RACE_NAME}</h1>
        <p>Départ {RACE_START_TIME} — où se placer, et à quelle heure ton coureur passe.</p>
      </header>

      {trimmedRunnerName && (
        <div className="runner-banner">
          🏃 Tu suis <strong>{trimmedRunnerName}</strong> — voici où et quand l'encourager.
        </div>
      )}

      {pointFort && (
        <div className="best-spot-banner">
          ⭐ Meilleur spot : <strong>{pointFort.name}</strong> — reste ici, tu vois ton coureur
          passer 3 fois sans bouger.
        </div>
      )}

      <Carte loopPoints={LOOP_POINTS} points={OBSERVATION_POINTS} crossingsByPointId={crossingsByPointId} />

      <ChampAllure
        totalDistanceKm={TOTAL_DISTANCE_KM}
        onPaceChange={handlePaceChange}
        onRunnerNameChange={handleRunnerNameChange}
      />

      <Partage url={shareUrl} />

      <RecapPassages points={recapPoints} />

      <footer className="app-footer">
        <p>Prototype de démonstration — parcours et points d'observation à confirmer.</p>
        <APropos />
      </footer>
    </div>
  );
}

export default App;
