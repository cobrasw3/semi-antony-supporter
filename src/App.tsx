import { useCallback, useEffect, useMemo, useState } from "react";
import { APropos } from "./components/APropos";
import { Carte } from "./components/Carte";
import { ChampAllure } from "./components/ChampAllure";
import { Partage } from "./components/Partage";
import { RecapPassages } from "./components/RecapPassages";
import { BUNDLED_EVENT } from "./config/event";
import { findRace, trackOf } from "./lib/event";
import { buildShareUrl } from "./lib/format";
import { computeAllPassages, groupPassagesBySpot } from "./lib/timing";
import "./App.css";

function readRaceFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("race");
}

function App() {
  const config = BUNDLED_EVENT;
  const [raceId, setRaceId] = useState<string | null>(readRaceFromUrl);
  const race = findRace(config, raceId);
  const [paceMinPerKm, setPaceMinPerKm] = useState<number | null>(null);
  const [runnerName, setRunnerName] = useState("");

  const handlePaceChange = useCallback((pace: number | null) => setPaceMinPerKm(pace), []);
  const handleRunnerNameChange = useCallback((name: string) => setRunnerName(name), []);

  // Reflète l'allure et le prénom du coureur dans l'URL, pour que le lien
  // partagé rouvre directement sur les mêmes horaires, personnalisés.
  const shareUrl = useMemo(
    () => buildShareUrl(paceMinPerKm, runnerName, config.races.length > 1 ? race.id : null),
    [paceMinPerKm, runnerName, race.id, config.races.length]
  );
  useEffect(() => {
    if (shareUrl) window.history.replaceState(null, "", shareUrl);
  }, [shareUrl]);

  const passages = useMemo(
    () => (paceMinPerKm ? computeAllPassages(race, paceMinPerKm, config.settings.margin) : []),
    [race, paceMinPerKm, config.settings.margin]
  );
  const passagesBySpot = useMemo(() => groupPassagesBySpot(passages), [passages]);
  const track = useMemo(() => trackOf(race), [race]);

  const highlight = race.spots.find((s) => s.highlight);
  const trimmedRunnerName = runnerName.trim();

  return (
    <div className="app">
      <header className="app-header">
        <h1>{config.event.name}</h1>
        <p>Départ {race.startTime} — où se placer, et à quelle heure ton coureur passe.</p>
      </header>

      {config.races.length > 1 && (
        <div className="race-toggle mode-toggle" role="group" aria-label="Choix de la course">
          {config.races.map((r) => (
            <button
              key={r.id}
              type="button"
              className={r.id === race.id ? "mode-btn active" : "mode-btn"}
              aria-pressed={r.id === race.id}
              onClick={() => setRaceId(r.id)}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      <section className="saisie" aria-label="Ton coureur">
        <ChampAllure
          key={`allure-${race.id}`}
          totalDistanceKm={race.distanceKm}
          defaultPace={race.defaultPace}
          defaultTargetTime={race.defaultTargetTime}
          onPaceChange={handlePaceChange}
          onRunnerNameChange={handleRunnerNameChange}
        />
        <Partage url={shareUrl} />
      </section>

      {trimmedRunnerName && (
        <div className="runner-banner">
          🏃 Tu suis <strong>{trimmedRunnerName}</strong> — voici où et quand l'encourager.
        </div>
      )}

      <details className="carte-section" open>
        <summary>🗺️ Carte du parcours</summary>
        <Carte key={race.id} loopPoints={track} spots={race.spots} passagesBySpot={passagesBySpot} />
      </details>

      {highlight && (
        <div className="best-spot-banner">
          ⭐ Meilleur spot : <strong>{highlight.shortName}</strong> — reste ici, tu vois ton coureur
          passer {highlight.km.length} fois sans bouger.
        </div>
      )}

      <RecapPassages spots={race.spots} passagesBySpot={passagesBySpot} />

      <footer className="app-footer">
        <p>Prototype de démonstration — parcours et points d'observation à confirmer.</p>
        <APropos />
      </footer>
    </div>
  );
}

export default App;
