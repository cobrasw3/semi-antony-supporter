import { describe, it, expect } from "vitest";
import rawEvent from "../../../courses/antony/event.json";
import { parseEventConfig, trackOf } from "./event";
import { directionArrows, groupOverlapping, kmMarks } from "./mapMarkers";

const semi = parseEventConfig(rawEvent).races[0];
const track = trackOf(semi);

describe("kmMarks", () => {
  it("place une borne par km de boucle, avec les km des 3 tours", () => {
    const marks = kmMarks(track, semi);
    expect(marks).toHaveLength(6);
    expect(marks[0].label).toBe("1 · 8 · 15");
    expect(marks[5].label).toBe("6 · 13 · 20");
  });

  it("parcours sans boucle : un repère par km", () => {
    const marks = kmMarks(track, { loops: 1, loopLengthKm: 7, distanceKm: 7 });
    expect(marks.map((m) => m.label)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });
});

describe("directionArrows", () => {
  it("espace régulièrement les flèches sur le tracé", () => {
    expect(directionArrows(track, 0.5)).toHaveLength(14);
  });
});

describe("groupOverlapping", () => {
  it("regroupe les marqueurs qui se touchent, de proche en proche", () => {
    const pts = [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 30, y: 0 },
      { id: "c", x: 60, y: 0 },
      { id: "d", x: 200, y: 0 },
    ];
    expect(groupOverlapping(pts, 36).map((g) => g.map((p) => p.id))).toEqual([["a", "b", "c"], ["d"]]);
    expect(groupOverlapping(pts, 10).map((g) => g.length)).toEqual([1, 1, 1, 1]);
  });
});

describe("kmMarks sur un parcours entier qui repasse au même endroit", () => {
  it("fusionne les bornes superposées (aller-retour)", () => {
    const out = Array.from({ length: 200 }, (_, i) => ({ lat: 48.8 + (0.0225 * i) / 199, lng: 2.3 })); // 2,5 km
    const track = [...out, ...out.slice(0, -1).reverse()]; // 5 km
    const marks = kmMarks(track, { loops: 1, loopLengthKm: 5, distanceKm: 5 });
    // km 1 et km 4 au même endroit, km 2 et km 3 aussi.
    expect(marks.map((m) => m.label)).toEqual(["1 · 4", "2 · 3"]);
  });
});
