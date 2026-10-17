// Onglet Live : énorme carte « Prochain passage », frise de la course,
// prochains passages. Avant le jour J : compte à rebours + « Prépare ta journée ».

import { useEffect, useState } from "react";
import { ArrowRight, Footprints, LocateFixed, WifiOff } from "lucide-react";
import { formatLongDate } from "../lib/clock";
import { spotWhere } from "../lib/event";
import { RunnerLabel } from "../lib/format";
import { walkBetween } from "../lib/itinerary";
import { estimatedKm, formatKmFr } from "../lib/runnerPosition";
import { minutesToTimeString, type Passage } from "../lib/timing";
import { readJson, writeJson } from "../lib/storage";
import { Button, CountdownRing, SpotCard } from "../ui/components";
import { haptic } from "../ui/haptics";
import { countdown, ringProgress, startProgress, upcomingPassages } from "./liveModel";
import { Timeline } from "./Timeline";
import type { useGeolocation } from "./useGeolocation";
import type { Supporter } from "./useSupporter";

interface LiveTabProps {
  s: Supporter;
  geo: ReturnType<typeof useGeolocation>;
  onGoPlan: () => void;
  onOpenSpot: (spotId: string) => void;
  onEditRunner: () => void;
}

export function LiveTab({ s, geo, onGoPlan, onOpenSpot, onEditRunner }: LiveTabProps) {
  const { dayStatus: status, passages, plan, race, config, clock, startMinutes, pace, spotById, spotNumbers, runnerName } = s;
  const Name = RunnerLabel(runnerName);
  const raceDay = clock.date === config.event.date;
  const runnerKm = raceDay && pace ? estimatedKm(clock.minutes, startMinutes, pace, race.distanceKm) : null;

  if (!status) {
    return (
      <div className="live">
        <section className="hero">
          <p className="hero__kicker">Objectif à compléter</p>
          <p className="hero__title display">{s.paceError ?? "Indique une allure"}</p>
          <Button onClick={onEditRunner}>Modifier l'objectif</Button>
        </section>
      </div>
    );
  }

  const spotName = (p: Passage) => spotById[p.spotId]?.shortName ?? p.spotId;
  const walkTo = (p: Passage) =>
    geo.position && spotById[p.spotId] ? walkBetween(geo.position, spotById[p.spotId], config.settings.walking) : null;

  let hero: React.ReactNode;
  switch (status.kind) {
    case "notRaceDay":
      hero =
        status.daysUntil > 0 ? (
          <section className="hero">
            <p className="hero__kicker">Le grand jour</p>
            <p className="hero__days display">
              <span className="hero__days-num">{status.daysUntil}</span>
              <span className="hero__days-unit">jour{status.daysUntil > 1 ? "s" : ""}</span>
            </p>
            <p className="hero__sub">
              {formatLongDate(config.event.date)}
              {config.event.dateToConfirm && " (date à confirmer)"} · départ {race.startTime}
            </p>
            <div className="hero__facts">
              <span>
                Arrivée de {runnerName || "ton coureur"} vers <strong className="num">{status.finish.estimatedTime}</strong>
              </span>
              <span>
                Tu peux voir {runnerName || "ton coureur"} <strong className="num">{plan.steps.length} fois</strong>
              </span>
            </div>
            <Button size="lg" block onClick={onGoPlan} icon={<ArrowRight size={20} />}>
              Prépare ta journée
            </Button>
          </section>
        ) : (
          <section className="hero">
            <p className="hero__kicker">Course terminée</p>
            <p className="hero__title display">Merci et bravo !</p>
            <p className="hero__sub">La course a eu lieu le {formatLongDate(config.event.date)}.</p>
          </section>
        );
      break;

    case "beforeStart": {
      const c = countdown(status.minutesToStart);
      hero = (
        <section className="hero">
          <p className="hero__kicker">Départ dans</p>
          <CountdownRing progress={startProgress(status.minutesToStart)} value={c.value} unit={c.unit} caption={`à ${race.startTime}`} />
          <p className="hero__next">
            Premier passage : <strong>{spotName(status.next)}</strong> · {status.next.windowStart}–{status.next.windowEnd}
          </p>
        </section>
      );
      break;
    }

    case "live": {
      const { current, next } = status;
      if (current) {
        hero = (
          <section className="hero hero--now">
            <p className="hero__kicker">Ouvre l'œil</p>
            <h2 className="hero__spot display">{spotName(current)}</h2>
            <CountdownRing progress={1} value="Là !" unit="maintenant" caption={`jusqu'à ${current.windowEnd}`} />
            <p className="hero__next">
              {Name} peut passer {spotById[current.spotId] ? spotWhere(spotById[current.spotId]) : ""} en ce moment.
            </p>
            {next && (
              <p className="hero__then">
                Ensuite : {spotName(next)} vers <strong className="num">{next.estimatedTime}</strong>
              </p>
            )}
          </section>
        );
      } else if (next && status.minutesToNext !== null) {
        const c = countdown(status.minutesToNext);
        const walk = walkTo(next);
        hero = (
          <section className="hero">
            <p className="hero__kicker">Prochain passage</p>
            <h2 className="hero__spot display">{spotName(next)}</h2>
            <CountdownRing
              progress={ringProgress(passages, next, clock.minutes, startMinutes)}
              value={c.value}
              unit={c.unit}
              caption={`${next.windowStart} – ${next.windowEnd}`}
            />
            <p className="hero__next">
              {next.label} · {Name} passe vers <strong className="num">{next.estimatedTime}</strong>
            </p>
            <GeoLine
              geo={geo}
              walk={walk ? `${Math.ceil(walk.minutes)} min à pied (${formatWalk(walk.walkKm)})` : null}
              late={walk ? walk.minutes > status.minutesToNext : false}
            />
          </section>
        );
      } else {
        hero = (
          <section className="hero">
            <p className="hero__kicker">Dernière ligne droite</p>
            <p className="hero__title display">Direction l'arrivée</p>
          </section>
        );
      }
      break;
    }

    case "finished":
      hero = (
        <FinishHero
          name={runnerName}
          time={status.finish.estimatedTime}
          where={spotById[status.finish.spotId] ? spotWhere(spotById[status.finish.spotId]) : null}
          storageKey={`${config.event.id}:${runnerName}:${pace}`}
        />
      );
      break;
  }

  const now = raceDay ? clock.minutes : null;
  const upcoming = upcomingPassages(passages, now, 3);
  const caption =
    runnerKm !== null
      ? runnerKm >= race.distanceKm
        ? `${Name} a terminé`
        : `${Name} ≈ ${formatKmFr(runnerKm)} · arrivée vers ${minutesToTimeString(startMinutes + (pace ?? 0) * race.distanceKm)}`
      : `Départ ${race.startTime} · ${plan.steps.length} passages sur ton plan`;

  return (
    <div className="live">
      {hero}

      <Timeline race={race} runnerKm={runnerKm} planPassages={plan.steps} caption={caption} />

      {upcoming.length > 0 && (
        <section className="section" aria-labelledby="live-next">
          <div className="section__head">
            <h2 id="live-next" className="section__title display">
              {raceDay ? "Ensuite" : "Le jour J"}
            </h2>
            <button type="button" className="section__link" onClick={onGoPlan}>
              Mon plan <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="stack">
            {upcoming.map((p) => (
              <button key={`${p.spotId}-${p.km}`} type="button" className="card-btn" onClick={() => onOpenSpot(p.spotId)}>
                <SpotCard
                  number={spotNumbers[p.spotId]}
                  name={spotName(p)}
                  meta={p.label}
                  time={p.estimatedTime}
                  window={`${p.windowStart}–${p.windowEnd}`}
                  highlight={spotById[p.spotId]?.highlight}
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {!raceDay && (
        <p className="tip">
          <WifiOff size={18} aria-hidden="true" />
          <span>Ouvre l'app la veille : elle marchera même si le réseau sature le jour J.</span>
        </p>
      )}
    </div>
  );
}

function formatWalk(km: number) {
  return km < 1 ? `${Math.round(km * 100) * 10} m` : `${km.toFixed(1).replace(".", ",")} km`;
}

function GeoLine({ geo, walk, late }: { geo: LiveTabProps["geo"]; walk: string | null; late: boolean }) {
  if (geo.state === "unavailable") return null;
  if (walk)
    return (
      <p className={late ? "hero__walk hero__walk--late" : "hero__walk"}>
        <Footprints size={18} aria-hidden="true" /> {walk}
        {late && " — ça va être juste"}
      </p>
    );
  if (geo.state === "denied") return <p className="hero__walk">Position refusée : distance à pied indisponible.</p>;
  return (
    <button type="button" className="hero__geo" onClick={geo.start} disabled={geo.state === "pending"}>
      <LocateFixed size={18} aria-hidden="true" />
      {geo.state === "pending" ? "Localisation…" : "Afficher la distance à pied"}
    </button>
  );
}

/** Arrivée estimée : petite célébration sobre, une seule fois. */
function FinishHero({ name, time, where, storageKey }: { name: string; time: string; where: string | null; storageKey: string }) {
  const key = `semi-supporter:fete:${storageKey}`;
  const [party] = useState(() => readJson<boolean>(key) !== true);
  useEffect(() => {
    if (!party) return;
    writeJson(key, true);
    haptic([60, 40, 60, 40, 120]);
  }, [party, key]);

  return (
    <section className={party ? "hero hero--finish is-party" : "hero hero--finish"}>
      {party && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} style={{ "--i": i } as React.CSSProperties} />
          ))}
        </div>
      )}
      <p className="hero__kicker">Course terminée</p>
      <p className="hero__flag" aria-hidden="true">
        🏁
      </p>
      <p className="hero__title display">{name ? `Bravo ${name} !` : "Bravo !"}</p>
      <p className="hero__sub">
        Arrivée estimée à <strong className="num">{time}</strong>
      </p>
      {where && <p className="hero__then">Rendez-vous {where} pour l'accueillir.</p>}
    </section>
  );
}
