import { describe, it, expect } from "vitest";
import { parseGpx, parseKml, parseTrack } from "./gpxKml";

const SAMPLE_GPX = `<?xml version="1.0"?>
<gpx>
  <trk>
    <trkseg>
      <trkpt lat="48.7530" lon="2.2970"><ele>60</ele></trkpt>
      <trkpt lat="48.7560" lon="2.3010"></trkpt>
      <trkpt lat="48.7500" lon="2.2930"/>
    </trkseg>
  </trk>
</gpx>`;

const SAMPLE_KML = `<?xml version="1.0"?>
<kml>
  <Document>
    <Placemark>
      <LineString>
        <coordinates>
          2.2970,48.7530,0 2.3010,48.7560,0
          2.2930,48.7500,0
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

describe("parseGpx", () => {
  it("extrait les points lat/lon dans l'ordre du fichier", () => {
    const points = parseGpx(SAMPLE_GPX);
    expect(points).toEqual([
      { lat: 48.753, lng: 2.297 },
      { lat: 48.756, lng: 2.301 },
      { lat: 48.75, lng: 2.293 },
    ]);
  });

  it("renvoie un tableau vide si aucun point trouvé", () => {
    expect(parseGpx("<gpx></gpx>")).toEqual([]);
  });
});

describe("parseKml", () => {
  it("extrait les points en inversant lng,lat -> {lat, lng}", () => {
    const points = parseKml(SAMPLE_KML);
    expect(points).toEqual([
      { lat: 48.753, lng: 2.297 },
      { lat: 48.756, lng: 2.301 },
      { lat: 48.75, lng: 2.293 },
    ]);
  });
});

describe("parseTrack", () => {
  it("détecte le GPX automatiquement", () => {
    expect(parseTrack(SAMPLE_GPX)).toHaveLength(3);
  });

  it("détecte le KML automatiquement", () => {
    expect(parseTrack(SAMPLE_KML)).toHaveLength(3);
  });
});
