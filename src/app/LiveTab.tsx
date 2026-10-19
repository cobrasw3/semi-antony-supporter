// Onglet Live : énorme carte « Prochain passage », frise de la course,
// prochains passages. Avant le jour J : compte à rebours + « Prépare ta journée ».

import { useEffect, useState } from "react";
import { ArrowRight, Check, Footprints, LocateFixed, MapPinCheck, WifiOff } from "lucide-react";
import { checkinDelay, delaySentence } from "../lib/checkin";
import { formatLongDate } from "../lib/clock";
import { spotWhere } from "../lib/event";
import { RunnerLabel } from "../lib/format";
import { walkBetween } from "../lib/itinerary";
import { formatKmFr } from "../lib/runnerPosition";
import { minutesToTimeString, type Passage } from "../lib/timing";
import { readJson, writeJson } from "../lib/storage";
import { Button, CountdownRing, SpotCard } from "../ui/components";
import { haptic } from "../ui/haptics";
import { checkinTarget, passedByCheckin, countdown, planProgress, ringProgress, startProgress, upcomingPassages } from "./liveModel";
import { Timeline } from "./Timeline";
import type { useGeolocation } from "./useGeolocation";
import type { Supporter } from "./useSupporter";

interface LiveTabProps {
  s: Supporter;
  geo: ReturnType<typeof useGeolocation>;
  onGoPlan: () => void;
  onOpenSpot: (spotId: string) => void;
  onEditRunner: () => void;
  /** Pointe le passage du coureur (spot, km) maintenant ; la coque affiche la confirmation. */
  onCheckin: (spotId: string, km: number) => void;
}

export function LiveTab({ s, geo, onGoPlan, onOpenSpot, onEditRunner, onCheckin }: LiveTabProps) {
  const { dayStatus: status, passages, plan, race, config, clock, startMinutes, pace, spotById, spotNumbers, runnerName } = s;
  const Name = RunnerLabel(runnerName);
  const raceDay = clock.date === config.event.date;
  const runnerKm = s.runnerKm;

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
  // Pointage : vise l'étape du plan la plus proche de maintenant (pas forcément
  // celle affichée en grand, ex. coureur en retard sur l'étape précédente).
  const isCheckedIn = (p: Passage) => passedByCheckin(s.checkin, p);
  const target = raceDay ? checkinTarget(plan.steps, clock.minutes, isCheckedIn) : null;
  const checkinButton = target ? (
    <CheckinButton
      label={`${Name} vient de passer ${spotById[target.spotId] ? spotWhere(spotById[target.spotId]) : ""}`}
      onClick={() => onCheckin(target.spotId, target.km)}
    />
  ) : null;
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
                Ton plan : <strong className="num">{plan.steps.length} passages</strong>
                {plan.totalWalkKm < 0.05 ? " sans bouger" : ` · ${plan.totalWalkKm.toFixed(1).replace(".", ",")} km à pied`}
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
      // Le supporter suit SON plan : étape en cours et prochaine étape du plan.
      const { current, next, nextIndex } = planProgress(plan.steps, clock.minutes, LATE_GRACE_MINUTES, isCheckedIn);
      const total = plan.steps.length;
      if (current) {
        const index = plan.steps.indexOf(current);
        hero = (
          <section className="hero hero--now">
            <p className="hero__kicker">
              Étape {index + 1}/{total} · Ouvre l'œil
            </p>
            <h2 className="hero__spot display">{spotName(current)}</h2>
            <CountdownRing progress={1} value="Là !" unit="maintenant" caption={`jusqu'à ${current.windowEnd}`} />
            <p className="hero__next">
              {Name} peut passer {spotById[current.spotId] ? spotWhere(spotById[current.spotId]) : ""} en ce moment.
            </p>
            {checkinButton}
            {next && (
              <p className="hero__then">
                Ensuite : {spotName(next)} vers <strong className="num">{next.estimatedTime}</strong>
              </p>
            )}
          </section>
        );
      } else if (next) {
        const minutesToNext = next.estimatedMinutes - clock.minutes;
        const c = countdown(minutesToNext);
        const walk = walkTo(next);
        hero = (
          <section className="hero">
            <p className="hero__kicker">
              Étape {nextIndex + 1}/{total} · Prochain passage
            </p>
            <h2 className="hero__spot display">{spotName(next)}</h2>
            <CountdownRing
              progress={ringProgress(plan.steps, next, clock.minutes, startMinutes)}
              value={c.value}
              unit={c.unit}
              caption={`${next.windowStart} – ${next.windowEnd}`}
            />
            <p className="hero__next">
              {next.label} · {Name} passe vers <strong className="num">{next.estimatedTime}</strong>
            </p>
            <GeoLine
              geo={geo}
              // Depuis ta position, pas d'itinéraire réel (il faudrait envoyer la
              // position à un service externe) : estimation, annoncée comme telle.
              walk={walk ? `≈ ${Math.ceil(walk.minutes)} min à pied (${formatWalk(walk.walkKm)}, estimation)` : null}
              late={walk ? walk.minutes > minutesToNext : false}
            />
            {checkinButton}
          </section>
        );
      } else {
        const finish = passages.reduce((x, y) => (y.km >= x.km ? y : x));
        const finishSpot = spotById[finish.spotId];
        hero = (
          <section className="hero">
            <p className="hero__kicker">Ton plan est terminé</p>
            <p className="hero__title display">Direction l'arrivée</p>
            <p className="hero__sub">
              Arrivée de {runnerName || "ton coureur"} vers <strong className="num">{finish.estimatedTime}</strong>
              {finishSpot ? ` ${spotWhere(finishSpot)}` : ""}.
            </p>
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
  // Les étapes de TON plan (pas tous les passages) : les prochaines le jour J,
  // les premières avant.
  const heroStep =
    now !== null ? (planProgress(plan.steps, now).current ?? planProgress(plan.steps, now).next) : null;
  const upcoming =
    now !== null
      ? plan.steps.slice(heroStep ? plan.steps.indexOf(heroStep) + 1 : plan.steps.length).slice(0, 3)
      : upcomingPassages(plan.steps, null, 3);
  const caption =
    runnerKm !== null
      ? runnerKm >= race.distanceKm
        ? `${Name} a terminé`
        : `${Name} ≈ ${formatKmFr(runnerKm)} · arrivée vers ${minutesToTimeString(startMinutes + (pace ?? 0) * race.distanceKm)}`
      : `Départ ${race.startTime} · ${plan.steps.length} passages sur ton plan`;

  return (
    <div className="live">
      {hero}

      {s.checkin && raceDay && (
        <p className="checkin-note" role="status">
          <MapPinCheck size={18} aria-hidden="true" />
          <span>
            Horaires recalés sur ton pointage : {spotById[s.checkin.spotId]?.shortName ?? s.checkin.label} à{" "}
            {minutesToTimeString(s.checkin.minutes)} ({delaySentence(Name, checkinDelay(s.checkin, startMinutes, pace ?? 0))}).{" "}
            <button type="button" className="link" onClick={s.clearCheckin}>
              Effacer
            </button>
          </span>
        </p>
      )}

      <Timeline race={race} runnerKm={runnerKm} planPassages={plan.steps} caption={caption} />

      {upcoming.length > 0 && (
        <section className="section" aria-labelledby="live-next">
          <div className="section__head">
            <h2 id="live-next" className="section__title display">
              {raceDay ? "Ensuite" : "Ton programme"}
            </h2>
            <button type="button" className="section__link" onClick={onGoPlan}>
              Tout mon plan <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
          {!raceDay && (
            <p className="caption section__lead">
              Les premières étapes de ton plan ({plan.steps.length} passages
              {plan.totalWalkKm < 0.05 ? ", sans bouger" : `, ${formatWalk(plan.totalWalkKm)} à pied`}).
            </p>
          )}
          <div className="stack">
            {upcoming.map((p) => {
              const index = plan.steps.indexOf(p);
              const walkBefore = index > 0 ? plan.transitions[index - 1] : null;
              // Court : ce qui compte pour le supporter, c'est le trajet à faire.
              const how = !walkBefore
                ? p.label
                : walkBefore.sameSpot
                  ? "sur place"
                  : `${Math.ceil(walkBefore.walk.minutes)} min à pied`;
              const meta = `Étape ${index + 1} · ${how}`;
              return (
                <button key={`${p.spotId}-${p.km}`} type="button" className="card-btn" onClick={() => onOpenSpot(p.spotId)}>
                  <SpotCard
                    number={spotNumbers[p.spotId]}
                    name={spotName(p)}
                    meta={meta}
                    time={p.estimatedTime}
                    window={`${p.windowStart}–${p.windowEnd}`}
                    highlight={spotById[p.spotId]?.highlight}
                  />
                </button>
              );
            })}
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

/** Gros bouton du jour J : « Léa est passée ! » (recale les horaires suivants). */
function CheckinButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="checkin-btn" onClick={onClick}>
      <Check size={20} strokeWidth={3} aria-hidden="true" /> {label}
    </button>
  );
}

/** Une étape reste « en cours » ce temps après sa fourchette (coureur en retard). */
const LATE_GRACE_MINUTES = 5;

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
