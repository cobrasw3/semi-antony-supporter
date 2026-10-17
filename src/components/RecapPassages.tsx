import { spotWhere, type Spot } from "../lib/event";
import { RunnerLabel } from "../lib/format";
import type { Passage } from "../lib/timing";

interface RecapPassagesProps {
  spots: Spot[];
  passagesBySpot: Record<string, Passage[]>;
  runnerName: string;
  spotNumbers: Record<string, number>;
  onShowOnMap: (spotId: string) => void;
}

export function RecapPassages({ spots, passagesBySpot, runnerName, spotNumbers, onShowOnMap }: RecapPassagesProps) {
  // Un groupe par spot, ordonnés par premier passage sur le parcours (donc
  // chronologiquement). Les spots restent visibles même sans allure valide.
  const groups = spots
    .map((spot) => ({ spot, passages: passagesBySpot[spot.id] ?? [] }))
    .sort((a, b) => Math.min(...a.spot.km) - Math.min(...b.spot.km));
  const hasTimes = groups.some((g) => g.passages.length > 0);

  return (
    <section className="recap" aria-labelledby="recap-titre">
      <h2 id="recap-titre">Les spots en détail</h2>
      <p className="recap-disclaimer">Horaires estimés : arrive quelques minutes avant le début de la fourchette.</p>
      {!hasTimes && <p className="recap-empty">Indique une allure ou un temps visé pour voir les horaires.</p>}
      {(
        <ul className="recap-list">
          {groups.map(({ spot, passages }) => (
            <li key={spot.id} id={`spot-${spot.id}`} tabIndex={-1} className={spot.highlight ? "recap-group recap-group-fort" : "recap-group"}>
              <h3 className="recap-group-name">
                <span className={spot.highlight ? "spot-num spot-num-fort" : "spot-num"}>{spotNumbers[spot.id]}</span>
                {spot.highlight ? "⭐ " : ""}
                {spot.name}
              </h3>
              {passages.length > 0 && (
              <p className="recap-sentence">
                {RunnerLabel(runnerName)} passe {passages.length > 1 ? `${passages.length} fois ` : ""}
                {spotWhere(spot)} vers{" "}
                {passages.map((p) => p.estimatedTime).join(", ")}.
              </p>
              )}
              <p className="recap-acces">{spot.access}</p>
              <p className="recap-astuce">{spot.description}</p>
              <button type="button" className="recap-map-btn" onClick={() => onShowOnMap(spot.id)}>
                📍 Voir sur la carte
              </button>
              <ul className="recap-crossings">
                {passages.map((c) => (
                  <li key={c.km} className={c.kind === "finish" ? "recap-crossing-row recap-finish" : "recap-crossing-row"}>
                    <span className="recap-time">
                      {c.windowStart}–{c.windowEnd}
                    </span>
                    <span className="recap-loop">{c.label}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
