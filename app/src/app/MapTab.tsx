// Onglet Carte : carte plein écran (tracé, sens, bornes km, spots numérotés,
// position estimée du coureur) + tiroir avec carrousel des spots. Faire
// défiler le carrousel centre la carte ; toucher un marqueur ouvre le spot.

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { AlertTriangle, Check, ChevronDown, ChevronUp, MapPinCheck, Plus, X } from "lucide-react";
import { PMTiles } from "pmtiles";
import { leafletLayer } from "protomaps-leaflet";
import { TILES, USE_LOCAL_BASEMAP } from "../config/tiles";
import type { LatLng, Spot } from "../lib/event";
import { coursePointAt, coursePointLabel, FREE_SPOT_PREFIX, type CoursePoint } from "../lib/freeSpot";
import { haversineDistanceKm, projectPointOntoRoute } from "../lib/geo";
import { planWalkingPaths } from "../lib/itinerary";
import { directionArrows, groupOverlapping, kmMarks } from "../lib/mapMarkers";
import { positionOnTrack } from "../lib/runnerPosition";
import type { Passage } from "../lib/timing";
import { Carousel, type ToastItem } from "../ui/overlays";
import { loadBasemap, wholeFileSource } from "../pwa/basemap";
import type { CheckinPlace } from "./Shell";
import type { Supporter } from "./useSupporter";

const TILE_ERRORS_BEFORE_FALLBACK = 4;
const TILE_TIMEOUT_MS = 12_000;

const CUP_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14l-1.5 16a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2z"/><path d="M5.5 9h13"/></svg>';

const spotIcon = (n: number, highlight: boolean, active: boolean, inPlan: boolean, free = false, aid = false) =>
  L.divIcon({
    html: `<div class="pin${highlight ? " pin--fort" : ""}${active ? " is-active" : ""}${inPlan ? " pin--plan" : ""}${free ? " pin--libre" : ""}">${n}${
      aid ? `<span class="pin__aid" aria-hidden="true">${CUP_SVG}</span>` : ""
    }</div>`,
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

// Ravitaillement : petit pictogramme gobelet, non interactif.
const aidIcon = L.divIcon({
  html: `<div class="map-aid" aria-hidden="true">${CUP_SVG}</div>`,
  className: "pin-wrap",
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

// Point touché sur le parcours, pas encore ajouté.
const pickIcon = L.divIcon({
  html: '<div class="pin pin--pick" aria-hidden="true">+</div>',
  className: "pin-wrap",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const calibrageIcon = L.divIcon({ html: '<div class="map-calib"></div>', className: "pin-wrap", iconSize: [16, 16], iconAnchor: [8, 8] });

/** Fond de carte vectoriel hébergé (PMTiles), rendu par protomaps-leaflet. */
function LocalBasemap({
  url,
  attribution,
  onLoad,
  onError,
}: {
  url: string;
  attribution: string;
  onLoad: () => void;
  onError: () => void;
}) {
  const map = useMap();
  useEffect(() => {
    // Fichier introuvable (hors-ligne sans cache) : plan statique de secours.
    let cancelled = false;
    loadBasemap(url).catch(() => {
      if (!cancelled) onError();
    });
    const dark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const layer = leafletLayer({
      url: new PMTiles(wholeFileSource(url)),
      flavor: dark ? "dark" : "light",
      lang: "fr",
      maxDataZoom: 15,
      attribution,
    }) as unknown as L.GridLayer;
    layer.on("load", onLoad);
    layer.addTo(map);
    return () => {
      cancelled = true;
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
      // Bas : la hauteur réelle du tiroir des spots (variable selon l'écran).
      const drawer = map.getContainer().closest(".map-tab")?.querySelector<HTMLElement>(".map-drawer");
      const bottom = (drawer?.offsetHeight ?? 260) + 16;
      map.fitBounds(points.map((p) => [p.lat, p.lng]) as [number, number][], {
        paddingTopLeft: [12, 60], // légendes
        paddingBottomRight: [12, bottom],
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
    // Zoom 16 au moins : les spots voisins (départ, ravitos) y sont séparés.
    const z = Math.max(map.getZoom(), 16);
    const target = map.project([spot.lat, spot.lng], z).add([0, 90]);
    map.flyTo(map.unproject(target, z), z, { duration: 0.5 });
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

/** Distance (px) sous laquelle deux marqueurs de spots se gênent. */
const OVERLAP_PX = 38;

// Petit point à la position réelle d'un spot écarté (vue d'ensemble).
const anchorIcon = L.divIcon({ html: '<div class="map-anchor" aria-hidden="true"></div>', className: "pin-wrap", iconSize: [10, 10], iconAnchor: [5, 5] });

/**
 * Spots sur la carte. Ceux qui se chevauchent au zoom courant sont écartés
 * en éventail autour de leur position, reliés à elle par un trait : chacun
 * reste lisible et se touche normalement.
 */
function SpotMarkers({
  spots,
  render,
  lineColor,
}: {
  spots: Spot[];
  render: (spot: Spot, i: number, position: [number, number]) => ReactElement;
  lineColor: string;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const placed = useMemo(() => {
    const pts = spots.map((spot, i) => ({ spot, i, ...map.project([spot.lat, spot.lng], zoom) }));
    return groupOverlapping(pts, OVERLAP_PX).flatMap((group) => {
      if (group.length === 1) return [{ ...group[0], at: [group[0].spot.lat, group[0].spot.lng] as [number, number], moved: false }];
      const cx = group.reduce((t, g) => t + g.x, 0) / group.length;
      const cy = group.reduce((t, g) => t + g.y, 0) / group.length;
      const radius = 22 + 6 * group.length;
      return group.map((g, k) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * k) / group.length;
        const ll = map.unproject([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)], zoom);
        return { ...g, at: [ll.lat, ll.lng] as [number, number], moved: true };
      });
    });
  }, [spots, zoom, map]);
  return (
    <>
      {placed
        .filter((p) => p.moved)
        .map((p) => (
          <Polyline
            key={`lien-${p.spot.id}`}
            positions={[[p.spot.lat, p.spot.lng], p.at]}
            interactive={false}
            pathOptions={{ color: lineColor, weight: 2, opacity: 0.8 }}
          />
        ))}
      {placed
        .filter((p) => p.moved)
        .map((p) => (
          <Marker key={`ancre-${p.spot.id}`} position={[p.spot.lat, p.spot.lng]} icon={anchorIcon} interactive={false} keyboard={false} />
        ))}
      {placed.map((p) => render(p.spot, p.i, p.at))}
    </>
  );
}

/** Toucher la carte (ou appui long) : choisir un point du parcours. */
function PickPoint({ onPick }: { onPick: (latlng: LatLng) => void }) {
  useMapEvents({
    click: (e) => onPick(e.latlng),
    contextmenu: (e) => onPick(e.latlng),
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
  onCheckinAt,
}: {
  s: Supporter;
  focus: { spotId: string; nonce: number } | null;
  onOpenSpot: (spotId: string) => void;
  /** Demande de cadrage sur le trajet du plan (incrémentée par l'onglet Plan). */
  planFocus?: number;
  /** Demande « construire mon parcours » venant du Plan : ouvre le tiroir des spots. */
  buildHint?: number;
  onToast: (toast: ToastItem, ms?: number) => void;
  /** Pointage en un lieu, heure au choix (jour de la course seulement). */
  onCheckinAt?: (place: CheckinPlace) => void;
}) {
  const { race, track, spotNumbers, passagesBySpot, clock, config, runnerName, plan, planKind, customSpots, addSpot, removeSpot, useBestPlan, spotById } = s;
  const spots = race.spots;
  const [active, setActive] = useState(() => Math.max(0, spots.findIndex((sp) => sp.id === focus?.spotId)));
  const [flyTarget, setFlyTarget] = useState<Spot | null>(focus ? spots.find((sp) => sp.id === focus.spotId) ?? null : null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const tileErrors = useRef(0);
  // Point du parcours touché sur la carte (avant « Ajouter » / pointage).
  const [picked, setPicked] = useState<CoursePoint | null>(null);
  const [selectId, setSelectId] = useState<string | null>(null);
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

  const pickPoint = (latlng: LatLng) => {
    const point = coursePointAt(track, race, latlng);
    if (!point) {
      setPicked(null);
      onToast({ id: "hors-parcours", text: "Touche le tracé du parcours pour y choisir un point." }, 2500);
      return;
    }
    setPicked(point);
    setDrawerOpen(true);
  };
  const pickedPassages = useMemo(
    () => (picked ? s.passagesWith([{ ...spots[0], id: "point", km: picked.km }]) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [picked, s.passagesWith]
  );
  const addPicked = () => {
    if (!picked) return;
    const id = `${FREE_SPOT_PREFIX}${Date.now().toString(36)}`;
    const label = coursePointLabel(picked.kmInLoop);
    const result = s.addSpot(id, { id, raceId: s.officialRace.id, kmInLoop: picked.kmInLoop });
    if (result.ok) {
      setPicked(null);
      setSelectId(id);
      onToast({ id: `ajout-${id}`, text: `${label} ajouté à ton parcours.` }, 2500);
    } else {
      const drop = result.drop.map((d) => spotById[d]?.shortName).filter(Boolean);
      onToast(
        {
          id: `refus-${id}`,
          tone: "warn",
          icon: <AlertTriangle size={18} />,
          text: drop.length
            ? `Impossible d'ajouter ce point avec tes autres spots : retire ${drop.join(" ou ")} d'abord.`
            : `Impossible d'ajouter ce point : trop loin de tes autres spots pour l'allure de ${runnerName || "ton coureur"}.`,
        },
        5000
      );
    }
  };
  // Nouveau point ajouté : on le sélectionne dans le carrousel.
  useEffect(() => {
    if (!selectId) return;
    const i = spots.findIndex((sp) => sp.id === selectId);
    if (i >= 0) {
      setActive(i);
      setSelectId(null);
    }
  }, [selectId, spots]);
  const kms = useMemo(() => kmMarks(track, race), [track, race]);
  // Ravitaillements : en badge sur le spot s'il y en a un à moins de 50 m,
  // sinon en marqueur à part.
  const aidStations = useMemo(
    () =>
      (race.aidStations ?? []).map((a) => {
        const pos = positionOnTrack(a.kmInLoop, track, race);
        const spot = race.spots.find((sp) => !sp.free && haversineDistanceKm(sp, pos) < 0.05);
        return { ...a, ...pos, spotId: spot?.id ?? null };
      }),
    [race, track]
  );
  const aidSpotIds = useMemo(() => new Set(aidStations.map((a) => a.spotId).filter(Boolean)), [aidStations]);
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
              onError={() => setShowPlan(true)}
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
          {aidStations.filter((a) => !a.spotId).map((a) => (
            <Marker key={`ravito-${a.kmInLoop}`} position={[a.lat, a.lng]} icon={aidIcon} title={a.name} alt={a.name} zIndexOffset={500} keyboard={false} />
          ))}
          {kms.map((m) => (
            <Marker key={`k${m.label}`} position={[m.lat, m.lng]} icon={kmIcon(m.label ?? "")} interactive={false} keyboard={false} />
          ))}
          <SpotMarkers
            spots={spots}
            render={(spot, i, position) => (
              <Marker
                key={spot.id}
                position={position}
                icon={spotIcon(spotNumbers[spot.id], !!spot.highlight, i === active, planSpotIds.has(spot.id), !!spot.free, aidSpotIds.has(spot.id))}
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
            )}
            lineColor={routeColor}
          />
          {runnerPos && (
            <Marker position={[runnerPos.lat, runnerPos.lng]} icon={runnerIcon} zIndexOffset={3000} title={`${runnerName || "Coureur"} (position estimée)`} />
          )}
          <FitToRoute points={track} />
          <Resize />
          <FlyTo spot={flyTarget} />
          <FitToPlan paths={planPaths} nonce={fitPlan} />
          {calibrage ? <Calibrage track={track} onResult={setCalib} /> : <PickPoint onPick={pickPoint} />}
          {picked && <Marker position={[picked.lat, picked.lng]} icon={pickIcon} zIndexOffset={4000} interactive={false} keyboard={false} />}
          {calibrage && calib && <Marker position={[calib.lat, calib.lng]} icon={calibrageIcon} />}
        </MapContainer>
        {!tilesLoaded && !showPlan && <div className="map-badge">Chargement du fond de carte…</div>}
        {/* En mode calibrage, la bannière de position prend la place des légendes. */}
        <div className="map-legends" hidden={calibrage}>
          {planPaths.length > 0 && (
            <button type="button" className="map-legend map-legend--btn" onClick={() => setFitPlan((n) => n + 1)}>
              <span className="map-legend__dash" aria-hidden="true" /> Ton trajet à pied ·{" "}
              {plan.totalWalkKm.toFixed(1).replace(".", ",")} km
              <span className="sr-only"> (zoomer dessus)</span>
            </button>
          )}
          {aidStations.length > 0 && (
            <div className="map-legend map-legend--aid">
              <span className="map-aid map-aid--legend" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 4h14l-1.5 16a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2z" />
                  <path d="M5.5 9h13" />
                </svg>
              </span>{" "}
              Ravitaillement
            </div>
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
        {drawerOpen && picked && (
          <div className="map-card map-card--pick" role="group" aria-label={`Point choisi : ${coursePointLabel(picked.kmInLoop)}`}>
            <div className="map-card__pick-head">
              <span className="spot-badge spot-badge--pick" aria-hidden="true">+</span>
              <span className="map-card__main">
                <span className="map-card__name">{coursePointLabel(picked.kmInLoop)} · point choisi</span>
                <span className="map-card__meta">
                  {pickedPassages.length ? `Passages vers ${pickedPassages.map((p) => p.estimatedTime).join(", ")}` : "Indique l'allure pour voir les horaires"}
                </span>
              </span>
              <button type="button" className="icon-btn icon-btn--sm" aria-label="Fermer" onClick={() => setPicked(null)}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="map-card__pick-actions">
              <button type="button" className="map-card__toggle" onClick={addPicked}>
                <Plus size={18} strokeWidth={3} aria-hidden="true" /> Ajouter à mon parcours
              </button>
              {onCheckinAt && (
                <button
                  type="button"
                  className="checkin-btn checkin-btn--light"
                  onClick={() => {
                    const label = coursePointLabel(picked.kmInLoop);
                    onCheckinAt({ spotId: `point-${picked.kmInLoop}`, label, where: `au ${label.toLowerCase()}`, kms: picked.km });
                    setPicked(null);
                  }}
                >
                  <MapPinCheck size={20} aria-hidden="true" /> Pointer le passage de {runnerName || "mon coureur"} ici
                </button>
              )}
            </div>
            <p className="caption">Marche vers ce point calculée par les rues, à 100 m près : garde un peu de marge.</p>
          </div>
        )}
        {drawerOpen && !picked && (
          <>
            <p className="map-drawer__hint">
              {planKind === "custom" ? (
                <>
                  Ajoute ou retire des spots (ou touche le parcours) : il se recalcule.{" "}
                  <button type="button" className="link" onClick={useBestPlan}>
                    Meilleur parcours
                  </button>
                </>
              ) : (
                "Touche « Ajouter » sur un spot, ou touche le parcours pour choisir ton propre point."
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
