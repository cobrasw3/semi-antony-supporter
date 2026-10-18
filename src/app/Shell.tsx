// Coque de l'app : en-tête compact, onglets (Live, Plan, Carte, Infos),
// tiroirs (coureur, spot), toasts et fines barres d'état. Affichage seulement.

import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Info, Map as MapIcon, MapPinCheck, Megaphone, Navigation, Radio, RefreshCw, Route, WifiOff } from "lucide-react";
import { checkinDelay, formatDelayFr } from "../lib/checkin";
import { nearestPassageKm } from "../lib/freeSpot";
import { track } from "../lib/analytics";
import { spotWhere } from "../lib/event";
import { formatPace } from "../lib/format";
import { minutesToTimeString } from "../lib/timing";
import { onUpdateReady, reloadKeepingState } from "../pwa/serviceWorker";
import { AppHeader, Button, RunnerChip, SpotCard, Stepper } from "../ui/components";
import { BottomSheet, StatusStrip, TabBar, ToastStack, type ToastItem } from "../ui/overlays";
import { GoalControls } from "./GoalControls";
import { headerInfo } from "./liveModel";
import { LiveTab } from "./LiveTab";
import { InfosTab } from "./InfosTab";
import { PlanTab } from "./PlanTab";
import { shareLink } from "./share";
import { useGeolocation } from "./useGeolocation";
import { useReminders } from "./useReminders";
import type { Supporter } from "./useSupporter";

// Leaflet est chargé seulement à l'ouverture de l'onglet Carte.
const MapTab = lazy(() => import("./MapTab"));

export type TabId = "live" | "plan" | "carte" | "infos";

/** Lieu à pointer : un spot, ou un point touché sur la carte. */
export interface CheckinPlace {
  spotId: string;
  /** « Km 3,4 », « Rue des Champs » */
  label: string;
  /** « au km 3,4 », « rue des Champs » */
  where: string;
  /** Km de passage possibles à cet endroit (un par boucle). */
  kms: number[];
}
const TABS: TabId[] = ["live", "plan", "carte", "infos"];

function tabFromHash(): TabId {
  const h = window.location.hash.slice(1) as TabId;
  return TABS.includes(h) ? h : "live";
}

export function Shell({ s }: { s: Supporter }) {
  const [tab, setTabState] = useState<TabId>(tabFromHash);
  const [runnerSheet, setRunnerSheet] = useState(false);
  const [spotSheet, setSpotSheet] = useState<string | null>(null);
  const [checkinPlace, setCheckinPlace] = useState<CheckinPlace | null>(null);
  const [checkinMinutes, setCheckinMinutes] = useState(0);
  const [mapFocus, setMapFocus] = useState<{ spotId: string; nonce: number } | null>(null);
  const [planFocus, setPlanFocus] = useState(0);
  const [buildHint, setBuildHint] = useState(0);
  const [toast, setToast] = useState<ToastItem | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const geo = useGeolocation();
  const reminders = useReminders(s);
  const { config, race, clock, pace, runnerName } = s;

  const setTab = useCallback((t: TabId) => {
    setTabState(t);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${t}`);
    window.scrollTo({ top: 0 });
    if (t === "plan") track("itineraire_ouvert");
  }, []);

  useEffect(() => onUpdateReady(setUpdateReady), []);

  // Hauteur réelle de l'en-tête (varie avec les barres démo / hors-ligne) :
  // sert à placer les toasts sous l'en-tête sur l'onglet Carte.
  const topRef = useRef<HTMLDivElement>(null);
  const [topHeight, setTopHeight] = useState(0);
  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const o = new ResizeObserver(() => setTopHeight(el.offsetHeight));
    o.observe(el);
    return () => o.disconnect();
  }, []);

  const showToast = useCallback((t: ToastItem, ms = 3500) => {
    setToast(t);
    window.setTimeout(() => setToast((cur) => (cur?.id === t.id ? null : cur)), ms);
  }, []);

  const share = async () => {
    const result = await shareLink(s.shareUrl, s.shareText, config.event.name);
    if (result === "native" || result === "copied") track("partage", { methode: result === "native" ? "native" : "copy" });
    if (result === "copied") showToast({ id: "copied", text: "Lien copié : colle-le dans un message." });
    if (result === "failed") showToast({ id: "copy-failed", text: s.shareUrl }, 8000);
  };

  /** Pointage + confirmation avec annulation. */
  const checkinAt = (spotId: string, km: number, minutes: number, label?: string) => {
    const previous = s.checkin;
    s.recordCheckin(spotId, km, minutes, label);
    const delay = checkinDelay({ spotId, km, minutes }, s.startMinutes, pace ?? 0);
    showToast(
      {
        id: `pointage-${spotId}-${km}`,
        icon: <MapPinCheck size={18} />,
        text: `Pointé à ${minutesToTimeString(minutes)} : ${formatDelayFr(delay)}. Horaires recalés.`,
        action: {
          label: "Annuler",
          onClick: () => {
            if (previous) s.recordCheckin(previous.spotId, previous.km, previous.minutes, previous.label);
            else s.clearCheckin();
            setToast(null);
          },
        },
      },
      6000
    );
  };
  /** « … vient de passer ici » : pointage à l'heure actuelle. */
  const checkinNow = (spotId: string, km: number) => checkinAt(spotId, km, Math.round(clock.minutes));
  /** Pointage à une autre heure (ou en un point libre) : choix de l'heure. */
  const openCheckin = (place: CheckinPlace) => {
    setSpotSheet(null);
    setCheckinMinutes(Math.max(s.startMinutes, Math.floor(clock.minutes)));
    setCheckinPlace(place);
  };
  const confirmCheckin = () => {
    if (!checkinPlace || !pace) return;
    const km = nearestPassageKm(checkinPlace.kms, checkinMinutes, s.startMinutes, pace);
    if (km === null) return;
    const isSpot = !!s.spotById[checkinPlace.spotId];
    checkinAt(checkinPlace.spotId, km, checkinMinutes, isSpot ? undefined : checkinPlace.label);
    setCheckinPlace(null);
  };
  const raceDay = clock.date === config.event.date;
  const showOnMap = (spotId: string) => {
    setSpotSheet(null);
    setMapFocus((f) => ({ spotId, nonce: (f?.nonce ?? 0) + 1 }));
    setTab("carte");
  };

  const runnerKm = s.runnerKm;
  const info = headerInfo(s.dayStatus, { eventDate: config.event.date, startTime: race.startTime, runnerKm });

  // Toasts : mise à jour, annonces, alerte de passage, retour d'action.
  const toasts: ToastItem[] = [];
  if (reminders.alert) toasts.push({ id: "alert", tone: "warn", icon: <Radio size={18} />, text: reminders.alert, onDismiss: reminders.dismissAlert });
  // Seules les annonces importantes s'affichent en toast ; les autres sont
  // dans l'onglet Infos (pastille sur l'onglet).
  for (const a of s.annonces) {
    if (a.level !== "important" || dismissed.includes(a.id)) continue;
    toasts.push({
      id: `annonce-${a.id}`,
      tone: "ko",
      icon: <Megaphone size={18} />,
      text: a.text,
      onDismiss: () => setDismissed((d) => [...d, a.id]),
    });
  }
  if (updateReady)
    toasts.push({ id: "update", icon: <RefreshCw size={18} />, text: "Nouvelle version disponible", action: { label: "Mettre à jour", onClick: reloadKeepingState } });
  if (toast) toasts.push(toast);

  const spot = spotSheet ? s.spotById[spotSheet] : null;
  const panels: Record<TabId, ReactNode> = {
    live: (
      <LiveTab
        s={s}
        geo={geo}
        onGoPlan={() => setTab("plan")}
        onOpenSpot={setSpotSheet}
        onEditRunner={() => setRunnerSheet(true)}
        onCheckin={checkinNow}
      />
    ),
    plan: (
      <PlanTab
        s={s}
        reminders={reminders}
        onOpenSpot={setSpotSheet}
        onShowPlanOnMap={() => {
          setPlanFocus((n) => n + 1);
          setTab("carte");
        }}
        onBuildOnMap={() => {
          setBuildHint((n) => n + 1);
          setTab("carte");
        }}
      />
    ),
    carte: (
      <Suspense fallback={<div className="map-loading">Chargement de la carte…</div>}>
        <MapTab
          s={s}
          focus={mapFocus}
          onOpenSpot={setSpotSheet}
          planFocus={planFocus}
          buildHint={buildHint}
          onToast={showToast}
          onCheckinAt={raceDay ? openCheckin : undefined}
        />
      </Suspense>
    ),
    infos: <InfosTab s={s} onShare={share} />,
  };

  return (
    <div className={`ui shell shell--${tab}`} style={{ "--top-h": `${topHeight}px` } as React.CSSProperties}>
      <div className="shell__top" ref={topRef}>
        {s.isDemo && (
          <StatusStrip tone="demo">Mode démo · {minutesToTimeString(clock.minutes)}, jour de la course</StatusStrip>
        )}
        {(!s.online || s.eventData.stale) && (
          <StatusStrip tone="offline">
            <WifiOff size={14} aria-hidden="true" />
            {s.online ? "Réseau lent" : "Hors connexion"} — l'app reste utilisable
          </StatusStrip>
        )}
        <AppHeader
          eventName={config.event.shortName}
          logo={config.branding?.logo}
          onShare={share}
          runner={<RunnerChip name={runnerName || "Ton coureur"} pace={pace ? formatPace(pace) : "—"} onClick={() => setRunnerSheet(true)} />}
          info={
            <>
              <strong>{info.strong}</strong>
              {info.text}
            </>
          }
        />
      </div>

      <main className="shell__main">
        <div className="shell__panel" id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} key={tab}>
          {panels[tab]}
        </div>
      </main>

      <ToastStack items={toasts} />

      <TabBar
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "live", label: "Live", icon: <Radio size={22} /> },
          { id: "plan", label: "Plan", icon: <Route size={22} /> },
          { id: "carte", label: "Carte", icon: <MapIcon size={22} /> },
          { id: "infos", label: "Infos", icon: <Info size={22} />, badge: s.annonces.some((a) => a.level === "info") && tab !== "infos" },
        ]}
      />

      <BottomSheet open={runnerSheet} onClose={() => setRunnerSheet(false)} title="Ton coureur">
        <div className="stack">
          <label className="field">
            <span className="field__label">Prénom</span>
            <input
              className="field__input"
              type="text"
              name="prenom"
              autoComplete="off"
              maxLength={40}
              placeholder="Prénom du coureur"
              value={s.prefs.name}
              onChange={(e) => s.updatePrefs({ name: e.target.value })}
            />
          </label>
          <GoalControls s={s} />
          <Button size="lg" block onClick={() => setRunnerSheet(false)} disabled={!pace}>
            Valider
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={checkinPlace !== null} onClose={() => setCheckinPlace(null)} title="Pointer un passage">
        {checkinPlace && (
          <div className="stack">
            <p>
              À quelle heure as-tu vu {runnerName || "ton coureur"} {checkinPlace.where} ? Les horaires suivants seront recalés.
            </p>
            <Stepper
              label="Heure du passage"
              value={checkinMinutes}
              onChange={setCheckinMinutes}
              min={s.startMinutes}
              max={Math.max(s.startMinutes, Math.floor(clock.minutes))}
              step={1}
              format={minutesToTimeString}
              valueText={(m) => minutesToTimeString(m).replace(":", " h ")}
            />
            <Button size="lg" block onClick={confirmCheckin} icon={<MapPinCheck size={20} />}>
              Pointer à {minutesToTimeString(checkinMinutes)}
            </Button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={spot !== null} onClose={() => setSpotSheet(null)} title={spot?.shortName ?? ""}>
        {spot && (
          <div className="stack">
            <p className="spot-sheet__where">
              <span className={spot.highlight ? "spot-badge spot-badge--fort" : "spot-badge"} aria-hidden="true">
                {s.spotNumbers[spot.id]}
              </span>
              {spot.address}
            </p>
            <p>{spot.description}</p>
            <p className="muted">{spot.access}</p>
            {(() => {
              if (!raceDay || clock.minutes < s.startMinutes) return null;
              const near = (s.passagesBySpot[spot.id] ?? [])
                .filter((p) => Math.abs(p.estimatedMinutes - clock.minutes) <= 25)
                .sort((a, b) => Math.abs(a.estimatedMinutes - clock.minutes) - Math.abs(b.estimatedMinutes - clock.minutes))[0];
              const place = { spotId: spot.id, label: spot.shortName, where: spotWhere(spot), kms: spot.km };
              return (
                <div className="stack stack--tight">
                  {near && (
                    <button
                      type="button"
                      className="checkin-btn checkin-btn--light"
                      onClick={() => {
                        checkinNow(spot.id, near.km);
                        setSpotSheet(null);
                      }}
                    >
                      <MapPinCheck size={20} aria-hidden="true" /> {runnerName || "Mon coureur"} vient de passer ici
                    </button>
                  )}
                  <button type="button" className="link checkin-other" onClick={() => openCheckin(place)}>
                    {near ? "C'était plus tôt ? Indiquer l'heure" : "Pointer un passage ici (heure au choix)"}
                  </button>
                </div>
              );
            })()}
            <h3 className="sheet__sub display">
              {runnerName || "Ton coureur"} passe {spotWhere(spot)}
            </h3>
            <div className="stack stack--tight">
              {(s.passagesBySpot[spot.id] ?? []).map((p) => (
                <SpotCard
                  key={p.km}
                  number={s.spotNumbers[spot.id]}
                  name={p.label}
                  time={p.estimatedTime}
                  window={`${p.windowStart}–${p.windowEnd}`}
                  highlight={p.kind === "finish"}
                />
              ))}
            </div>
            <div className="stack stack--tight">
              <Button variant="secondary" block onClick={() => showOnMap(spot.id)} icon={<MapIcon size={18} />}>
                Voir sur la carte
              </Button>
              <a
                className="btn btn--strong btn--md btn--block"
                href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}&travelmode=walking`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation size={18} aria-hidden="true" /> Y aller
              </a>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
