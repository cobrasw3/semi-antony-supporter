import "leaflet/dist/leaflet.css";
import "../lib/leafletIcons";
import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import type { LatLng } from "../config/course";
import type { PointCrossings } from "../lib/timing";

interface CartePoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  accessNote: string;
}

interface CarteProps {
  loopPoints: LatLng[];
  points: CartePoint[];
  crossingsByPointId: Record<string, PointCrossings>;
}

function FitToRoute({ loopPoints }: { loopPoints: LatLng[] }) {
  const map = useMap();

  useEffect(() => {
    if (loopPoints.length === 0) return;
    const bounds = loopPoints.map((p) => [p.lat, p.lng]) as [number, number][];
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [loopPoints, map]);

  return null;
}

export function Carte({ loopPoints, points, crossingsByPointId }: CarteProps) {
  const polylinePositions = loopPoints.map((p) => [p.lat, p.lng]) as [number, number][];
  const fallbackCenter: [number, number] = polylinePositions[0] ?? [48.753, 2.297];

  return (
    <div className="carte-wrapper">
      <MapContainer
        center={fallbackCenter}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={polylinePositions} pathOptions={{ color: "#0a5c36", weight: 5 }} />
        {points.map((point) => {
          const pointCrossings = crossingsByPointId[point.id];
          return (
            <Marker key={point.id} position={[point.lat, point.lng]}>
              <Popup>
                <strong>{point.name}</strong>
                <p>{point.accessNote}</p>
                {pointCrossings && (
                  <ul className="popup-crossings">
                    {pointCrossings.crossings.map((c) => (
                      <li key={c.loopIndex}>
                        Boucle {c.loopIndex} : {c.windowStart}–{c.windowEnd}
                      </li>
                    ))}
                  </ul>
                )}
              </Popup>
            </Marker>
          );
        })}
        <FitToRoute loopPoints={loopPoints} />
      </MapContainer>
    </div>
  );
}
