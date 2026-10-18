// État de l'app supporter, séparé de l'affichage : données (SWR), course,
// préférences (URL + mémoire locale), allure résolue, passages, plan,
// horloge, connexion, annonces. Aucune logique de calcul ici : tout vient
// de src/lib (fonctions pures testées) ; ce hook ne fait que les assembler.

import { useCallback, useEffect, useMemo, useState } from "react";
import { BUNDLED_ANNONCES, BUNDLED_EVENT } from "../config/event";
import { useEventClock, IS_DEMO } from "../hooks/useEventClock";
import { useOnline } from "../hooks/useOnline";
import { useRemoteJson } from "../hooks/useRemoteJson";
import { activeAnnonces, parseAnnonces } from "../lib/annonces";
import { computeDayStatus } from "../lib/dayStatus";
import { findRace, parseEventConfig, trackOf } from "../lib/event";
import {
  buildShareText,
  buildShareUrl,
  resolveInitialPrefs,
  resolvePace,
  sanitizeName,
  updateCurrentUrl,
  type RunnerPrefs,
} from "../lib/format";
import { planOptions, spotsToDrop } from "../lib/itinerary";
import { readJson, writeJson } from "../lib/storage";
import { computeAllPassages, groupPassagesBySpot, timeStringToMinutes } from "../lib/timing";
import { applyBranding } from "../ui/branding";
import { needsOnboarding } from "./onboardingRule";

const PREFS_KEY = "semi-supporter:prefs";
const ONBOARDED_KEY = "semi-supporter:onboarded";
const SPOTS_KEY = "semi-supporter:spots-choisis";
const STAY_KEY = "semi-supporter:reste-sur-place";
const SPOT_MODE_KEY = "semi-supporter:mode-spots";

export function useSupporter() {
  // event.json : affiché tout de suite, rafraîchi en arrière-plan.
  const eventData = useRemoteJson("/data/event.json", "semi-supporter:event", BUNDLED_EVENT, parseEventConfig);
  const config = eventData.data;
  useEffect(() => applyBranding(config.branding?.colors), [config.branding?.colors]);

  const [raceId, setRaceId] = useState<string | null>(() => new URLSearchParams(window.location.search).get("race"));
  const race = findRace(config, raceId);

  const [prefs, setPrefs] = useState<RunnerPrefs>(() =>
    resolveInitialPrefs(window.location.search, readJson<Partial<RunnerPrefs>>(PREFS_KEY), {
      pace: race.defaultPace,
      targetTime: race.defaultTargetTime,
    })
  );
  const updatePrefs = useCallback((patch: Partial<RunnerPrefs>) => setPrefs((p) => ({ ...p, ...patch })), []);

  const [onboarding, setOnboarding] = useState(() =>
    needsOnboarding(window.location.search, readJson<boolean>(ONBOARDED_KEY) === true)
  );
  const finishOnboarding = useCallback(() => {
    writeJson(ONBOARDED_KEY, true);
    setOnboarding(false);
  }, []);

  const { pace, error: paceError } = resolvePace(prefs, race.distanceKm, config.settings.pace);
  const runnerName = sanitizeName(prefs.name);
  const sharedRaceId = config.races.length > 1 ? race.id : null;

  // Mémorisé sur l'appareil uniquement (jamais envoyé à un serveur).
  useEffect(() => writeJson(PREFS_KEY, prefs), [prefs]);
  // URL courante fidèle (rechargement, favori), sans casser ?pace=.
  useEffect(() => {
    if (onboarding) return;
    window.history.replaceState(window.history.state, "", updateCurrentUrl(window.location.href, pace, runnerName, sharedRaceId));
  }, [pace, runnerName, sharedRaceId, onboarding]);

  const passages = useMemo(
    () => (pace ? computeAllPassages(race, pace, config.settings.margin) : []),
    [race, pace, config.settings.margin]
  );
  const passagesBySpot = useMemo(() => groupPassagesBySpot(passages), [passages]);
  // Spots choisis par l'utilisateur (aucun = tous) : le plan optimal se
  // calcule sur leurs seuls passages.
  const [chosenSpots, setChosenSpots] = useState<string[]>(() => readJson<string[]>(SPOTS_KEY) ?? []);
  useEffect(() => writeJson(SPOTS_KEY, chosenSpots), [chosenSpots]);
  // Distances à pied réelles (itinéraires piétons pré-calculés), sinon estimation.
  const routes = race.walkingRoutes?.km;
  // Trois façons de suivre le coureur :
  //  - « meilleur parcours » (par défaut) : le plus de passages possible ;
  //  - « reste au stade » : sans marcher (le meilleur spot sans bouger) ;
  //  - « sur mesure » : le parcours passe par chacun des spots choisis sur la carte.
  const [spotMode, setSpotMode] = useState<"auto" | "mine">(() => (readJson<string>(SPOT_MODE_KEY) === "mine" ? "mine" : "auto"));
  useEffect(() => writeJson(SPOT_MODE_KEY, spotMode), [spotMode]);
  const [stayPut, setStayPut] = useState(() => readJson<boolean>(STAY_KEY) === true);
  useEffect(() => writeJson(STAY_KEY, stayPut), [stayPut]);
  const walking = config.settings.walking;
  const required = useMemo(
    () => (spotMode === "mine" ? chosenSpots.filter((id) => race.spots.some((sp) => sp.id === id)) : []),
    [spotMode, chosenSpots, race.spots]
  );
  const autoOptions = useMemo(() => planOptions(passages, race.spots, walking, routes), [passages, race.spots, walking, routes]);
  // Spots imposés : on accepte aussi les trajets justes (⚠️) mais faisables.
  const mineOptions = useMemo(
    () => (required.length ? planOptions(passages, race.spots, walking, routes, required, true) : []),
    [required, passages, race.spots, walking, routes]
  );
  const emptyPlan = { steps: [], transitions: [], totalWalkKm: 0 };
  const bestPlan = autoOptions.at(-1) ?? emptyPlan;
  // « Reste au stade » : l'option sans marcher, s'il y en a une.
  const stationaryPlan = autoOptions[0] && autoOptions[0].totalWalkKm < 0.05 ? autoOptions[0] : null;
  // Si l'allure change et rend les spots choisis incompatibles : repli sur le meilleur parcours.
  const spotsConflict = required.length > 0 && mineOptions.length === 0;
  const planKind: "best" | "stay" | "custom" =
    spotMode === "mine" && required.length > 0 && !spotsConflict ? "custom" : stayPut && stationaryPlan ? "stay" : "best";
  const plan = planKind === "custom" ? mineOptions.at(-1)! : planKind === "stay" ? stationaryPlan! : bestPlan;

  /** Ajoute un spot au parcours sur mesure ; refuse (et dit quoi retirer) si c'est impossible. */
  const addSpot = useCallback(
    (id: string): { ok: true } | { ok: false; drop: string[] } => {
      const candidate = [...(planKind === "custom" ? required : []), id];
      if (planOptions(passages, race.spots, walking, routes, candidate, true).length === 0) {
        return { ok: false, drop: spotsToDrop(passages, race.spots, walking, candidate, routes, true).filter((x) => x !== id) };
      }
      setChosenSpots(candidate);
      setSpotMode("mine");
      return { ok: true };
    },
    [planKind, required, passages, race.spots, walking, routes]
  );
  const removeSpot = useCallback(
    (id: string) => {
      const rest = required.filter((x) => x !== id);
      setChosenSpots(rest);
      if (rest.length === 0) setSpotMode("auto");
    },
    [required]
  );
  const useBestPlan = useCallback(() => {
    setSpotMode("auto");
    setStayPut(false);
  }, []);
  const useStayPut = useCallback(() => {
    setSpotMode("auto");
    setStayPut(true);
  }, []);
  const track = useMemo(() => trackOf(race), [race]);
  const spotNumbers = useMemo(() => Object.fromEntries(race.spots.map((s, i) => [s.id, i + 1])), [race.spots]);
  const spotById = useMemo(() => Object.fromEntries(race.spots.map((s) => [s.id, s])), [race.spots]);

  const clock = useEventClock(config.event.date, config.event.timeZone);
  const startMinutes = timeStringToMinutes(race.startTime);
  const dayStatus = computeDayStatus(passages, startMinutes, clock, config.event.date);
  const online = useOnline();
  const annoncesData = useRemoteJson("/data/annonces.json", "semi-supporter:annonces", BUNDLED_ANNONCES, parseAnnonces);
  const annonces = activeAnnonces(annoncesData.data.annonces, clock, config.event.timeZone);

  return {
    config,
    eventData,
    race,
    setRaceId,
    prefs,
    updatePrefs,
    onboarding,
    finishOnboarding,
    pace,
    paceError,
    runnerName,
    shareUrl: buildShareUrl(window.location.origin, pace, runnerName, sharedRaceId),
    shareText: buildShareText(runnerName, config.event.shortName),
    passages,
    passagesBySpot,
    plan,
    planKind,
    bestPlan,
    stationaryPlan,
    maxPlan: bestPlan,
    planOptions: autoOptions,
    spotsConflict,
    customSpots: required,
    addSpot,
    removeSpot,
    useBestPlan,
    useStayPut,
    routes,
    track,
    spotNumbers,
    spotById,
    clock,
    isDemo: IS_DEMO,
    startMinutes,
    dayStatus,
    online,
    annonces,
  };
}

export type Supporter = ReturnType<typeof useSupporter>;
