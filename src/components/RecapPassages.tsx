import { spotWhere, type Spot } from "../lib/event";
import { RunnerLabel } from "../lib/format";
import type { Passage } from "../lib/timing";

interface RecapPassagesProps {
  spots: Spot[];
  passagesBySpot: Record<string, Passage[]>;
  runnerName: string;
}

export function RecapPassages({ spots, passagesBySpot, runnerName }: RecapPassagesProps) {
  // Un groupe par spot (nom + accès + conseil affichés une seule fois), ses
  // passages étant déjà en ordre croissant. Les groupes eux-mêmes sont
  // ordonnés par leur premier passage, pour rester globalement chronologique.
  const groups = spots
    .map((spot) => ({ spot, passages: passagesBySpot[spot.id] ?? [] }))
    .filter((g) => g.passages.length > 0)
    .sort((a, b) => a.passages[0].estimatedMinutes - b.passages[0].estimatedMinutes);

  return (
    <section className="recap" aria-label="Récapitulatif des passages">
      <h2>Récapitulatif des passages</h2>
      <p className="recap-disclaimer">Horaires estimés — arrive quelques minutes avant par sécurité.</p>
      {groups.length === 0 ? (
        <p className="recap-empty">Entre une allure ou un temps visé pour voir les horaires.</p>
      ) : (
        <ul className="recap-list">
          {groups.map(({ spot, passages }) => (
            <li key={spot.id} id={`spot-${spot.id}`} className={spot.highlight ? "recap-group recap-group-fort" : "recap-group"}>
              <p className="recap-group-name">
                {spot.highlight ? "⭐ " : ""}
                {spot.name}
              </p>
              <p className="recap-sentence">
                {RunnerLabel(runnerName)} passe {passages.length > 1 ? `${passages.length} fois ` : ""}
                {spotWhere(spot)} vers{" "}
                {passages.map((p) => p.estimatedTime).join(", ")}.
              </p>
              <p className="recap-acces">{spot.access}</p>
              <p className="recap-astuce">{spot.description}</p>
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
