// Onglet Plan : choisir combien de fois voir son coureur (compromis avec la
// marche), les étapes du plan choisi (✅/⚠️/❌ entre chaque), le choix des
// spots, les horaires complets, les rappels.

import { useMemo, useState } from "react";
import { AlertTriangle, BellRing, CalendarPlus, Check, Footprints, Map as MapIcon, MapPin, X } from "lucide-react";
import { spotWhere } from "../lib/event";
import { planOptions as planOptionsFor, spotsToDrop, type Plan, type Transition } from "../lib/itinerary";
import type { Passage } from "../lib/timing";
import { Button, Chip, Segmented, SpotCard } from "../ui/components";
import { BottomSheet } from "../ui/overlays";
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
}: {
  s: Supporter;
  reminders: ReturnType<typeof useReminders>;
  onOpenSpot: (spotId: string) => void;
  onShowPlanOnMap: () => void;
}) {
  const {
    passages,
    race,
    config,
    spotById,
    spotNumbers,
    runnerName,
    plan,
    planOptions,
    setWantedCount,
    setChosenSpots,
    spotMode,
    setSpotMode,
    requiredSpots,
    spotsConflict,
    routes,
  } = s;
  const walking = config.settings.walking;
  const [view, setView] = useState<"plan" | "horaires">("plan");
  const [moreOptions, setMoreOptions] = useState(false);
  // Tiroir « Choisir mes spots » : brouillon modifié librement, appliqué
  // seulement s'il est faisable (un plan impossible ne peut pas être validé).
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const draftOptions = useMemo(
    () => (draft.length ? planOptionsFor(passages, race.spots, walking, routes, draft, true) : []),
    [draft, passages, race.spots, walking, routes]
  );
  const draftBest = draftOptions.at(-1);
  const draftPossible = draftOptions.length > 0;
  const draftDrop = useMemo(
    () => (draft.length && !draftPossible ? spotsToDrop(passages, race.spots, walking, draft, routes, true) : []),
    [draft, draftPossible, passages, race.spots, walking, routes]
  );
  const who = runnerName || "ton coureur";
  const Who = runnerName || "Ton coureur";

  const openSheet = () => {
    setDraft(spotMode === "mine" ? requiredSpots : []);
    setSheetOpen(true);
  };
  const applyDraft = () => {
    setChosenSpots(draft);
    setSpotMode("mine");
    setWantedCount(null);
    setSheetOpen(false);
  };

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
  const hiddenOptions = planOptions.filter((o, i) => i !== 0 && i !== planOptions.length - 1 && o !== plan).length;

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
        {spotMode === "mine" && requiredSpots.length > 0 && !spotsConflict ? (
          <div className="my-spots">
            <p className="my-spots__label">
              <MapPin size={16} aria-hidden="true" /> Tes spots :{" "}
              <strong>{requiredSpots.map((id) => spotById[id]?.shortName).join(", ")}</strong>
            </p>
            <div className="my-spots__actions">
              <button type="button" className="link" onClick={openSheet}>
                Modifier
              </button>
              <button type="button" className="link" onClick={() => setSpotMode("auto")}>
                Revenir aux meilleurs spots
              </button>
            </div>
          </div>
        ) : spotMode === "mine" && spotsConflict ? (
          <p className="notice notice--warn">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>
              Avec cette allure, tes spots ne passent plus tous : voici les meilleurs.{" "}
              <button type="button" className="link" onClick={openSheet}>
                Modifier mes spots
              </button>
            </span>
          </p>
        ) : (
          <p className="caption plan__hint">Plus tu acceptes de marcher, plus tu peux voir de passages.</p>
        )}

        <div className="options" role="radiogroup" aria-label="Nombre de passages">
          {planOptions.map((option, i) => {
            const selected = option === plan;
            const essential = i === 0 || i === planOptions.length - 1 || selected;
            if (!essential && !moreOptions) return null;
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
        {hiddenOptions > 0 && (
          <button type="button" className="link plan__more" onClick={() => setMoreOptions((m) => !m)} aria-expanded={moreOptions}>
            {moreOptions ? "Moins d'options" : `Plus d'options (${hiddenOptions})`}
          </button>
        )}

        {/* 1) Rappels remontés juste sous le choix : on ne les rate plus. */}
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

        {!(spotMode === "mine" && requiredSpots.length > 0 && !spotsConflict) && (
          <Button variant="secondary" block icon={<MapPin size={20} />} onClick={openSheet} className="plan__choose-btn">
            Choisir mes spots
          </Button>
        )}

        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Où veux-tu aller ?">
          <div className="stack">
            <p className="caption" style={{ margin: 0 }}>
              Coche les spots qui te tentent : l'app les case tous dans ton plan.
            </p>
            <div className="chips">
              {race.spots.map((spot) => (
                <Chip
                  key={spot.id}
                  selected={draft.includes(spot.id)}
                  onClick={() => setDraft((d) => (d.includes(spot.id) ? d.filter((x) => x !== spot.id) : [...d, spot.id]))}
                >
                  {spotNumbers[spot.id]}. {spot.shortName}
                </Chip>
              ))}
            </div>
            <div className={draftPossible || draft.length === 0 ? "draft-result" : "draft-result draft-result--ko"} aria-live="polite">
              {draft.length === 0 ? (
                "Coche au moins un spot."
              ) : draftPossible && draftBest ? (
                <span>
                  Tu verras {who} <strong>{draftBest.steps.length} fois</strong>
                  {draftBest.totalWalkKm < 0.05 ? " sans bouger" : ` · ${formatWalk(draftBest.totalWalkKm)} à pied`}
                </span>
              ) : (
                <>
                  <AlertTriangle size={18} aria-hidden="true" />
                  <span>
                    Impossible de caser tous ces spots
                    {draftDrop.length > 0
                      ? ` : décoche ${draftDrop
                          .slice(0, 3)
                          .map((id) => spotById[id]?.shortName)
                          .join(" ou ")}.`
                      : `, ils sont trop éloignés pour l'allure de ${who}. Décoche-en un.`}
                  </span>
                </>
              )}
            </div>
            <Button size="lg" block disabled={!draftPossible} onClick={applyDraft}>
              Voir ce plan
            </Button>
            {spotMode === "mine" && (
              <Button
                variant="ghost"
                block
                onClick={() => {
                  setSpotMode("auto");
                  setSheetOpen(false);
                }}
              >
                Revenir aux meilleurs spots
              </Button>
            )}
          </div>
        </BottomSheet>
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
