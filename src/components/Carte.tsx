import "leaflet/dist/leaflet.css";
import "../lib/leafletIcons";
import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { LatLng, Spot } from "../lib/event";
import { projectPointOntoRoute } from "../lib/geo";
import type { Passage } from "../lib/timing";

interface CarteProps {
  loopPoints: LatLng[];
  spots: Spot[];
  passagesBySpot: Record<string, Passage[]>;
}

// Marqueur distinct pour le "point fort" (celui où l'on voit son coureur le
// plus souvent) : une étoile, plus grande et plus facile à repérer d'un
// coup d'œil que le marqueur bleu par défaut.
const pointFortIcon = L.divIcon({
  html: '<div class="marker-star" aria-hidden="true">⭐</div>',
  className: "marker-star-wrapper",
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -16],
});

// Explicitement instancié (plutôt que de laisser `icon` à `undefined` sur le
// Marker) : react-leaflet transmet un prop `icon={undefined}` tel quel à
// Leaflet, qui écrase alors son icône par défaut interne et plante au rendu.
const defaultIcon = new L.Icon.Default();

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
    const bounds = loopPoints.map((p) => [p.lat, p.lng]) as [number, number][];
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [loopPoints, map]);

  return null;
}

interface CalibrageResult {
  lat: number;
  lng: number;
  distanceAlongRouteKm: number;
  distanceFromRouteKm: number;
}

/**
 * Écoute les clics sur la carte en mode calibrage et reporte le résultat de
 * la projection au composant parent (pas de rendu propre : juste le hook
 * d'écoute, react-leaflet exige qu'il tourne dans un descendant de
 * MapContainer).
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
      const result: CalibrageResult = {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        distanceAlongRouteKm: projection.distanceAlongRouteKm,
        distanceFromRouteKm: projection.distanceFromRouteKm,
      };
      onResult(result);
      console.log(
        `Calibrage : distance dans la boucle ≈ ${projection.distanceAlongRouteKm.toFixed(2)} km ` +
          `(clic à ${(projection.distanceFromRouteKm * 1000).toFixed(0)} m du tracé)`
      );
    },
  });

  return null;
}

function isCalibrageMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("calibrage") === "1";
}

export function Carte({ loopPoints, spots, passagesBySpot }: CarteProps) {
  const polylinePositions = loopPoints.map((p) => [p.lat, p.lng]) as [number, number][];
  const fallbackCenter: [number, number] = polylinePositions[0] ?? [48.753, 2.297];
  const calibrage = isCalibrageMode();
  const [calibrageResult, setCalibrageResult] = useState<CalibrageResult | null>(null);
  const [tilesLoading, setTilesLoading] = useState(true);

  return (
    <div className="carte-wrapper">
      {tilesLoading && (
        <div className="carte-loading-badge" aria-live="polite">
          Chargement de la carte…
        </div>
      )}
      {calibrage && (
        <div className="calibrage-banner">
          {calibrageResult ? (
            <>
              📍 Distance dans la boucle : <strong>{calibrageResult.distanceAlongRouteKm.toFixed(2)} km</strong>
              {" "}
              (clic à {(calibrageResult.distanceFromRouteKm * 1000).toFixed(0)} m du tracé)
            </>
          ) : (
            "🛠️ Mode calibrage — clique sur la carte pour voir la distance dans la boucle"
          )}
        </div>
      )}
      <MapContainer
        center={fallbackCenter}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            loading: () => setTilesLoading(true),
            load: () => setTilesLoading(false),
          }}
        />
        <Polyline positions={polylinePositions} pathOptions={{ color: "#0a5c36", weight: 5 }} />
        {spots.map((point) => {
          const passages = passagesBySpot[point.id];
          return (
            <Marker
              key={point.id}
              position={[point.lat, point.lng]}
              icon={point.highlight ? pointFortIcon : defaultIcon}
            >
              <Popup>
                <strong>{point.highlight ? "⭐ " : ""}{point.name}</strong>
                <p className="popup-acces">{point.access}</p>
                <p className="popup-astuce">{point.description}</p>
                {passages && (
                  <ul className="popup-crossings">
                    {passages.map((c) => (
                      <li key={c.km}>
                        {c.label} : {c.windowStart}–{c.windowEnd}
                      </li>
                    ))}
                  </ul>
                )}
              </Popup>
            </Marker>
          );
        })}
        <FitToRoute loopPoints={loopPoints} />
        {calibrage && <CalibrageClickListener loopPoints={loopPoints} onResult={setCalibrageResult} />}
        {calibrage && calibrageResult && (
          <Marker position={[calibrageResult.lat, calibrageResult.lng]} icon={calibrageMarkerIcon} />
        )}
      </MapContainer>
    </div>
  );
}
