import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Annonces } from "./components/Annonces";
import { APropos } from "./components/APropos";
import { BandeauConnexion } from "./components/BandeauConnexion";
import { Carte, type MapFocus } from "./components/Carte";
import { ChampAllure } from "./components/ChampAllure";
import { Partage } from "./components/Partage";
import { InstallPrompt } from "./components/InstallPrompt";
import { Itineraire } from "./components/Itineraire";
import { ProchainPassage } from "./components/ProchainPassage";
import { RecapPassages } from "./components/RecapPassages";
import { BUNDLED_ANNONCES, BUNDLED_EVENT } from "./config/event";
import { activeAnnonces, parseAnnonces } from "./lib/annonces";
import { findRace, parseEventConfig, trackOf } from "./lib/event";
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
import { computeAllPassages, groupPassagesBySpot, minutesToTimeString, timeStringToMinutes } from "./lib/timing";
import { IS_DEMO, useEventClock } from "./hooks/useEventClock";
import { useRemoteJson } from "./hooks/useRemoteJson";
import { useOnline } from "./hooks/useOnline";
import { UpdateToast } from "./components/UpdateToast";
import "./App.css";

const PREFS_KEY = "semi-supporter:prefs";

function readRaceFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("race");
}

function App() {
  // event.json : affiché tout de suite, rafraîchi en arrière-plan (un
  // changement d'horaire ou de spot arrive sans nouvelle version de l'app).
  const eventData = useRemoteJson("/data/event.json", "semi-supporter:event", BUNDLED_EVENT, parseEventConfig);
  const config = eventData.data;
  const [raceId, setRaceId] = useState<string | null>(readRaceFromUrl);
  const race = findRace(config, raceId);
  const [prefs, setPrefs] = useState<RunnerPrefs>(() =>
    resolveInitialPrefs(window.location.search, readJson<Partial<RunnerPrefs>>(PREFS_KEY), {
      pace: race.defaultPace,
      targetTime: race.defaultTargetTime,
    })
  );
  // « Engagé » = a modifié la saisie ou fait défiler l'écran : l'invite
  // d'installation n'apparaît qu'à ce moment-là, jamais au premier écran.
  const [engaged, setEngaged] = useState(false);
  const updatePrefs = useCallback((patch: Partial<RunnerPrefs>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    setEngaged(true);
  }, []);
  useEffect(() => {
    if (engaged) return;
    const onScroll = () => window.scrollY > 300 && setEngaged(true);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [engaged]);

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
  // Numéro de chaque spot (ordre de event.json), le même sur la carte et dans les listes.
  const spotNumbers = useMemo(() => Object.fromEntries(race.spots.map((s, i) => [s.id, i + 1])), [race.spots]);
  const clock = useEventClock(config.event.date, config.event.timeZone);
  const online = useOnline();
  const annoncesData = useRemoteJson("/data/annonces.json", "semi-supporter:annonces", BUNDLED_ANNONCES, parseAnnonces);
  const annonces = activeAnnonces(annoncesData.data.annonces, clock, config.event.timeZone);
  const beforeRaceDay = clock.date < config.event.date;

  const scrollToSpot = useCallback((spotId: string) => {
    const card = document.getElementById(`spot-${spotId}`);
    card?.scrollIntoView({ behavior: "smooth", block: "start" });
    card?.focus({ preventScroll: true });
  }, []);

  const [mapFocus, setMapFocus] = useState<MapFocus | null>(null);
  const mapSectionRef = useRef<HTMLDetailsElement>(null);
  const showOnMap = useCallback((spotId: string) => {
    const section = mapSectionRef.current;
    if (section) {
      section.open = true;
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMapFocus((f) => ({ spotId, nonce: (f?.nonce ?? 0) + 1 }));
  }, []);

  return (
    <div className="app">
      <div className="app-top">
        {IS_DEMO && (
          <div className="demo-banner" role="status">
            🎬 Mode démo — heure simulée {minutesToTimeString(clock.minutes)}, jour de la course
          </div>
        )}
        <header className="app-header">
          <h1>{config.event.name}</h1>
          <p>Départ {race.startTime} — où se placer, et à quelle heure ton coureur passe.</p>
        </header>
      </div>
      <Annonces annonces={annonces} />
      <BandeauConnexion online={online} stale={eventData.stale} fetchedAt={eventData.fetchedAt} />

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

      <ProchainPassage
        passages={passages}
        spots={race.spots}
        startMinutes={timeStringToMinutes(race.startTime)}
        clock={clock}
        eventDate={config.event.date}
        dateToConfirm={config.event.dateToConfirm}
        runnerName={runnerName}
        onSelectSpot={scrollToSpot}
      />

      {beforeRaceDay && (
        <p className="astuce-hors-ligne">
          💡 Ouvre l'app la veille : elle sera disponible hors-ligne le jour J, même si le réseau sature.
        </p>
      )}

      <InstallPrompt ready={engaged && paceMinPerKm !== null} />

      <Itineraire
        passages={passages}
        spots={race.spots}
        walking={config.settings.walking}
        runnerName={runnerName}
        spotNumbers={spotNumbers}
        onSelectSpot={scrollToSpot}
      />

      <details className="carte-section" open ref={mapSectionRef}>
        <summary>🗺️ Carte du parcours</summary>
        <Carte
          key={race.id}
          loopPoints={track}
          race={race}
          spots={race.spots}
          spotNumbers={spotNumbers}
          focus={mapFocus}
          onSelectSpot={scrollToSpot}
        />
      </details>

      {highlight && (
        <div className="best-spot-banner">
          ⭐ Meilleur spot : <strong>{highlight.shortName}</strong> — reste ici, tu vois {runnerName || "ton coureur"}{" "}
          passer {highlight.km.length} fois sans bouger.
        </div>
      )}

      <RecapPassages
        spots={race.spots}
        passagesBySpot={passagesBySpot}
        runnerName={runnerName}
        spotNumbers={spotNumbers}
        onShowOnMap={showOnMap}
      />

      <footer className="app-footer">
        <p>Prototype de démonstration — parcours et points d'observation à confirmer.</p>
        <APropos appVersion={__APP_VERSION__} contentVersion={config.contentVersion} contentUpdatedAt={config.contentUpdatedAt} fetchedAt={eventData.fetchedAt} />
      </footer>
      <UpdateToast />
    </div>
  );
}

export default App;
