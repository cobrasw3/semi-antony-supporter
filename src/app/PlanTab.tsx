// Onglet Plan : le plan optimal en étapes (✅/⚠️/❌ entre chaque), le choix
// des spots (le plan se recalcule en direct), tous les passages, rappels.

import { useMemo, useState } from "react";
import { AlertTriangle, BellRing, CalendarPlus, Check, Footprints, ListChecks, X } from "lucide-react";
import { chronologicalTransitions, type Transition } from "../lib/itinerary";
import type { Passage } from "../lib/timing";
import { Button, Chip, Segmented, SpotCard } from "../ui/components";
import type { useReminders } from "./useReminders";
import type { Supporter } from "./useSupporter";

function formatWalk(km: number) {
  return km < 1 ? `${Math.round(km * 100) * 10} m` : `${km.toFixed(1).replace(".", ",")} km`;
}

function TransitionRow({ t, safety }: { t: Transition; safety: number }) {
  if (t.sameSpot)
    return (
      <div className="transition">
        <span className="transition__line" aria-hidden="true" />
        <span className="transition__text">Reste sur place</span>
        <Chip tone="ok">
          <Check size={14} strokeWidth={3} aria-hidden="true" /> {Math.round(t.slackMinutes)} min
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
  const { passages, race, config, spotById, spotNumbers, runnerName, plan, chosenSpots: chosen, toggleSpot, resetSpots } = s;
  const walking = config.settings.walking;
  const [view, setView] = useState<"plan" | "all">("plan");
  const [choosing, setChoosing] = useState(false);
  const who = runnerName || "ton coureur";

  const all = useMemo(() => chronologicalTransitions(passages, race.spots, walking), [passages, race.spots, walking]);


  if (passages.length === 0) return <p className="section muted">Indique un objectif pour voir ton plan.</p>;

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
      <section className="plan__summary">
        <p className="plan__count display">
          <span className="num">{plan.steps.length}</span> fois
        </p>
        <p className="plan__lead">
          C'est le nombre de fois où tu peux voir {who},{" "}
          {plan.totalWalkKm < 0.05 ? "sans bouger" : `en marchant environ ${formatWalk(plan.totalWalkKm)}`}.
        </p>
        <Segmented
          label="Affichage"
          value={view}
          onChange={setView}
          options={[
            { value: "plan", label: "Mon plan" },
            { value: "all", label: "Tous les passages" },
          ]}
        />
      </section>

      {view === "plan" ? (
        <section className="section" aria-label="Étapes du plan">
          <div className="plan__choose">
            <Button
              variant="secondary"
              block
              icon={<ListChecks size={20} />}
              onClick={() => setChoosing((c) => !c)}
              aria-expanded={choosing}
            >
              {choosing ? "Terminer" : "Je choisis mes spots"}
            </Button>
            {choosing && (
              <div className="plan__chips">
                <p className="caption">Coche les spots où tu veux aller : le plan se recalcule.</p>
                <div className="chips">
                  {race.spots.map((spot) => (
                    <Chip key={spot.id} selected={chosen.includes(spot.id)} onClick={() => toggleSpot(spot.id)}>
                      {spotNumbers[spot.id]}. {spot.shortName}
                    </Chip>
                  ))}
                </div>
                {chosen.length > 0 && (
                  <Button
                    variant="ghost"
                    onClick={resetSpots}
                  >
                    Tous les spots
                  </Button>
                )}
              </div>
            )}
          </div>

          <ol className="steps">
            {plan.steps.map((p, i) => (
              <li key={`${p.spotId}-${p.km}`}>
                {i > 0 && <TransitionRow t={plan.transitions[i - 1]} safety={walking.safetyMarginMinutes} />}
                {card(p, `Étape ${i + 1} · ${p.label}`)}
              </li>
            ))}
          </ol>
          <p className="caption">
            On repart juste après son passage. Marche estimée à vol d'oiseau × {String(walking.detourFactor).replace(".", ",")},{" "}
            à {String(walking.speedKmh).replace(".", ",")} km/h.
          </p>
        </section>
      ) : (
        <section className="section" aria-label="Tous les passages">
          <p className="caption" style={{ marginTop: 0 }}>
            Dans l'ordre de la course. Le coureur va plus vite que toi : impossible de tout voir.
          </p>
          <ol className="steps">
            {passages.map((p, i) => (
              <li key={`${p.spotId}-${p.km}`}>
                {i > 0 && <TransitionRow t={all[i - 1]} safety={walking.safetyMarginMinutes} />}
                {card(p, p.label)}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="section" aria-labelledby="rappels-titre">
        <div className="reminders">
          <h2 id="rappels-titre" className="section__title display">
            Être prévenu 10 min avant
          </h2>
          <Button variant="primary" block icon={<CalendarPlus size={20} />} onClick={reminders.downloadIcs}>
            Ajouter à mon agenda
          </Button>
          <p className="caption">Le plus fiable : ton téléphone sonne avant chaque étape du plan, même app fermée.</p>
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
