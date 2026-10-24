import { describe, it, expect } from "vitest";
import { buildGraph, findStreet, junction, markerMatches, nearestNode, normalizeStreet, parseKmMarkers, parseQuery, shortestPath, type OsmElement } from "./streetGraph";

// Petit quartier fictif (≈ 111 m entre deux lignes de latitude à 0,001°) :
//
//   1 ── 2 ── 3      rue Haute (1-2-3)
//   │    │    │      rue Ouest (1-4-7), allée (2-5, chemin piéton), rue Est (3-6-9)
//   4    5    6      rue Basse (7-8-9), boulevard Double : deux chaussées 6-10 et 6'-10'
//   │    │    │
//   7 ── 8 ── 9
const node = (id: number, lat: number, lon: number) => ({ type: "node", id, lat, lon }) as const;
const way = (id: number, nodes: number[], name: string, highway = "residential") => ({ type: "way", id, nodes, tags: { name, highway } }) as const;
const ELEMENTS: OsmElement[] = [
  node(1, 48.832, 2.32), node(2, 48.832, 2.322), node(3, 48.832, 2.324),
  node(4, 48.831, 2.32), node(5, 48.831, 2.322), node(6, 48.831, 2.324),
  node(7, 48.83, 2.32), node(8, 48.83, 2.322), node(9, 48.83, 2.324),
  node(10, 48.831, 2.326), node(11, 48.8313, 2.324), node(12, 48.8313, 2.326),
  way(100, [1, 2, 3], "Rue Haute"), way(101, [1, 4, 7], "Rue de l'Ouest"), way(102, [3, 6, 9], "Rue de l’Est"),
  way(103, [7, 8, 9], "Rue Basse"), way(104, [2, 5, 8], "Allée des Jardins", "footway"),
  way(105, [6, 10], "Boulevard Double"), way(106, [11, 12], "Boulevard Double"), way(107, [3, 11], "Rue de l’Est"),
  way(108, [4, 5, 6], "Rue Neuve"), way(109, [7, 4], "Rue Neuve"),
];
const g = buildGraph(ELEMENTS);

describe("noms de rues", () => {
  it("normalise accents, tirets, apostrophes, types de voie et articles", () => {
    expect(normalizeStreet("Rue de l'Abbé-Carton")).toBe("abbe carton");
    expect(normalizeStreet("rue de l’Abbé Carton")).toBe("abbe carton");
    expect(normalizeStreet("Boulevard Edgar-Quinet")).toBe("edgar quinet");
    expect(normalizeStreet("Rue du Commandant René Mouchotte")).toBe("commandant rene mouchotte");
  });
  it("découpe une requête « rue A & rue B, zone »", () => {
    expect(parseQuery("rue Gassendi & rue des Plantes, 75014 Paris")).toEqual({ streets: ["rue Gassendi", "rue des Plantes"], area: "75014 Paris" });
    expect(parseQuery("rue Saillard, 75014 Paris").streets).toEqual(["rue Saillard"]);
  });
  it("retrouve une rue même écrite autrement", () => {
    expect(findStreet(g, "rue de l'Est")).toBe("est");
    expect(findStreet(g, "rue Inconnue")).toBeNull();
  });
});

describe("carrefours", () => {
  it("nœud commun de deux rues", () => {
    expect(junction(g, "rue Haute", "rue de l'Ouest")).toMatchObject({ ok: true, node: 1 });
  });
  it("rues qui ne se croisent pas : raison explicite", () => {
    const j = junction(g, "rue Haute", "rue Basse");
    expect(j.ok).toBe(false);
    if (!j.ok) expect(j.reason).toMatch(/ne se croisent pas/);
  });
  it("plusieurs carrefours éloignés : ambigu, on ne devine pas", () => {
    // Rue Neuve croise la rue de l'Ouest en 4 et la rue de l'Est en 6, mais aussi l'Ouest en 7 (≈ 111 m de 4).
    const j = junction(g, "rue Neuve", "rue de l'Ouest");
    expect(j.ok).toBe(false);
    if (!j.ok) expect(j.reason).toMatch(/plusieurs carrefours/);
  });
  it("rue introuvable", () => {
    const j = junction(g, "rue Haute", "rue Fantôme");
    expect(j.ok).toBe(false);
  });
  it("nœud le plus proche de coordonnées forcées", () => {
    expect(nearestNode(g, { lat: 48.83001, lng: 2.32201 })).toBe(8);
  });
});

describe("plus court chemin", () => {
  it("suit les rues et préfère la chaussée au chemin piéton", () => {
    // 2 → 8 : l'allée piétonne est plus courte (222 m) mais pénalisée ; la route par 1-4-7-8 fait 555 m.
    const leg = shortestPath(g, 2, 8)!;
    expect(leg.streets.map((s) => s.name)).not.toContain("Allée des Jardins");
    expect(leg.km).toBeGreaterThan(0.4);
  });
  it("donne les rues empruntées et la longueur", () => {
    const leg = shortestPath(g, 1, 9)!;
    expect(leg.km).toBeCloseTo(0.111 * 2 + 0.147 * 2, 1); // 2 pas nord-sud + 2 pas est-ouest
    expect(leg.nodes[0]).toBe(1);
    expect(leg.nodes.at(-1)).toBe(9);
  });
  it("même point : trajet nul", () => {
    expect(shortestPath(g, 5, 5)!.km).toBe(0);
  });
});

describe("bornes km", () => {
  it("lit la liste des bornes du plan", () => {
    const m = parseKmMarkers("Les numéros 1 à 9 du plan sont des bornes : 1 rue de l'Abbé-Carton, 2 rue Raymond-Losserand, 5 rue des Plantes (2e boucle), 9 rue Émile-Richard / Gassendi.");
    expect(m).toEqual([
      [1, "rue de l'Abbé-Carton"],
      [2, "rue Raymond-Losserand"],
      [5, "rue des Plantes (2e boucle)"],
      [9, "rue Émile-Richard / Gassendi"],
    ]);
  });
  it("vérifie qu'une borne tombe sur la bonne rue", () => {
    expect(markerMatches("coin Abbé-Carton / Pauly", ["Rue Pauly"])).toBe(true);
    expect(markerMatches("rue des Plantes (2e boucle)", ["Rue des Plantes"])).toBe(true);
    expect(markerMatches("vers Gaîté", ["Rue Raymond Losserand"])).toBe(false);
  });
});
