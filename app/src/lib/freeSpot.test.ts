import { describe, it, expect } from "vitest";
import rawEvent from "../../../courses/antony/event.json";
import { parseEventConfig, trackOf } from "./event";
import { coursePointAt, freeSpotToSpot, isFreeSpotId, nearestPassageKm, passageKms } from "./freeSpot";
import { planOptions } from "./itinerary";
import { computeAllPassages, timeStringToMinutes } from "./timing";

const config = parseEventConfig(rawEvent);
const semi = config.races[0];
const track = trackOf(semi);
// Un endroit du parcours au km 4 (montée de la rue des Champs).
const champs = freeSpotToSpot({ id: "libre-champs", raceId: "semi", kmInLoop: 4 }, track, semi);

describe("passageKms", () => {
  it("un passage par boucle, jamais au-delà de l'arrivée", () => {
    expect(passageKms(3.4, semi)).toEqual([3.4, 10.4, 17.4]);
    expect(passageKms(2, { loops: 1, loopLengthKm: 10, distanceKm: 10 })).toEqual([2]);
  });
});

describe("coursePointAt", () => {
  it("retrouve le km d'un spot connu en touchant à côté", () => {
    const p = coursePointAt(track, semi, { lat: champs.lat + 0.0002, lng: champs.lng })!;
    expect(p).not.toBeNull();
    expect(p.kmInLoop).toBeGreaterThan(3.8);
    expect(p.kmInLoop).toBeLessThan(4.2);
    expect(p.km).toHaveLength(3);
    expect(p.km[1] - p.km[0]).toBeCloseTo(7);
  });

  it("refuse un point trop loin du parcours", () => {
    expect(coursePointAt(track, semi, { lat: champs.lat + 0.01, lng: champs.lng + 0.01 })).toBeNull();
  });
});

describe("freeSpotToSpot", () => {
  const spot = freeSpotToSpot({ id: "libre-a", raceId: "semi", kmInLoop: 3.4 }, track, semi);

  it("devient un spot comme les autres, nommé par son km", () => {
    expect(spot).toMatchObject({ id: "libre-a", shortName: "Km 3,4", where: "au km 3,4", free: true, km: [3.4, 10.4, 17.4] });
    expect(isFreeSpotId(spot.id)).toBe(true);
    expect(isFreeSpotId("ravito-sud")).toBe(false);
  });

  it("peut entrer dans un parcours sur mesure (marche estimée)", () => {
    const race = { ...semi, spots: [...semi.spots, spot] };
    const passages = computeAllPassages(race, 5.5, config.settings.margin);
    const options = planOptions(passages, race.spots, config.settings.walking, semi.walkingRoutes?.km, ["ravito-virage", "libre-a"], true);
    expect(options.length).toBeGreaterThan(0);
    const best = options.at(-1)!;
    expect(best.steps.some((p) => p.spotId === "libre-a")).toBe(true);
    const leg = best.transitions.find((t) => t.to.spotId === "libre-a" && !t.sameSpot);
    if (leg) expect(leg.walk.source).toBe("estimate");
  });
});

describe("nearestPassageKm", () => {
  const start = timeStringToMinutes("14:30");
  it("choisit la boucle dont l'heure prévue est la plus proche de l'heure pointée", () => {
    // km 3,4 / 10,4 / 17,4 à 5:30/km : 14:48:42, 15:27:12, 16:05:42
    expect(nearestPassageKm([3.4, 10.4, 17.4], timeStringToMinutes("15:31"), start, 5.5)).toBe(10.4);
    expect(nearestPassageKm([3.4, 10.4, 17.4], timeStringToMinutes("14:40"), start, 5.5)).toBe(3.4);
    expect(nearestPassageKm([], 900, start, 5.5)).toBeNull();
  });
});

describe("parcours entier (une seule « boucle » dans la config)", () => {
  it("un point touché sur un aller-retour donne ses deux passages", () => {
    const A = { lat: 48.8, lng: 2.3 };
    const out = Array.from({ length: 100 }, (_, i) => ({ lat: A.lat + (0.018 * i) / 99, lng: A.lng })); // 2 km
    const track = [...out, ...out.slice(0, -1).reverse()]; // 4 km
    const race = { loops: 1, loopLengthKm: 4, distanceKm: 4 };
    const p = coursePointAt(track, race, { lat: A.lat + 0.0045, lng: A.lng + 0.0002 })!; // ≈ 500 m du départ
    expect(p.km).toHaveLength(2);
    expect(p.km[0]).toBeCloseTo(0.5, 1);
    expect(p.km[1]).toBeCloseTo(3.5, 1);
  });
});
