import { useCallback, useEffect, useMemo, useState } from "react";
import { APropos } from "./components/APropos";
import { Carte } from "./components/Carte";
import { ChampAllure } from "./components/ChampAllure";
import { Partage } from "./components/Partage";
import { RecapPassages } from "./components/RecapPassages";
import { BUNDLED_EVENT } from "./config/event";
import { findRace, trackOf } from "./lib/event";
import {
  buildShareText,
  buildShareUrl,
  resolveInitialPrefs,
  resolvePace,
  sanitizeName,
  updateCurrentUrl,
  type RunnerPrefs,
} from "./lib/format";
import { readJson, writeJson } from "./lib/storage";
import { computeAllPassages, groupPassagesBySpot } from "./lib/timing";
import "./App.css";

const PREFS_KEY = "semi-supporter:prefs";

function readRaceFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("race");
}

function App() {
  const config = BUNDLED_EVENT;
  const [raceId, setRaceId] = useState<string | null>(readRaceFromUrl);
  const race = findRace(config, raceId);
  const [prefs, setPrefs] = useState<RunnerPrefs>(() =>
    resolveInitialPrefs(window.location.search, readJson<Partial<RunnerPrefs>>(PREFS_KEY), {
      pace: race.defaultPace,
      targetTime: race.defaultTargetTime,
    })
  );
  const updatePrefs = useCallback((patch: Partial<RunnerPrefs>) => setPrefs((p) => ({ ...p, ...patch })), []);

  const { pace: paceMinPerKm, error: paceError } = resolvePace(prefs, race.distanceKm, config.settings.pace);
  const runnerName = sanitizeName(prefs.name);
  const sharedRaceId = config.races.length > 1 ? race.id : null;

  // Mémorise localement (jamais envoyé à un serveur) pour restaurer à
  // l'ouverture de l'app installée, dont la start_url n'a pas de paramètres.
  useEffect(() => writeJson(PREFS_KEY, prefs), [prefs]);

  // Reflète l'allure et le prénom dans l'URL courante (rechargement fidèle).
  useEffect(() => {
    window.history.replaceState(null, "", updateCurrentUrl(window.location.href, paceMinPerKm, runnerName, sharedRaceId));
  }, [paceMinPerKm, runnerName, sharedRaceId]);

  const shareUrl = buildShareUrl(window.location.origin, paceMinPerKm, runnerName, sharedRaceId);
  const shareText = buildShareText(runnerName, config.event.shortName);

  const passages = useMemo(
    () => (paceMinPerKm ? computeAllPassages(race, paceMinPerKm, config.settings.margin) : []),
    [race, paceMinPerKm, config.settings.margin]
  );
  const passagesBySpot = useMemo(() => groupPassagesBySpot(passages), [passages]);
  const track = useMemo(() => trackOf(race), [race]);

  const highlight = race.spots.find((s) => s.highlight);

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
          prefs={prefs}
          onChange={updatePrefs}
          totalDistanceKm={race.distanceKm}
          activePace={paceMinPerKm}
          error={paceError}
        />
        <Partage url={shareUrl} text={shareText} title={config.event.name} />
      </section>

      {runnerName && (
        <div className="runner-banner">
          🏃 Tu suis <strong>{runnerName}</strong> — voici où et quand l'encourager.
        </div>
      )}

      <details className="carte-section" open>
        <summary>🗺️ Carte du parcours</summary>
        <Carte key={race.id} loopPoints={track} spots={race.spots} passagesBySpot={passagesBySpot} />
      </details>

      {highlight && (
        <div className="best-spot-banner">
          ⭐ Meilleur spot : <strong>{highlight.shortName}</strong> — reste ici, tu vois {runnerName || "ton coureur"}{" "}
          passer {highlight.km.length} fois sans bouger.
        </div>
      )}

      <RecapPassages spots={race.spots} passagesBySpot={passagesBySpot} runnerName={runnerName} />

      <footer className="app-footer">
        <p>Prototype de démonstration — parcours et points d'observation à confirmer.</p>
        <APropos />
      </footer>
    </div>
  );
}

export default App;
