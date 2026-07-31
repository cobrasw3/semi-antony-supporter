import type { CrossingEstimate } from "../lib/timing";

export interface RecapPoint {
  id: string;
  name: string;
  acces: string;
  astuce: string;
  pointFort?: boolean;
  crossings: CrossingEstimate[];
}

interface RecapPassagesProps {
  points: RecapPoint[];
}

export function RecapPassages({ points }: RecapPassagesProps) {
  // Un groupe par point d'observation (nom + acces + astuce affichés une
  // seule fois), ses 3 passages étant déjà en ordre croissant. Les groupes
  // eux-mêmes sont ordonnés par leur premier passage, pour rester globalement
  // chronologique.
  const groups = points
    .filter((p) => p.crossings.length > 0)
    .slice()
    .sort((a, b) => a.crossings[0].windowStartMinutes - b.crossings[0].windowStartMinutes);

  return (
    <section className="recap" aria-label="Récapitulatif des passages">
      <h2>Récapitulatif des passages</h2>
      <p className="recap-disclaimer">Horaires estimés — arrive quelques minutes avant par sécurité.</p>
      {groups.length === 0 ? (
        <p className="recap-empty">Entre une allure ou un temps visé pour voir les horaires.</p>
      ) : (
        <ul className="recap-list">
          {groups.map((point) => (
            <li
              key={point.id}
              className={point.pointFort ? "recap-group recap-group-fort" : "recap-group"}
            >
              <p className="recap-group-name">
                {point.pointFort ? "⭐ " : ""}
                {point.name}
              </p>
              <p className="recap-acces">{point.acces}</p>
              <p className="recap-astuce">{point.astuce}</p>
              <ul className="recap-crossings">
                {point.crossings.map((c) => (
                  <li key={c.loopIndex} className="recap-crossing-row">
                    <span className="recap-time">
                      {c.windowStart}–{c.windowEnd}
                    </span>
                    <span className="recap-loop">Boucle {c.loopIndex}</span>
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
