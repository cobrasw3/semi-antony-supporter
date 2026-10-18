// Onglet Plan : choisir combien de fois voir son coureur (compromis avec la
// marche), les étapes du plan choisi (✅/⚠️/❌ entre chaque), le choix des
// spots, les horaires complets, les rappels.

import { useState } from "react";
import { AlertTriangle, BellRing, CalendarPlus, Check, Footprints, Map as MapIcon, MapPin, X } from "lucide-react";
import { spotWhere } from "../lib/event";
import type { Plan, Transition } from "../lib/itinerary";
import type { Passage } from "../lib/timing";
import { Button, Chip, Segmented, SpotCard } from "../ui/components";
import type { useReminders } from "./useReminders";
import type { Supporter } from "./useSupporter";

function formatWalk(km: number) {
  return km < 1 ? `${Math.round(km * 100) * 10} m` : `${km.toFixed(1).replace(".", ",")} km`;
}

const walkMinutes = (plan: Plan) => Math.ceil(plan.transitions.reduce((sum, t) => sum + t.walk.minutes, 0));

function TransitionRow({ t }: { t: Transition; safety?: number }) {
  if (t.sameSpot)
    return (
      <div className="transition">
        <span className="transition__line" aria-hidden="true" />
        <span className="transition__text">Reste sur place</span>
        <Chip tone="ok">
          <Check size={14} strokeWidth={3} aria-hidden="true" /> {Math.round(t.slackMinutes)} min d'attente
        </Chip>
      </div>
    );
  const verdict =
    t.status === "ok" ? (
      <Chip tone="ok">
        <Check size={14} strokeWidth={3} aria-hidden="true" /> {Math.round(t.slackMinutes)} min d'avance
      </Chip>
    ) : t.status === "tight" ? (
      <Chip tone="warn">
        <AlertTriangle size={14} aria-hidden="true" /> Ça va être juste
      </Chip>
    ) : (
      <Chip tone="ko">
        <X size={14} strokeWidth={3} aria-hidden="true" /> Trop tard
      </Chip>
    );
  return (
    <div className="transition">
      <span className="transition__line" aria-hidden="true" />
      <span className="transition__text">
        <Footprints size={16} aria-hidden="true" /> {Math.ceil(t.walk.minutes)} min · {formatWalk(t.walk.walkKm)}
      </span>
      {verdict}
    </div>
  );
}

export function PlanTab({
  s,
  reminders,
  onOpenSpot,
  onShowPlanOnMap,
  onBuildOnMap,
}: {
  s: Supporter;
  reminders: ReturnType<typeof useReminders>;
  onOpenSpot: (spotId: string) => void;
  onShowPlanOnMap: () => void;
  /** Ouvre la carte pour construire son parcours spot par spot. */
  onBuildOnMap: () => void;
}) {
  const {
    passages,
    race,
    config,
    spotById,
    spotNumbers,
    runnerName,
    plan,
    planKind,
    bestPlan,
    stationaryPlan,
    customSpots,
    spotsConflict,
    useBestPlan,
    useStayPut,
    routes,
  } = s;
  const walking = config.settings.walking;
  const [view, setView] = useState<"plan" | "horaires">("plan");
  const who = runnerName || "ton coureur";
  const Who = runnerName || "Ton coureur";

  if (passages.length === 0) return <p className="section muted">Indique un objectif pour voir ton plan.</p>;

  /** « au stade Georges Suant » ou « 4× Stade Georges Suant · 3× Parc Heller ». */
  const spotsOf = (option: Plan) => {
    const counts = new Map<string, number>();
    for (const p of option.steps) counts.set(p.spotId, (counts.get(p.spotId) ?? 0) + 1);
    const ids = [...counts.keys()];
    if (ids.length === 1 && spotById[ids[0]]) return spotWhere(spotById[ids[0]]);
    return ids.map((id) => `${counts.get(id)}× ${spotById[id]?.shortName ?? id}`).join(" · ");
  };
  const inPlan = new Set(plan.steps.map((p) => `${p.spotId}@${p.km}`));
  const still = plan.totalWalkKm < 0.05;
  const title = planKind === "custom" ? "Ton parcours sur mesure" : planKind === "stay" ? "Sans bouger" : "Le meilleur parcours";

  const card = (p: Passage, meta: string) => (
    <button type="button" className="card-btn" onClick={() => onOpenSpot(p.spotId)}>
      <SpotCard
        number={spotNumbers[p.spotId]}
        name={spotById[p.spotId]?.shortName ?? p.spotId}
        meta={meta}
        time={p.estimatedTime}
        window={`${p.windowStart}–${p.windowEnd}`}
        highlight={p.kind === "finish"}
      />
    </button>
  );

  return (
    <div className="plan">
      <section className="section" aria-labelledby="plan-titre">
        <h2 id="plan-titre" className="section__title display">
          Où voir {who}&nbsp;?
        </h2>

        {spotsConflict && (
          <p className="notice notice--warn">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>Avec cette allure, tes spots ne s'enchaînent plus : voici le meilleur parcours.</span>
          </p>
        )}

        {/* Le parcours en cours, résumé en une carte. */}
        <div className="current-plan">
          <span className="current-plan__count num">{plan.steps.length}×</span>
          <span className="current-plan__main">
            <span className="current-plan__kicker">{title}</span>
            <span className="current-plan__title">
              {still ? "Sans marcher" : `${formatWalk(plan.totalWalkKm)} à pied · ≈ ${walkMinutes(plan)} min`}
            </span>
            <span className="current-plan__sub">{spotsOf(plan)}</span>
          </span>
        </div>

        {/* Une seule alternative en un tap, selon le cas. */}
        {planKind === "best" && stationaryPlan && stationaryPlan !== bestPlan && (
          <button type="button" className="alt-line" onClick={useStayPut}>
            Tu préfères ne pas bouger ? <strong>Reste {spotsOf(stationaryPlan)} : {stationaryPlan.steps.length} passages</strong>
          </button>
        )}
        {planKind !== "best" && (
          <button type="button" className="alt-line" onClick={useBestPlan}>
            Revenir au meilleur parcours : <strong>{bestPlan.steps.length} passages</strong>
          </button>
        )}

        <Button variant="secondary" block icon={<MapPin size={20} />} onClick={onBuildOnMap} className="plan__choose-btn">
          {planKind === "custom" ? "Modifier mes spots sur la carte" : "Choisir mes spots sur la carte"}
        </Button>
        {planKind === "custom" && (
          <p className="caption plan__hint">Tes spots : {customSpots.map((id) => spotById[id]?.shortName).join(", ")}.</p>
        )}

        {/* Rappels juste sous le parcours : on ne les rate pas. */}
        <div className="reminder-row">
          <Button variant="primary" block icon={<CalendarPlus size={20} />} onClick={reminders.downloadIcs}>
            Ajouter à mon agenda
          </Button>
          <p className="caption">
            Ton téléphone sonne 10 min avant chaque étape, même app fermée.{" "}
            {reminders.support === "needs-install" ? null : reminders.enabled ? (
              <>
                Alertes dans l'app actives.{" "}
                <button type="button" className="link" onClick={reminders.disable}>
                  Désactiver
                </button>
              </>
            ) : (
              <button type="button" className="link" onClick={reminders.enable}>
                <BellRing size={14} aria-hidden="true" /> Aussi des alertes dans l'app
              </button>
            )}
          </p>
        </div>
      </section>

      <section className="section" aria-label={view === "plan" ? "Étapes du plan" : "Horaires de passage"}>
        <Segmented
          label="Affichage"
          value={view}
          onChange={setView}
          options={[
            { value: "plan", label: "Mon plan" },
            { value: "horaires", label: "Horaires" },
          ]}
        />

        {view === "plan" ? (
          <>
            <ol className="steps" style={{ marginTop: "var(--s-4)" }}>
              {plan.steps.map((p, i) => (
                <li key={`${p.spotId}-${p.km}`}>
                  {i > 0 && <TransitionRow t={plan.transitions[i - 1]} />}
                  {card(p, `Étape ${i + 1} · ${p.label}`)}
                </li>
              ))}
            </ol>
            {plan.totalWalkKm >= 0.05 && (
              <Button variant="secondary" block icon={<MapIcon size={20} />} onClick={onShowPlanOnMap} className="plan__map-btn">
                Voir mon trajet sur la carte
              </Button>
            )}
            <details className="how">
              <summary>Comment c'est calculé ?</summary>
              <ul>
                <li>Horaires : départ {race.startTime}, allure constante, fourchette qui s'élargit avec la distance.</li>
                <li>
                  Tu repars juste après le passage de {who} et tu dois arriver au spot suivant avant le début de sa
                  fourchette ({walking.safetyMarginMinutes} min de marge pour le meilleur parcours).
                </li>
                <li>
                  {routes
                    ? `Distances à pied réelles par les rues (itinéraires OpenStreetMap), à ${String(walking.speedKmh).replace(".", ",")} km/h.`
                    : `Distances estimées à vol d'oiseau × ${String(walking.detourFactor).replace(".", ",")}, à ${String(walking.speedKmh).replace(".", ",")} km/h.`}
                </li>
                <li>L'app cherche le trajet qui permet de voir le plus de passages en marchant le moins.</li>
                <li>On peut traverser le parcours pour passer d'un spot à l'autre : fais juste attention aux coureurs.</li>
              </ul>
            </details>
          </>
        ) : (
          <Horaires passages={passages} inPlan={inPlan} spotById={spotById} spotNumbers={spotNumbers} who={Who} onOpenSpot={onOpenSpot} />
        )}
      </section>
    </div>
  );
}

/** Tableau horaire complet, par boucle ; les passages de ton plan sont marqués. */
function Horaires({
  passages,
  inPlan,
  spotById,
  spotNumbers,
  who,
  onOpenSpot,
}: {
  passages: Passage[];
  inPlan: Set<string>;
  spotById: Supporter["spotById"];
  spotNumbers: Record<string, number>;
  who: string;
  onOpenSpot: (spotId: string) => void;
}) {
  // Une fin de boucle s'affiche dans la boucle qu'elle termine.
  const loopOf = (p: Passage) => (p.kind === "loopEnd" ? p.loopIndex - 1 : p.loopIndex);
  const loops = [...new Set(passages.map(loopOf))];
  return (
    <div className="horaires">
      <p className="caption">
        Tous les horaires de passage de {who}. <span className="horaires__dot" aria-hidden="true" /> = dans ton plan.
      </p>
      {loops.map((loop) => (
        <div key={loop} className="horaires__loop">
          {loops.length > 1 && <h3 className="horaires__title display">Boucle {loop}</h3>}
          <ul className="horaires__list">
            {passages
              .filter((p) => loopOf(p) === loop)
              .map((p) => {
                const mine = inPlan.has(`${p.spotId}@${p.km}`);
                return (
                  <li key={`${p.spotId}-${p.km}`}>
                    <button type="button" className={mine ? "horaire is-mine" : "horaire"} onClick={() => onOpenSpot(p.spotId)}>
                      <span className="horaire__time num">{p.estimatedTime}</span>
                      <span className={spotById[p.spotId]?.highlight ? "spot-badge spot-badge--fort" : "spot-badge"} aria-hidden="true">
                        {spotNumbers[p.spotId]}
                      </span>
                      <span className="horaire__main">
                        <span className="horaire__name">{spotById[p.spotId]?.shortName ?? p.spotId}</span>
                        <span className="horaire__meta">
                          {p.label} · {p.windowStart}–{p.windowEnd}
                        </span>
                      </span>
                      {mine && <span className="horaires__dot" role="img" aria-label="Dans ton plan" />}
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}
