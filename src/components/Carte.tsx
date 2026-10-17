import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { TILES } from "../config/tiles";
import type { LatLng, Race, Spot } from "../lib/event";
import { projectPointOntoRoute } from "../lib/geo";
import { directionArrows, kmMarks } from "../lib/mapMarkers";

export interface MapFocus {
  spotId: string;
  /** Change à chaque demande, pour recentrer même sur le même spot. */
  nonce: number;
}

interface CarteProps {
  loopPoints: LatLng[];
  race: Pick<Race, "loops" | "loopLengthKm" | "distanceKm">;
  spots: Spot[];
  spotNumbers: Record<string, number>;
  focus: MapFocus | null;
  onSelectSpot: (spotId: string) => void;
}

/** Au-delà, sans aucune tuile chargée, on affiche le plan statique. */
const TILE_ERRORS_BEFORE_FALLBACK = 4;
const TILE_TIMEOUT_MS = 12_000;

function spotIcon(number: number, highlight: boolean, active: boolean): L.DivIcon {
  const classes = ["marker-num", highlight ? "marker-num-fort" : "", active ? "marker-num-active" : ""].join(" ");
  return L.divIcon({
    html: `<div class="${classes}">${number}</div>`,
    className: "marker-num-wrapper",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function arrowIcon(bearing: number): L.DivIcon {
  return L.divIcon({
    html: `<div class="marker-arrow" aria-hidden="true" style="transform: rotate(${bearing - 90}deg)">➤</div>`,
    className: "marker-arrow-wrapper",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function kmIcon(label: string): L.DivIcon {
  return L.divIcon({
    html: `<div class="marker-km" aria-hidden="true">km ${label}</div>`,
    className: "marker-km-wrapper",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

const calibrageMarkerIcon = L.divIcon({
  html: '<div class="marker-calibrage" aria-hidden="true"></div>',
  className: "marker-calibrage-wrapper",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitToRoute({ loopPoints }: { loopPoints: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (loopPoints.length === 0) return;
    map.fitBounds(loopPoints.map((p) => [p.lat, p.lng]) as [number, number][], { padding: [24, 24] });
  }, [loopPoints, map]);
  return null;
}

/** Recalcule la taille de la carte quand son conteneur change (carte repliée puis dépliée). */
function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

/** Recentre la carte sur un spot demandé depuis la liste. */
function FlyToFocus({ focus, spots }: { focus: MapFocus | null; spots: Spot[] }) {
  const map = useMap();
  useEffect(() => {
    const spot = focus && spots.find((s) => s.id === focus.spotId);
    if (spot) map.flyTo([spot.lat, spot.lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [focus, spots, map]);
  return null;
}

interface CalibrageResult {
  lat: number;
  lng: number;
  distanceAlongRouteKm: number;
  distanceFromRouteKm: number;
}

/**
 * Mode calibrage (?calibrage=1) : un clic sur la carte donne la distance le
 * long de la boucle, pour caler les km des spots dans event.json.
 */
function CalibrageClickListener({
  loopPoints,
  onResult,
}: {
  loopPoints: LatLng[];
  onResult: (result: CalibrageResult) => void;
}) {
  useMapEvents({
    click(e) {
      const projection = projectPointOntoRoute(loopPoints, { lat: e.latlng.lat, lng: e.latlng.lng });
      onResult({ lat: e.latlng.lat, lng: e.latlng.lng, ...projection });
    },
  });
  return null;
}

function isCalibrageMode(): boolean {
  return new URLSearchParams(window.location.search).get("calibrage") === "1";
}

export function Carte({ loopPoints, race, spots, spotNumbers, focus, onSelectSpot }: CarteProps) {
  const polylinePositions = loopPoints.map((p) => [p.lat, p.lng]) as [number, number][];
  const fallbackCenter: [number, number] = polylinePositions[0] ?? [48.75, 2.29];
  const calibrage = isCalibrageMode();
  const [calibrageResult, setCalibrageResult] = useState<CalibrageResult | null>(null);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const tileErrors = useRef(0);

  const arrows = useMemo(() => directionArrows(loopPoints), [loopPoints]);
  const kms = useMemo(() => kmMarks(loopPoints, race), [loopPoints, race]);

  // Aucune tuile après un délai raisonnable (hors-ligne, réseau saturé) :
  // on bascule sur le plan statique, toujours disponible (précaché).
  useEffect(() => {
    if (tilesLoaded) return;
    const id = window.setTimeout(() => setShowPlan(true), TILE_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [tilesLoaded]);

  const retry = () => {
    tileErrors.current = 0;
    setShowPlan(false);
    setTilesLoaded(false);
  };

  return (
    <div className="carte-wrapper">
      {!tilesLoaded && !showPlan && (
        <div className="carte-loading-badge" aria-live="polite">
          Chargement du fond de carte…
        </div>
      )}
      {calibrage && (
        <div className="calibrage-banner">
          {calibrageResult ? (
            <>
              📍 Distance dans la boucle : <strong>{calibrageResult.distanceAlongRouteKm.toFixed(2)} km</strong> (clic à{" "}
              {(calibrageResult.distanceFromRouteKm * 1000).toFixed(0)} m du tracé)
            </>
          ) : (
            "🛠️ Mode calibrage — clique sur la carte pour voir la distance dans la boucle"
          )}
        </div>
      )}
      {showPlan && (
        <div className="carte-plan">
          <img src="/parcours-plan.svg" alt="Plan schématique du parcours avec les spots numérotés" />
          <div className="carte-plan-bar">
            <span>Fond de carte indisponible : plan simplifié.</span>
            <button type="button" onClick={retry}>
              Réessayer
            </button>
          </div>
        </div>
      )}
      <MapContainer center={fallbackCenter} zoom={15} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          key={showPlan ? "plan" : "tiles"}
          attribution={TILES.attribution}
          url={TILES.url}
          maxZoom={TILES.maxZoom}
          // CORS : permet au service worker de mettre les tuiles en cache
          // sans réponses « opaques » (qui gonflent le quota de stockage).
          crossOrigin="anonymous"
          eventHandlers={{
            load: () => setTilesLoaded(true),
            tileload: () => setTilesLoaded(true),
            tileerror: () => {
              tileErrors.current += 1;
              if (!tilesLoaded && tileErrors.current >= TILE_ERRORS_BEFORE_FALLBACK) setShowPlan(true);
            },
          }}
        />
        <Polyline positions={polylinePositions} pathOptions={{ color: "#0a5c36", weight: 6 }} />
        {arrows.map((a, i) => (
          <Marker key={`arrow-${i}`} position={[a.lat, a.lng]} icon={arrowIcon(a.bearing)} interactive={false} keyboard={false} />
        ))}
        {kms.map((m) => (
          <Marker key={`km-${m.label}`} position={[m.lat, m.lng]} icon={kmIcon(m.label ?? "")} interactive={false} keyboard={false} />
        ))}
        {spots.map((spot) => (
          <Marker
            key={spot.id}
            position={[spot.lat, spot.lng]}
            icon={spotIcon(spotNumbers[spot.id], !!spot.highlight, focus?.spotId === spot.id)}
            title={`${spotNumbers[spot.id]}. ${spot.shortName}`}
            alt={`${spotNumbers[spot.id]}. ${spot.shortName}`}
            zIndexOffset={1000}
            eventHandlers={{ click: () => onSelectSpot(spot.id) }}
          />
        ))}
        <FitToRoute loopPoints={loopPoints} />
        <InvalidateOnResize />
        <FlyToFocus focus={focus} spots={spots} />
        {calibrage && <CalibrageClickListener loopPoints={loopPoints} onResult={setCalibrageResult} />}
        {calibrage && calibrageResult && (
          <Marker position={[calibrageResult.lat, calibrageResult.lng]} icon={calibrageMarkerIcon} />
        )}
      </MapContainer>
    </div>
  );
}
