import { describe, it, expect } from "vitest";
import rawEvent from "../../public/data/event.json";
import { parseEventConfig, trackOf } from "./event";
import { coursePointAt, freeSpotToSpot, isFreeSpotId, nearestPassageKm, passageKms } from "./freeSpot";
import { planOptions } from "./itinerary";
import { computeAllPassages, timeStringToMinutes } from "./timing";

const config = parseEventConfig(rawEvent);
const semi = config.races[0];
const track = trackOf(semi);
const champs = semi.spots.find((s) => s.id === "rue-des-champs")!;

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
    const options = planOptions(passages, race.spots, config.settings.walking, semi.walkingRoutes?.km, ["stade-suant", "libre-a"], true);
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
