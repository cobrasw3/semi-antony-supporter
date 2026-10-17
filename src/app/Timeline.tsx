// Mini-frise de la course : départ → fins de boucle → arrivée, avec les
// passages du plan et le point « coureur estimé » qui avance.

import type { Race } from "../lib/event";
import type { Passage } from "../lib/timing";

export function Timeline({
  race,
  runnerKm,
  planPassages,
  caption,
}: {
  race: Pick<Race, "distanceKm" | "loops" | "loopLengthKm">;
  runnerKm: number | null;
  planPassages: Passage[];
  caption: string;
}) {
  const pct = (km: number) => `${Math.min(100, Math.max(0, (km / race.distanceKm) * 100))}%`;
  const loopEnds = race.loops > 1 ? Array.from({ length: race.loops - 1 }, (_, i) => (i + 1) * race.loopLengthKm) : [];

  return (
    <figure className="timeline" aria-label={caption}>
      <div className="timeline__track">
        <div className="timeline__done" style={{ width: runnerKm !== null ? pct(runnerKm) : "0%" }} />
        {loopEnds.map((km) => (
          <span key={km} className="timeline__tick" style={{ left: pct(km) }} aria-hidden="true" />
        ))}
        {planPassages.map((p) => (
          <span key={`${p.spotId}-${p.km}`} className="timeline__stop" style={{ left: pct(p.km) }} aria-hidden="true" />
        ))}
        {runnerKm !== null && <span className="timeline__runner" style={{ left: pct(runnerKm) }} aria-hidden="true" />}
      </div>
      <div className="timeline__labels" aria-hidden="true">
        <span style={{ left: "0%" }}>Départ</span>
        {loopEnds.map((km) => (
          <span key={km} style={{ left: pct(km) }}>
            {km} km
          </span>
        ))}
        <span style={{ left: "100%" }}>🏁</span>
      </div>
      <figcaption className="timeline__caption">{caption}</figcaption>
    </figure>
  );
}
