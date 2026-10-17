import { describe, it, expect } from "vitest";
import { tileConfig } from "./tiles";

describe("tileConfig", () => {
  it("OSM par défaut", () => {
    expect(tileConfig(undefined, undefined).url).toContain("tile.openstreetmap.org");
  });
  it("MapTiler avec clé, repli OSM sans clé", () => {
    expect(tileConfig("maptiler", "abc").url).toContain("api.maptiler.com");
    expect(tileConfig("maptiler", "abc").url).toContain("key=abc");
    expect(tileConfig("maptiler", undefined).url).toContain("openstreetmap");
  });
  it("Stadia", () => {
    expect(tileConfig("stadia", "k").url).toContain("tiles.stadiamaps.com");
  });
});
