// Position de l'utilisateur, uniquement sur demande explicite, pour afficher
// la distance à pied jusqu'au prochain spot. Elle reste sur l'appareil :
// jamais envoyée, jamais mémorisée.

import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLng } from "../lib/event";

export type GeoState = "idle" | "pending" | "on" | "denied" | "unavailable";

export function useGeolocation() {
  const [state, setState] = useState<GeoState>(() => ("geolocation" in navigator ? "idle" : "unavailable"));
  const [position, setPosition] = useState<LatLng | null>(null);
  const watchId = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
  }, []);

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    setState("pending");
    stop();
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        setPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
        setState("on");
      },
      (err) => setState(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 }
    );
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { state, position, start, stop };
}
