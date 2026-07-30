import type { PointCrossings } from "../lib/timing";

interface RecapPassagesProps {
  crossings: PointCrossings[];
}

interface FlatRow {
  key: string;
  pointName: string;
  loopIndex: number;
  windowStart: string;
  windowEnd: string;
  windowStartMinutes: number;
}

export function RecapPassages({ crossings }: RecapPassagesProps) {
  const rows: FlatRow[] = crossings
    .flatMap((point) =>
      point.crossings.map((c) => ({
        key: `${point.pointId}-${c.loopIndex}`,
        pointName: point.pointName,
        loopIndex: c.loopIndex,
        windowStart: c.windowStart,
        windowEnd: c.windowEnd,
        windowStartMinutes: c.windowStartMinutes,
      }))
    )
    .sort((a, b) => a.windowStartMinutes - b.windowStartMinutes);

  return (
    <section className="recap" aria-label="Récapitulatif des passages">
      <h2>Récapitulatif des passages</h2>
      {rows.length === 0 ? (
        <p className="recap-empty">Entrez une allure ou un temps visé pour voir les horaires.</p>
      ) : (
        <ul className="recap-list">
          {rows.map((row) => (
            <li key={row.key} className="recap-row">
              <span className="recap-time">
                {row.windowStart}–{row.windowEnd}
              </span>
              <span className="recap-point">{row.pointName}</span>
              <span className="recap-loop">Boucle {row.loopIndex}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
