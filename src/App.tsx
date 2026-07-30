import { useCallback, useMemo, useState } from "react";
import { Carte } from "./components/Carte";
import { ChampAllure } from "./components/ChampAllure";
import { RecapPassages } from "./components/RecapPassages";
import { LOOP_COUNT, LOOP_LENGTH_KM, LOOP_POINTS, TOTAL_DISTANCE_KM } from "./config/course";
import { OBSERVATION_POINTS } from "./config/observationPoints";
import { MARGIN_CONFIG, RACE_NAME, RACE_START_TIME } from "./config/settings";
import { computeAllCrossings, timeStringToMinutes, type PointCrossings } from "./lib/timing";
import "./App.css";

function App() {
  const [paceMinPerKm, setPaceMinPerKm] = useState<number | null>(5.5);

  const handlePaceChange = useCallback((pace: number | null) => {
    setPaceMinPerKm(pace);
  }, []);

  const crossings: PointCrossings[] = useMemo(() => {
    if (!paceMinPerKm) return [];
    return computeAllCrossings(OBSERVATION_POINTS, {
      startTimeMinutes: timeStringToMinutes(RACE_START_TIME),
      paceMinPerKm,
      loopCount: LOOP_COUNT,
      loopLengthKm: LOOP_LENGTH_KM,
      totalDistanceKm: TOTAL_DISTANCE_KM,
      margin: MARGIN_CONFIG,
    });
  }, [paceMinPerKm]);

  const crossingsByPointId = useMemo(
    () => Object.fromEntries(crossings.map((c) => [c.pointId, c])),
    [crossings]
  );

  return (
    <div className="app">
      <header className="app-header">
        <h1>{RACE_NAME}</h1>
        <p>Départ {RACE_START_TIME} — où se placer, et à quelle heure votre coureur passe.</p>
      </header>

      <Carte loopPoints={LOOP_POINTS} points={OBSERVATION_POINTS} crossingsByPointId={crossingsByPointId} />

      <ChampAllure totalDistanceKm={TOTAL_DISTANCE_KM} onPaceChange={handlePaceChange} />

      <RecapPassages crossings={crossings} />

      <footer className="app-footer">
        <p>Prototype de démonstration — parcours et points d'observation à confirmer.</p>
      </footer>
    </div>
  );
}

export default App;
