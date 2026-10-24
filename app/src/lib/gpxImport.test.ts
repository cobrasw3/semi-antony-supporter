import { describe, it, expect } from "vitest";
import { cumulativeDistancesKm, haversineDistanceKm, routeLengthKm, type LatLng } from "./geo";
import { detectMultiplePassages, elevationGainM, parseGpxPoints, regularCandidates, scaleToOfficial, simplify, type GpxPoint } from "./gpxImport";

// Tracés synthétiques autour de Paris (≈ 111 m par 0,001° de latitude).
const line = (from: LatLng, to: LatLng, n: number): LatLng[] =>
  Array.from({ length: n }, (_, i) => ({ lat: from.lat + ((to.lat - from.lat) * i) / (n - 1), lng: from.lng + ((to.lng - from.lng) * i) / (n - 1) }));
const A = { lat: 48.8, lng: 2.3 };
const B = { lat: 48.818, lng: 2.3 }; // 2 km au nord

describe("parseGpxPoints", () => {
  it("lit les points et leur altitude (trkpt), sinon les rtept", () => {
    const gpx = `<gpx><trk><trkseg>
      <trkpt lat="48.8" lon="2.3"><ele>40.5</ele><time>x</time></trkpt>
      <trkpt lat="48.801" lon="2.3"><ele>42</ele></trkpt>
      <trkpt lat="48.802" lon="2.301"/>
    </trkseg></trk></gpx>`;
    expect(parseGpxPoints(gpx)).toEqual([
      { lat: 48.8, lng: 2.3, ele: 40.5 },
      { lat: 48.801, lng: 2.3, ele: 42 },
      { lat: 48.802, lng: 2.301 },
    ]);
    expect(parseGpxPoints(`<gpx><rte><rtept lat="1" lon="2"/><rtept lat="3" lon="4"/></rte></gpx>`)).toHaveLength(2);
  });
});

describe("elevationGainM", () => {
  it("compte une vraie montée et ignore le bruit GPS", () => {
    const pts: GpxPoint[] = line(A, B, 201).map((p, i) => ({ ...p, ele: 50 + (i < 100 ? i * 0.3 : 30) + (i % 2 ? 1.5 : -1.5) }));
    const gain = elevationGainM(pts)!;
    expect(gain).toBeGreaterThan(25); // la montée de 30 m
    expect(gain).toBeLessThan(40); // pas les ±1,5 m de bruit à chaque point (≈ 300 m sinon)
  });
  it("null sans altitudes", () => {
    expect(elevationGainM(line(A, B, 10))).toBeNull();
  });
});

describe("simplify", () => {
  it("réduit une ligne droite à ses deux extrémités, garde les virages", () => {
    expect(simplify(line(A, B, 100))).toHaveLength(2);
    const corner = [...line(A, B, 50), ...line(B, { lat: 48.818, lng: 2.33 }, 50).slice(1)];
    const s = simplify(corner);
    expect(s).toHaveLength(3);
    expect(Math.abs(routeLengthKm(s) - routeLengthKm(corner))).toBeLessThan(0.001);
  });
});

describe("scaleToOfficial", () => {
  it("donne le facteur et signale un écart de plus de 2 %", () => {
    expect(scaleToOfficial(21.0, 21.0975).warn).toBe(false);
    const r = scaleToOfficial(20.0, 21.0975);
    expect(r.warn).toBe(true);
    expect(r.factor).toBeCloseTo(1.0549, 3);
    expect(r.diffPercent).toBeCloseTo(-5.2, 1);
  });
});

describe("detectMultiplePassages", () => {
  it("aller-retour : chaque endroit est vu deux fois, à des km symétriques", () => {
    const out = line(A, B, 100);
    const track = [...out, ...out.slice(0, -1).reverse()]; // 4 km
    const c = detectMultiplePassages(track);
    expect(c.length).toBeGreaterThan(0);
    for (const cand of c) {
      expect(cand.km).toHaveLength(2);
      expect(cand.km[0] + cand.km[1]).toBeCloseTo(4, 0);
    }
  });

  it("deux boucles identiques : le départ est vu 3 fois (départ, mi-course, arrivée)", () => {
    const C = { lat: 48.809, lng: 2.31 };
    const loop = [...line(A, B, 40), ...line(B, C, 40).slice(1), ...line(C, A, 40).slice(1)];
    const track = [...loop, ...loop.slice(1)];
    const best = detectMultiplePassages(track)[0];
    expect(best.km.length).toBeGreaterThanOrEqual(2);
    const half = cumulativeDistancesKm(loop).at(-1)!;
    expect(best.km.some((k) => Math.abs(k - half) < 0.1)).toBe(true);
  });

  it("boucles identiques : au plus 6 candidats, espacés d'au moins 800 m", () => {
    const C = { lat: 48.809, lng: 2.33 };
    const loop = [...line(A, B, 60), ...line(B, C, 60).slice(1), ...line(C, A, 60).slice(1)];
    const track = [...loop, ...loop.slice(1), ...loop.slice(1)];
    const c = detectMultiplePassages(track);
    expect(c.length).toBeGreaterThan(0);
    expect(c.length).toBeLessThanOrEqual(6);
    for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) expect(haversineDistanceKm(c[i], c[j])).toBeGreaterThanOrEqual(0.8);
    expect(c[0].km.length).toBeGreaterThanOrEqual(3);
  });

  it("ligne simple : aucun passage multiple", () => {
    expect(detectMultiplePassages(line(A, B, 100))).toEqual([]);
  });
});

describe("regularCandidates", () => {
  it("départ, arrivée et un point tous les 2,5 km, en km officiels", () => {
    const track = line(A, { lat: 48.89, lng: 2.3 }, 400); // ≈ 10 km
    const scale = 10 / routeLengthKm(track);
    const c = regularCandidates(track, scale);
    expect(c[0]).toMatchObject({ kind: "start", km: [0] });
    expect(c.at(-1)).toMatchObject({ kind: "finish", km: [10] });
    expect(c.filter((x) => x.kind === "regular").map((x) => x.km[0])).toEqual([2.5, 5, 7.5]);
  });

  it("évite les endroits déjà proposés", () => {
    const track = line(A, { lat: 48.89, lng: 2.3 }, 400);
    const scale = 10 / routeLengthKm(track);
    const at5 = regularCandidates(track, scale).find((x) => x.km[0] === 5)!;
    expect(regularCandidates(track, scale, 2.5, [at5]).some((x) => x.km[0] === 5)).toBe(false);
  });
});
