// Réseau de rues (OpenStreetMap) pour tracer un parcours à partir de
// carrefours nommés (« rue A & rue B ») : normalisation des noms, graphe,
// carrefour entre deux rues, plus court chemin, rues traversées à un km
// donné. Fonctions pures, testées ; utilisées par scripts/gpx-from-waypoints.ts.

import { haversineDistanceKm, type LatLng } from "./geo.ts";

/** Éléments OSM tels que renvoyés par Overpass (`out body;` sur nœuds et voies). */
export interface OsmNode {
  type: "node";
  id: number;
  lat: number;
  lon: number;
}
export interface OsmWay {
  type: "way";
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
}
export type OsmElement = OsmNode | OsmWay | { type: string; id: number };

/** « Rue de l'Abbé-Carton » → « abbe carton » : sans accents, articles ni type de voie. */
export function normalizeStreet(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`\-–./]/g, " ")
    .replace(/\b(rue|avenue|av|boulevard|bd|place|square|impasse|allee|passage|villa|quai|cours|chemin|route)\b/g, " ")
    .replace(/\b(de|du|des|la|le|les|l|d|a|au|aux)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** « rue A & rue B, 75014 Paris » → { streets: ["rue A", "rue B"], area: "75014 Paris" }. */
export function parseQuery(query: string): { streets: string[]; area: string } {
  const [streetsPart, ...rest] = query.split(",");
  return {
    streets: streetsPart
      .split(/\s*&\s*/)
      .map((s) => s.trim())
      .filter(Boolean),
    area: rest.join(",").trim(),
  };
}

/** Voies praticables par une course à pied sur route, et leur coût relatif (chemins piétons pénalisés). */
const HIGHWAY_COST: Record<string, number> = {
  primary: 1, primary_link: 1, secondary: 1, secondary_link: 1, tertiary: 1, tertiary_link: 1,
  unclassified: 1, residential: 1, living_street: 1, pedestrian: 1.2, service: 1.5,
  road: 1.2, cycleway: 2.5, footway: 3, path: 3, steps: 20, track: 3,
};

export interface Edge {
  to: number;
  km: number;
  cost: number;
  name: string;
}
export interface StreetGraph {
  nodes: Map<number, LatLng>;
  edges: Map<number, Edge[]>;
  /** Nœuds de chaque rue (nom normalisé). */
  streetNodes: Map<string, Set<number>>;
  /** Nom affiché de chaque rue (nom normalisé → nom OSM). */
  displayNames: Map<string, string>;
}

export function buildGraph(elements: OsmElement[]): StreetGraph {
  const nodes = new Map<number, LatLng>();
  for (const e of elements) if (e.type === "node") nodes.set(e.id, { lat: (e as OsmNode).lat, lng: (e as OsmNode).lon });
  const edges = new Map<number, Edge[]>();
  const streetNodes = new Map<string, Set<number>>();
  const displayNames = new Map<string, string>();
  const add = (a: number, e: Edge) => {
    let list = edges.get(a);
    if (!list) edges.set(a, (list = []));
    list.push(e);
  };
  for (const e of elements) {
    if (e.type !== "way") continue;
    const way = e as OsmWay;
    const cost = HIGHWAY_COST[way.tags?.highway ?? ""];
    if (cost === undefined || way.tags?.area === "yes") continue;
    const name = way.tags?.name ?? "";
    const key = normalizeStreet(name);
    if (key) {
      displayNames.set(key, name);
      let set = streetNodes.get(key);
      if (!set) streetNodes.set(key, (set = new Set()));
      for (const n of way.nodes) set.add(n);
    }
    // Sens unique ignoré : on court sur la chaussée fermée à la circulation.
    for (let i = 0; i + 1 < way.nodes.length; i++) {
      const [a, b] = [way.nodes[i], way.nodes[i + 1]];
      const pa = nodes.get(a);
      const pb = nodes.get(b);
      if (!pa || !pb) continue;
      const km = haversineDistanceKm(pa, pb);
      add(a, { to: b, km, cost: km * cost, name });
      add(b, { to: a, km, cost: km * cost, name });
    }
  }
  return { nodes, edges, streetNodes, displayNames };
}

/** Rue du graphe correspondant à un nom (exact une fois normalisé, sinon contenant tous ses mots). */
export function findStreet(graph: StreetGraph, name: string): string | null {
  const key = normalizeStreet(name);
  if (graph.streetNodes.has(key)) return key;
  const words = key.split(" ");
  const candidates = [...graph.streetNodes.keys()].filter((k) => words.every((w) => k.split(" ").includes(w)));
  return candidates.length === 1 ? candidates[0] : null;
}

export type Junction =
  | { ok: true; node: number; lat: number; lng: number; note?: string }
  | { ok: false; reason: string };

/**
 * Carrefour de deux rues : nœuds communs (regroupés à 60 m près, pour les
 * boulevards à deux chaussées) ; à défaut, les deux nœuds les plus proches
 * s'ils sont à moins de 40 m. Ambigu (plusieurs carrefours éloignés) ou
 * introuvable → raison explicite, jamais de choix au hasard.
 */
export function junction(graph: StreetGraph, a: string, b: string): Junction {
  const ka = findStreet(graph, a);
  const kb = findStreet(graph, b);
  if (!ka) return { ok: false, reason: `rue introuvable dans OSM : « ${a} »` };
  if (!kb) return { ok: false, reason: `rue introuvable dans OSM : « ${b} »` };
  const na = graph.streetNodes.get(ka)!;
  const nb = graph.streetNodes.get(kb)!;
  const shared = [...na].filter((n) => nb.has(n) && graph.nodes.has(n));
  const at = (n: number) => graph.nodes.get(n)!;
  if (shared.length) {
    const far = shared.some((n) => haversineDistanceKm(at(n), at(shared[0])) > 0.06);
    if (far) return { ok: false, reason: `plusieurs carrefours entre « ${a} » et « ${b} » (${shared.length} points éloignés) : préciser lat/lon` };
    const c = { lat: shared.reduce((t, n) => t + at(n).lat, 0) / shared.length, lng: shared.reduce((t, n) => t + at(n).lng, 0) / shared.length };
    const node = shared.reduce((x, y) => (haversineDistanceKm(at(x), c) <= haversineDistanceKm(at(y), c) ? x : y));
    return { ok: true, node, ...at(node), note: shared.length > 1 ? `${shared.length} nœuds communs regroupés` : undefined };
  }
  let best: [number, number, number] | null = null;
  for (const x of na) {
    if (!graph.nodes.has(x)) continue;
    for (const y of nb) {
      if (!graph.nodes.has(y)) continue;
      const d = haversineDistanceKm(at(x), at(y));
      if (!best || d < best[2]) best = [x, y, d];
    }
  }
  if (best && best[2] <= 0.04) return { ok: true, node: best[0], ...at(best[0]), note: `rues voisines à ${Math.round(best[2] * 1000)} m, sans nœud commun` };
  return { ok: false, reason: `« ${a} » et « ${b} » ne se croisent pas dans OSM${best ? ` (au plus près : ${Math.round(best[2] * 1000)} m)` : ""}` };
}

/** Nœud du graphe le plus proche d'un point (coordonnées forcées). */
export function nearestNode(graph: StreetGraph, p: LatLng): number {
  let best = -1;
  let bestD = Infinity;
  for (const [id, q] of graph.nodes) {
    if (!graph.edges.has(id)) continue;
    const d = haversineDistanceKm(p, q);
    if (d < bestD) {
      best = id;
      bestD = d;
    }
  }
  return best;
}

export interface RoutedLeg {
  nodes: number[];
  km: number;
  /** Rues empruntées, dans l'ordre, avec la distance parcourue sur chacune. */
  streets: Array<{ name: string; km: number }>;
}

/** Plus court chemin (Dijkstra sur le coût pondéré par type de voie). */
export function shortestPath(graph: StreetGraph, from: number, to: number): RoutedLeg | null {
  if (from === to) return { nodes: [from], km: 0, streets: [] };
  const dist = new Map<number, number>([[from, 0]]);
  const prev = new Map<number, { node: number; edge: Edge }>();
  // File de priorité simple (tas binaire).
  const heap: Array<[number, number]> = [[0, from]];
  const push = (item: [number, number]) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [d, u] = pop();
    if (u === to) break;
    if (d > (dist.get(u) ?? Infinity)) continue;
    for (const e of graph.edges.get(u) ?? []) {
      const nd = d + e.cost;
      if (nd < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, nd);
        prev.set(e.to, { node: u, edge: e });
        push([nd, e.to]);
      }
    }
  }
  if (!prev.has(to)) return null;
  const path: number[] = [to];
  const used: Edge[] = [];
  for (let n = to; n !== from; ) {
    const p = prev.get(n)!;
    used.unshift(p.edge);
    path.unshift(p.node);
    n = p.node;
  }
  const streets: Array<{ name: string; km: number }> = [];
  for (const e of used) {
    const last = streets.at(-1);
    if (last && last.name === e.name) last.km += e.km;
    else streets.push({ name: e.name, km: e.km });
  }
  return { nodes: path, km: used.reduce((t, e) => t + e.km, 0), streets };
}

/** « 1 rue de l'Abbé-Carton, 2 …, 9 … » → [[1, "rue de l'Abbé-Carton"], …]. */
export function parseKmMarkers(text: string): Array<[number, string]> {
  const body = text.includes(":") ? text.slice(text.indexOf(":") + 1) : text;
  return [...body.matchAll(/(\d+)\s+([^,]+?)(?=,\s*\d+\s|\.?\s*$)/g)].map((m) => [Number(m[1]), m[2].trim()]);
}

const STOP = new Set(["vers", "coin", "boucle", "2e", "1re", "pres", "entre", "et"]);

/**
 * La description d'une borne (« coin Abbé-Carton / Pauly ») correspond-elle
 * à l'une des rues traversées autour de ce km ? Au moins un mot significatif
 * en commun.
 */
export function markerMatches(description: string, streetNames: string[]): boolean {
  const words = normalizeStreet(description.replace(/\(.*?\)/g, " "))
    .split(" ")
    .filter((w) => w.length > 2 && !STOP.has(w));
  const names = streetNames.map(normalizeStreet);
  return words.some((w) => names.some((n) => n.split(" ").includes(w)));
}
