// Onglet Plan : choisir combien de fois voir son coureur (compromis avec la
// marche), les étapes du plan choisi (✅/⚠️/❌ entre chaque), le choix des
// spots, les horaires complets, les rappels.

import { useState } from "react";
import { AlertTriangle, BellRing, CalendarPlus, Check, Footprints, X } from "lucide-react";
import { spotWhere } from "../lib/event";
import { mostLimitingSpot, type Plan, type Transition } from "../lib/itinerary";
import type { Passage } from "../lib/timing";
import { Button, Chip, Segmented, SpotCard } from "../ui/components";
import type { useReminders } from "./useReminders";
import type { Supporter } from "./useSupporter";

function formatWalk(km: number) {
  return km < 1 ? `${Math.round(km * 100) * 10} m` : `${km.toFixed(1).replace(".", ",")} km`;
}

const walkMinutes = (plan: Plan) => Math.ceil(plan.transitions.reduce((sum, t) => sum + t.walk.minutes, 0));

function TransitionRow({ t, safety }: { t: Transition; safety: number }) {
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
        <AlertTriangle size={14} aria-hidden="true" /> Juste (&lt; {safety} min)
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
}: {
  s: Supporter;
  reminders: ReturnType<typeof useReminders>;
  onOpenSpot: (spotId: string) => void;
}) {
  const {
    passages,
    passagesBySpot,
    race,
    config,
    spotById,
    spotNumbers,
    runnerName,
    plan,
    planOptions,
    setWantedCount,
    chosenSpots,
    toggleSpot,
    spotMode,
    setSpotMode,
    requiredSpots,
    spotsConflict,
    spotLimits,
    routes,
  } = s;
  const walking = config.settings.walking;
  const [view, setView] = useState<"plan" | "horaires">("plan");
  const who = runnerName || "ton coureur";
  const Who = runnerName || "Ton coureur";

  if (passages.length === 0) return <p className="section muted">Indique un objectif pour voir ton plan.</p>;

  /** « au stade Georges Suant » ou « 1× Stade Georges Suant · 3× Rue des Hautes Bièvres ». */
  const spotsOf = (option: Plan) => {
    const counts = new Map<string, number>();
    for (const p of option.steps) counts.set(p.spotId, (counts.get(p.spotId) ?? 0) + 1);
    const ids = [...counts.keys()];
    if (ids.length === 1 && spotById[ids[0]]) return spotWhere(spotById[ids[0]]);
    return ids.map((id) => `${counts.get(id)}× ${spotById[id]?.shortName ?? id}`).join(" · ");
  };
  const inPlan = new Set(plan.steps.map((p) => `${p.spotId}@${p.km}`));

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
      <section className="section" aria-labelledby="plan-choix">
        <h2 id="plan-choix" className="section__title display">
          Combien de fois veux-tu voir {who}&nbsp;?
        </h2>
        <Segmented
          label="Choix des spots"
          value={spotMode}
          onChange={setSpotMode}
          options={[
            { value: "auto", label: "Meilleurs spots" },
            { value: "mine", label: "Mes spots" },
          ]}
        />

        {spotMode === "auto" ? (
          <p className="caption plan__hint">
            L'app choisit les spots. Plus tu acceptes de marcher, plus tu peux voir de passages.
          </p>
        ) : (
          <div className="plan__mine">
            <p className="caption plan__hint">Coche les spots où tu veux aller : ton plan passera par chacun d'eux.</p>
            <div className="chips">
              {race.spots.map((spot) => (
                <Chip key={spot.id} selected={chosenSpots.includes(spot.id)} onClick={() => toggleSpot(spot.id)}>
                  {spotNumbers[spot.id]}. {spot.shortName}
                  <span className="chip__count">{passagesBySpot[spot.id]?.length ?? 0}×</span>
                </Chip>
              ))}
            </div>
            {requiredSpots.length === 0 && <p className="notice">Coche au moins un spot. En attendant, l'app te propose les meilleurs.</p>}
            {(spotsConflict || spotLimits.length > 0) && (
              <div className={spotsConflict ? "notice notice--warn notice--list" : "notice notice--list"} role="status">
                <p className="notice__title">
                  {spotsConflict && <AlertTriangle size={18} aria-hidden="true" />}
                  {spotsConflict
                    ? "Impossible de passer par tous ces spots."
                    : race.loops > 1
                      ? "Certains spots ne s'enchaînent pas sur la même boucle :"
                      : "Certains spots ne s'enchaînent pas :"}
                </p>
                <ul>
                  {spotLimits.slice(0, 3).map((l) => (
                    <li key={`${l.fromSpotId}>${l.toSpotId}`}>
                      {spotById[l.fromSpotId]?.shortName} → {spotById[l.toSpotId]?.shortName} : tu as{" "}
                      {Math.floor(l.availableMinutes)} min, il en faut {Math.ceil(l.walkMinutes)} à pied.
                    </li>
                  ))}
                </ul>
                {spotsConflict && (
                  <p>
                    {mostLimitingSpot(spotLimits)
                      ? `Essaie de décocher ${spotById[mostLimitingSpot(spotLimits)!]?.shortName}.`
                      : "Décoche un spot."}{" "}
                    En attendant, voici les meilleurs spots.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="options" role="radiogroup" aria-label="Nombre de passages">
          {planOptions.map((option) => {
            const selected = option === plan;
            const still = option.totalWalkKm < 0.05;
            return (
              <button
                key={option.steps.length}
                type="button"
                role="radio"
                aria-checked={selected}
                className="option"
                onClick={() => setWantedCount(option === planOptions.at(-1) ? null : option.steps.length)}
              >
                <span className="option__count num">{option.steps.length}×</span>
                <span className="option__main">
                  <span className="option__title">
                    {still ? "Sans bouger" : `${formatWalk(option.totalWalkKm)} à pied · ≈ ${walkMinutes(option)} min`}
                  </span>
                  <span className="option__sub">{spotsOf(option)}</span>
                </span>
                <span className="option__radio" aria-hidden="true">
                  {selected && <Check size={18} strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
        {planOptions.length === 1 && (
          <p className="caption">Une seule option ici : c'est le meilleur compromis possible avec ces spots.</p>
        )}
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
                  {i > 0 && <TransitionRow t={plan.transitions[i - 1]} safety={walking.safetyMarginMinutes} />}
                  {card(p, `Étape ${i + 1} · ${p.label}`)}
                </li>
              ))}
            </ol>
            <details className="how">
              <summary>Comment c'est calculé ?</summary>
              <ul>
                <li>Horaires : départ {race.startTime}, allure constante, fourchette qui s'élargit avec la distance.</li>
                <li>
                  Tu repars juste après le passage de {who} et tu dois arriver au spot suivant au moins{" "}
                  {walking.safetyMarginMinutes} min avant le début de sa fourchette.
                </li>
                <li>
                  {routes
                    ? `Distances à pied réelles par les rues (itinéraires OpenStreetMap), à ${String(walking.speedKmh).replace(".", ",")} km/h.`
                    : `Distances estimées à vol d'oiseau × ${String(walking.detourFactor).replace(".", ",")}, à ${String(walking.speedKmh).replace(".", ",")} km/h.`}
                </li>
                <li>Pour chaque nombre de passages, l'app cherche le trajet qui demande le moins de marche.</li>
                <li>On peut traverser le parcours pour passer d'un spot à l'autre : fais juste attention aux coureurs.</li>
              </ul>
            </details>
          </>
        ) : (
          <Horaires passages={passages} inPlan={inPlan} spotById={spotById} spotNumbers={spotNumbers} who={Who} onOpenSpot={onOpenSpot} />
        )}
      </section>

      <section className="section" aria-labelledby="rappels-titre">
        <div className="reminders">
          <h2 id="rappels-titre" className="section__title display">
            Être prévenu 10 min avant
          </h2>
          <Button variant="primary" block icon={<CalendarPlus size={20} />} onClick={reminders.downloadIcs}>
            Ajouter à mon agenda
          </Button>
          <p className="caption">Le plus fiable : ton téléphone sonne avant chaque étape de ton plan, même app fermée.</p>
          {reminders.support === "needs-install" ? (
            <p className="caption">Sur iPhone, les notifications marchent une fois l'app ajoutée à l'écran d'accueil.</p>
          ) : reminders.enabled ? (
            <p className="caption">
              Alertes actives tant que l'app est ouverte.{" "}
              <button type="button" className="link" onClick={reminders.disable}>
                Désactiver
              </button>
            </p>
          ) : (
            <Button variant="secondary" block icon={<BellRing size={20} />} onClick={reminders.enable}>
              Alertes dans l'app
            </Button>
          )}
        </div>
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
