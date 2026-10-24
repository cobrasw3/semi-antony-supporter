import { describe, it, expect } from "vitest";
import rawEvent from "../../../courses/antony/event.json";
import { parseEventConfig, trackOf } from "./event";
import { freeSpotToSpot } from "./freeSpot";
import { walkBetweenSpots } from "./itinerary";
import { gridWalkKm, nearestGridIndex, withGridRoutes, type WalkingGrid } from "./walkingGrid";

const config = parseEventConfig(rawEvent);
const semi = config.races[0];
const grid = semi.walkingGrid as WalkingGrid;
const track = trackOf(semi);

describe("grille de distances à pied", () => {
  it("couvre la boucle tous les 100 m", () => {
    expect(grid.points).toHaveLength(70);
    expect(grid.km).toHaveLength(70);
    expect(nearestGridIndex(grid, { lat: grid.points[24][0], lng: grid.points[24][1] })).toBe(24);
  });

  it("donne une distance par les rues, jamais plus courte qu'à vol d'oiseau", () => {
    const a = freeSpotToSpot({ id: "libre-a", raceId: "semi", kmInLoop: 1 }, track, semi);
    const b = freeSpotToSpot({ id: "libre-b", raceId: "semi", kmInLoop: 4 }, track, semi);
    const km = gridWalkKm(grid, a, b)!;
    expect(km).toBeGreaterThan(0);
    expect(km).toBeGreaterThanOrEqual(walkBetweenSpots(a, b, config.settings.walking).directKm * 0.9);
  });

  it("deux points trop proches : pas de valeur (estimation gardée)", () => {
    expect(gridWalkKm(grid, track[0], track[0])).toBeNull();
  });

  it("complète les trajets des points libres sans toucher aux itinéraires connus", () => {
    const free = freeSpotToSpot({ id: "libre-a", raceId: "semi", kmInLoop: 4 }, track, semi);
    const spots = [...semi.spots, free];
    const routes = withGridRoutes(semi.walkingRoutes?.km, spots, grid)!;
    expect(routes["depart>ravito-sud"]).toBe(semi.walkingRoutes!.km["depart>ravito-sud"]);
    expect(routes["depart>libre-a"]).toBeGreaterThan(0);
    expect(walkBetweenSpots(spots[0], free, config.settings.walking, routes).source).toBe("route");
  });
});
