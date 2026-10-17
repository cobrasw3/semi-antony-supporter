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
import { optimalPlan } from "../lib/itinerary";
import { readJson, writeJson } from "../lib/storage";
import { computeAllPassages, groupPassagesBySpot, timeStringToMinutes } from "../lib/timing";
import { applyBranding } from "../ui/branding";
import { needsOnboarding } from "./onboardingRule";

const PREFS_KEY = "semi-supporter:prefs";
const ONBOARDED_KEY = "semi-supporter:onboarded";
const SPOTS_KEY = "semi-supporter:spots-choisis";

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
  const toggleSpot = useCallback(
    (id: string) => setChosenSpots((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])),
    []
  );
  const resetSpots = useCallback(() => setChosenSpots([]), []);
  useEffect(() => writeJson(SPOTS_KEY, chosenSpots), [chosenSpots]);
  const plan = useMemo(() => {
    const allowed = chosenSpots.filter((id) => race.spots.some((sp) => sp.id === id));
    const pool = allowed.length ? passages.filter((p) => allowed.includes(p.spotId)) : passages;
    return optimalPlan(pool, race.spots, config.settings.walking);
  }, [chosenSpots, passages, race.spots, config.settings.walking]);
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
    chosenSpots,
    toggleSpot,
    resetSpots,
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
