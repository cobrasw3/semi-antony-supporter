// Onglet Carte : carte plein écran (tracé, sens, bornes km, spots numérotés,
// position estimée du coureur) + tiroir avec carrousel des spots. Faire
// défiler le carrousel centre la carte ; toucher un marqueur ouvre le spot.

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TILES } from "../config/tiles";
import type { LatLng, Spot } from "../lib/event";
import { projectPointOntoRoute } from "../lib/geo";
import { directionArrows, kmMarks } from "../lib/mapMarkers";
import { estimatedKm, positionOnTrack } from "../lib/runnerPosition";
import type { Passage } from "../lib/timing";
import { Carousel } from "../ui/overlays";
import type { Supporter } from "./useSupporter";

const TILE_ERRORS_BEFORE_FALLBACK = 4;
const TILE_TIMEOUT_MS = 12_000;

const spotIcon = (n: number, highlight: boolean, active: boolean) =>
  L.divIcon({
    html: `<div class="pin${highlight ? " pin--fort" : ""}${active ? " is-active" : ""}">${n}</div>`,
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

function FitToRoute({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(points.map((p) => [p.lat, p.lng]) as [number, number][], { padding: [28, 28], paddingBottomRight: [28, 190] });
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
}: {
  s: Supporter;
  focus: { spotId: string; nonce: number } | null;
  onOpenSpot: (spotId: string) => void;
}) {
  const { race, track, spotNumbers, passagesBySpot, clock, config, pace, startMinutes, runnerName } = s;
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
  // Couleur de marque (tokens) : Leaflet écrit la couleur en attribut SVG.
  const routeColor = useMemo(() => getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#14213d", []);
  const kms = useMemo(() => kmMarks(track, race), [track, race]);
  const raceDay = clock.date === config.event.date;
  const now = raceDay ? clock.minutes : null;
  const runnerKm = raceDay && pace ? estimatedKm(clock.minutes, startMinutes, pace, race.distanceKm) : null;
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
        <MapContainer center={[track[0].lat, track[0].lng]} zoom={15} zoomControl={false} style={{ height: "100%", width: "100%" }}>
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
          <Polyline positions={track.map((p) => [p.lat, p.lng] as [number, number])} pathOptions={{ color: routeColor, weight: 7, opacity: 0.9 }} />
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
              icon={spotIcon(spotNumbers[spot.id], !!spot.highlight, i === active)}
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
          {calibrage && <Calibrage track={track} onResult={setCalib} />}
          {calibrage && calib && <Marker position={[calib.lat, calib.lng]} icon={calibrageIcon} />}
        </MapContainer>
        {!tilesLoaded && !showPlan && <div className="map-badge">Chargement du fond de carte…</div>}
        {runnerPos && (
          <div className="map-legend">
            <span className="map-legend__dot" aria-hidden="true" /> {runnerName || "Coureur"} · position estimée
          </div>
        )}
      </div>

      <section className={drawerOpen ? "map-drawer is-open" : "map-drawer"} aria-label="Spots">
        <button type="button" className="map-drawer__handle" onClick={() => setDrawerOpen((o) => !o)} aria-expanded={drawerOpen}>
          <span className="sheet__handle" aria-hidden="true" />
          <span className="map-drawer__label">
            {spots.length} spots {drawerOpen ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronUp size={16} aria-hidden="true" />}
          </span>
        </button>
        {drawerOpen && (
          <Carousel label="Spots du parcours" activeIndex={active} onActiveChange={(i) => select(i)}>
            {spots.map((spot) => {
              const p = nextPassageOf(passagesBySpot[spot.id], now);
              return (
                <button key={spot.id} type="button" className="map-card" onClick={() => onOpenSpot(spot.id)}>
                  <span className={spot.highlight ? "spot-badge spot-badge--fort" : "spot-badge"} aria-hidden="true">
                    {spotNumbers[spot.id]}
                  </span>
                  <span className="map-card__main">
                    <span className="map-card__name">{spot.shortName}</span>
                    <span className="map-card__meta">
                      {p ? p.label : "Aucun passage"}
                    </span>
                  </span>
                  {p && <span className="map-card__time">{p.estimatedTime}</span>}
                </button>
              );
            })}
          </Carousel>
        )}
      </section>
    </div>
  );
}
