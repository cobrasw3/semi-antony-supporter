// Onglet Carte : carte plein écran (tracé, sens, bornes km, spots numérotés,
// position estimée du coureur) + tiroir avec carrousel des spots. Faire
// défiler le carrousel centre la carte ; toucher un marqueur ouvre le spot.

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { AlertTriangle, Check, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { leafletLayer } from "protomaps-leaflet";
import { TILES, USE_LOCAL_BASEMAP } from "../config/tiles";
import type { LatLng, Spot } from "../lib/event";
import { projectPointOntoRoute } from "../lib/geo";
import { planWalkingPaths } from "../lib/itinerary";
import { directionArrows, kmMarks } from "../lib/mapMarkers";
import { positionOnTrack } from "../lib/runnerPosition";
import type { Passage } from "../lib/timing";
import { Carousel, type ToastItem } from "../ui/overlays";
import type { Supporter } from "./useSupporter";

const TILE_ERRORS_BEFORE_FALLBACK = 4;
const TILE_TIMEOUT_MS = 12_000;

const spotIcon = (n: number, highlight: boolean, active: boolean, inPlan: boolean) =>
  L.divIcon({
    html: `<div class="pin${highlight ? " pin--fort" : ""}${active ? " is-active" : ""}${inPlan ? " pin--plan" : ""}">${n}</div>`,
    className: "pin-wrap",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

const arrowIcon = (bearing: number) =>
  L.divIcon({
    html: `<div class="map-arrow" aria-hidden="true" style="transform: rotate(${bearing - 90}deg)">➤</div>`,
    className: "pin-wrap",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const kmIcon = (label: string) =>
  L.divIcon({ html: `<div class="map-km" aria-hidden="true">km ${label}</div>`, className: "pin-wrap", iconSize: [0, 0] });

const runnerIcon = L.divIcon({
  html: '<div class="map-runner" aria-hidden="true"><span></span></div>',
  className: "pin-wrap",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const calibrageIcon = L.divIcon({ html: '<div class="map-calib"></div>', className: "pin-wrap", iconSize: [16, 16], iconAnchor: [8, 8] });

/** Fond de carte vectoriel hébergé (PMTiles), rendu par protomaps-leaflet. */
function LocalBasemap({ url, attribution, onLoad }: { url: string; attribution: string; onLoad: () => void }) {
  const map = useMap();
  useEffect(() => {
    const dark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const layer = leafletLayer({
      url,
      flavor: dark ? "dark" : "light",
      lang: "fr",
      maxDataZoom: 15,
      attribution,
    }) as unknown as L.GridLayer;
    layer.on("load", onLoad);
    layer.addTo(map);
    return () => {
      layer.off("load", onLoad);
      map.removeLayer(layer);
    };
    // onLoad stable côté appelant (setter d'état) : seule l'URL compte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, map]);
  return null;
}

function FitToRoute({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    // Le conteneur prend sa taille définitive juste après le montage : on
    // cadre une fois la taille connue (sinon le cadrage est faux).
    const fit = () => {
      map.invalidateSize();
      map.fitBounds(points.map((p) => [p.lat, p.lng]) as [number, number][], {
        // Haut : légendes ; bas : tiroir des spots (~260 px) + marqueurs.
        paddingTopLeft: [16, 80],
        paddingBottomRight: [16, 300],
      });
    };
    const frame = requestAnimationFrame(fit);
    const timer = window.setTimeout(fit, 300);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [points, map]);
  return null;
}

function Resize() {
  const map = useMap();
  useEffect(() => {
    const o = new ResizeObserver(() => map.invalidateSize());
    o.observe(map.getContainer());
    return () => o.disconnect();
  }, [map]);
  return null;
}

/** Cadre la carte sur le trajet à pied du plan (à chaque nouvelle demande). */
function FitToPlan({ paths, nonce }: { paths: Array<Array<[number, number]>>; nonce: number }) {
  const map = useMap();
  useEffect(() => {
    if (nonce === 0 || paths.length === 0) return;
    map.flyToBounds(paths.flat(), { paddingTopLeft: [40, 80], paddingBottomRight: [40, 250], duration: 0.6, maxZoom: 17 });
  }, [nonce, paths, map]);
  return null;
}

function FlyTo({ spot }: { spot: Spot | null }) {
  const map = useMap();
  useEffect(() => {
    if (!spot) return;
    // Décalé vers le haut : le tiroir occupe le bas de l'écran.
    const target = map.project([spot.lat, spot.lng], Math.max(map.getZoom(), 15)).add([0, 90]);
    map.flyTo(map.unproject(target, Math.max(map.getZoom(), 15)), Math.max(map.getZoom(), 15), { duration: 0.5 });
  }, [spot, map]);
  return null;
}

/** ?calibrage=1 : un clic donne la position km sur la boucle (pour event.json). */
function Calibrage({ track, onResult }: { track: LatLng[]; onResult: (r: { lat: number; lng: number; km: number; off: number }) => void }) {
  useMapEvents({
    click(e) {
      const p = projectPointOntoRoute(track, e.latlng);
      onResult({ lat: e.latlng.lat, lng: e.latlng.lng, km: p.distanceAlongRouteKm, off: p.distanceFromRouteKm });
    },
  });
  return null;
}

/** Prochain passage d'un spot (ou le premier, avant le jour J). */
function nextPassageOf(passages: Passage[] | undefined, now: number | null): Passage | undefined {
  if (!passages?.length) return undefined;
  if (now === null) return passages[0];
  return passages.find((p) => p.windowEndMinutes >= now) ?? passages.at(-1);
}

export default function MapTab({
  s,
  focus,
  onOpenSpot,
  planFocus = 0,
  buildHint = 0,
  onToast,
}: {
  s: Supporter;
  focus: { spotId: string; nonce: number } | null;
  onOpenSpot: (spotId: string) => void;
  /** Demande de cadrage sur le trajet du plan (incrémentée par l'onglet Plan). */
  planFocus?: number;
  /** Demande « construire mon parcours » venant du Plan : ouvre le tiroir des spots. */
  buildHint?: number;
  onToast: (toast: ToastItem, ms?: number) => void;
}) {
  const { race, track, spotNumbers, passagesBySpot, clock, config, runnerName, plan, planKind, customSpots, addSpot, removeSpot, useBestPlan, spotById } = s;
  const spots = race.spots;
  const [active, setActive] = useState(() => Math.max(0, spots.findIndex((sp) => sp.id === focus?.spotId)));
  const [flyTarget, setFlyTarget] = useState<Spot | null>(focus ? spots.find((sp) => sp.id === focus.spotId) ?? null : null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const tileErrors = useRef(0);
  const calibrage = new URLSearchParams(window.location.search).get("calibrage") === "1";
  const [calib, setCalib] = useState<{ lat: number; lng: number; km: number; off: number } | null>(null);

  const arrows = useMemo(() => directionArrows(track), [track]);
  // Fond de carte hébergé avec l'app (par défaut), sinon service de tuiles.
  const localBasemap = USE_LOCAL_BASEMAP ? config.map?.basemap : undefined;
  // Couleur de marque (tokens) : Leaflet écrit la couleur en attribut SVG.
  const routeColor = useMemo(() => getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#14213d", []);
  const planColor = useMemo(() => getComputedStyle(document.documentElement).getPropertyValue("--sprint").trim() || "#f26b3a", []);
  // Ton plan à pied : les trajets réels (par les rues) entre les spots du plan.
  const planPaths = useMemo(() => planWalkingPaths(plan, race.spots, race.walkingRoutes?.paths), [plan, race]);
  const planSpotIds = useMemo(() => new Set(plan.steps.map((p) => p.spotId)), [plan]);
  const [fitPlan, setFitPlan] = useState(planFocus);
  useEffect(() => {
    if (buildHint > 0) setDrawerOpen(true);
  }, [buildHint]);

  /** Ajoute / retire un spot du parcours sur mesure, avec un retour clair. */
  const toggleInParcours = (id: string) => {
    const name = spotById[id]?.shortName ?? id;
    if (planKind === "custom" && customSpots.includes(id)) {
      removeSpot(id);
      onToast({ id: `retire-${id}`, text: `${name} retiré de ton parcours.` }, 2500);
      return;
    }
    const result = addSpot(id);
    if (result.ok) {
      onToast({ id: `ajout-${id}`, text: `${name} ajouté à ton parcours.` }, 2500);
    } else {
      const drop = result.drop.map((d) => spotById[d]?.shortName).filter(Boolean);
      onToast(
        {
          id: `refus-${id}`,
          tone: "warn",
          icon: <AlertTriangle size={18} />,
          text: drop.length
            ? `Impossible d'ajouter ${name} avec tes autres spots : retire ${drop.join(" ou ")} d'abord.`
            : `Impossible d'ajouter ${name} : trop loin de tes autres spots pour l'allure de ${runnerName || "ton coureur"}.`,
        },
        5000
      );
    }
  };
  useEffect(() => setFitPlan(planFocus), [planFocus]);
  const kms = useMemo(() => kmMarks(track, race), [track, race]);
  const raceDay = clock.date === config.event.date;
  const now = raceDay ? clock.minutes : null;
  const runnerKm = s.runnerKm;
  const runnerPos = runnerKm !== null && runnerKm < race.distanceKm ? positionOnTrack(runnerKm, track, race) : null;

  // Recentrage demandé depuis un autre onglet.
  useEffect(() => {
    if (!focus) return;
    const i = spots.findIndex((sp) => sp.id === focus.spotId);
    if (i >= 0) {
      setActive(i);
      setFlyTarget(spots[i]);
      setDrawerOpen(true);
    }
  }, [focus, spots]);

  useEffect(() => {
    if (tilesLoaded) return;
    const id = window.setTimeout(() => setShowPlan(true), TILE_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [tilesLoaded]);

  const select = (i: number, fly = true) => {
    setActive(i);
    if (fly) setFlyTarget(spots[i]);
  };

  return (
    <div className="map-tab">
      <div className="map-tab__map">
        {calibrage && (
          <div className="map-calib-banner">
            {calib ? `Position dans la boucle : ${calib.km.toFixed(2)} km (à ${Math.round(calib.off * 1000)} m du tracé)` : "Mode calibrage : touche la carte"}
          </div>
        )}
        {showPlan && (
          <div className="map-plan">
            <img src="/parcours-plan.svg" alt="Plan schématique du parcours avec les spots numérotés" />
            <button
              type="button"
              className="btn btn--secondary btn--md"
              onClick={() => {
                tileErrors.current = 0;
                setTilesLoaded(false);
                setShowPlan(false);
              }}
            >
              Fond de carte indisponible · Réessayer
            </button>
          </div>
        )}
        <MapContainer
          center={[track[0].lat, track[0].lng]}
          zoom={15}
          minZoom={localBasemap ? 13 : undefined}
          maxZoom={18}
          zoomSnap={0.25}
          zoomControl={false}
          style={{ height: "100%", width: "100%" }}
        >
          {localBasemap ? (
            <LocalBasemap
              key={showPlan ? "plan" : "fond"}
              url={localBasemap}
              attribution={config.map?.attribution ?? "© OpenStreetMap"}
              onLoad={() => setTilesLoaded(true)}
            />
          ) : (
          <TileLayer
            key={showPlan ? "plan" : "tiles"}
            attribution={TILES.attribution}
            url={TILES.url}
            maxZoom={TILES.maxZoom}
            crossOrigin="anonymous"
            eventHandlers={{
              tileload: () => setTilesLoaded(true),
              tileerror: () => {
                tileErrors.current += 1;
                if (!tilesLoaded && tileErrors.current >= TILE_ERRORS_BEFORE_FALLBACK) setShowPlan(true);
              },
            }}
          />
          )}
          <Polyline positions={track.map((p) => [p.lat, p.lng] as [number, number])} pathOptions={{ color: routeColor, weight: 7, opacity: 0.9 }} />
          {planPaths.map((path, i) => (
            <Polyline
              key={`plan-${i}`}
              positions={path}
              interactive={false}
              pathOptions={{ color: planColor, weight: 6, opacity: 0.95, dashArray: "1 11", lineCap: "round" }}
            />
          ))}
          {arrows.map((a, i) => (
            <Marker key={`a${i}`} position={[a.lat, a.lng]} icon={arrowIcon(a.bearing)} interactive={false} keyboard={false} />
          ))}
          {kms.map((m) => (
            <Marker key={`k${m.label}`} position={[m.lat, m.lng]} icon={kmIcon(m.label ?? "")} interactive={false} keyboard={false} />
          ))}
          {spots.map((spot, i) => (
            <Marker
              key={spot.id}
              position={[spot.lat, spot.lng]}
              icon={spotIcon(spotNumbers[spot.id], !!spot.highlight, i === active, planSpotIds.has(spot.id))}
              title={`${spotNumbers[spot.id]}. ${spot.shortName}`}
              alt={`${spotNumbers[spot.id]}. ${spot.shortName}`}
              zIndexOffset={i === active ? 2000 : 1000}
              eventHandlers={{
                click: () => {
                  select(i, false);
                  setDrawerOpen(true);
                },
              }}
            />
          ))}
          {runnerPos && (
            <Marker position={[runnerPos.lat, runnerPos.lng]} icon={runnerIcon} zIndexOffset={3000} title={`${runnerName || "Coureur"} (position estimée)`} />
          )}
          <FitToRoute points={track} />
          <Resize />
          <FlyTo spot={flyTarget} />
          <FitToPlan paths={planPaths} nonce={fitPlan} />
          {calibrage && <Calibrage track={track} onResult={setCalib} />}
          {calibrage && calib && <Marker position={[calib.lat, calib.lng]} icon={calibrageIcon} />}
        </MapContainer>
        {!tilesLoaded && !showPlan && <div className="map-badge">Chargement du fond de carte…</div>}
        <div className="map-legends">
          {planPaths.length > 0 && (
            <button type="button" className="map-legend map-legend--btn" onClick={() => setFitPlan((n) => n + 1)}>
              <span className="map-legend__dash" aria-hidden="true" /> Ton trajet à pied ·{" "}
              {plan.totalWalkKm.toFixed(1).replace(".", ",")} km
              <span className="sr-only"> (zoomer dessus)</span>
            </button>
          )}
          {runnerPos && (
            <div className="map-legend">
              <span className="map-legend__dot" aria-hidden="true" /> {runnerName || "Coureur"} · position estimée
            </div>
          )}
        </div>
      </div>

      <section className={drawerOpen ? "map-drawer is-open" : "map-drawer"} aria-label="Spots">
        <button type="button" className="map-drawer__handle" onClick={() => setDrawerOpen((o) => !o)} aria-expanded={drawerOpen}>
          <span className="sheet__handle" aria-hidden="true" />
          <span className="map-drawer__label">
            {planKind === "custom" ? "Ton parcours" : planKind === "stay" ? "Sans bouger" : "Meilleur parcours"} ·{" "}
            {plan.steps.length} passages
            {plan.totalWalkKm >= 0.05 ? ` · ${plan.totalWalkKm.toFixed(1).replace(".", ",")} km` : ""}{" "}
            {drawerOpen ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronUp size={16} aria-hidden="true" />}
          </span>
        </button>
        {drawerOpen && (
          <>
            <p className="map-drawer__hint">
              {planKind === "custom" ? (
                <>
                  Ajoute ou retire des spots : le parcours se recalcule.{" "}
                  <button type="button" className="link" onClick={useBestPlan}>
                    Meilleur parcours
                  </button>
                </>
              ) : (
                "Touche « Ajouter » sur un spot pour construire ton parcours."
              )}
            </p>
            <Carousel label="Spots du parcours" activeIndex={active} onActiveChange={(i) => select(i)}>
              {spots.map((spot) => {
                const p = nextPassageOf(passagesBySpot[spot.id], now);
                const mine = planKind === "custom" && customSpots.includes(spot.id);
                return (
                  <div key={spot.id} className={mine ? "map-card is-mine" : "map-card"}>
                    <button type="button" className="map-card__open" onClick={() => onOpenSpot(spot.id)}>
                      <span className={spot.highlight ? "spot-badge spot-badge--fort" : "spot-badge"} aria-hidden="true">
                        {spotNumbers[spot.id]}
                      </span>
                      <span className="map-card__main">
                        <span className="map-card__name">{spot.shortName}</span>
                        <span className="map-card__meta">
                          {p ? `${p.estimatedTime} · ${p.label}` : "Aucun passage"}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={mine ? "map-card__toggle is-on" : "map-card__toggle"}
                      aria-pressed={mine}
                      onClick={() => toggleInParcours(spot.id)}
                    >
                      {mine ? <Check size={18} strokeWidth={3} aria-hidden="true" /> : <Plus size={18} strokeWidth={3} aria-hidden="true" />}
                      {mine ? "Dans ton parcours" : "Ajouter"}
                      <span className="sr-only"> : {spot.shortName}</span>
                    </button>
                  </div>
                );
              })}
            </Carousel>
          </>
        )}
      </section>
    </div>
  );
}
