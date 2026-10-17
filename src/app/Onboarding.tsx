// Assistant de premier lancement : 3 écrans, un seul choix par écran.
// Affichage uniquement : l'état vient de useSupporter.

import { useEffect, useState } from "react";
import { ArrowLeft, Smartphone } from "lucide-react";
import { formatDuration, formatPace, parseDuration, parsePace } from "../lib/format";
import { minutesToTimeString } from "../lib/timing";
import { promptInstall, useInstallState } from "../pwa/install";
import { Button, Chip, ProgressSteps, Segmented, Stepper } from "../ui/components";
import { haptic } from "../ui/haptics";
import { IosInstallSteps } from "./IosInstallSteps";
import type { Supporter } from "./useSupporter";

const TIME_PRESETS = [90, 105, 120, 135, 150];

export function Onboarding({ s, onDone }: { s: Supporter; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const { prefs, updatePrefs, race, config, pace, runnerName, startMinutes, plan } = s;
  const install = useInstallState();
  const [iosHelp, setIosHelp] = useState(false);

  // Premier lancement : on propose d'abord le temps visé, plus parlant pour
  // les proches que l'allure.
  useEffect(() => {
    if (!prefs.name && prefs.mode === "pace") updatePrefs({ mode: "duration" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bounds = config.settings.pace;
  const minSec = Math.round(bounds.minMinPerKm * 60);
  const maxSec = Math.round(bounds.maxMinPerKm * 60);
  const minTime = Math.ceil(bounds.minMinPerKm * race.distanceKm);
  const maxTime = Math.floor(bounds.maxMinPerKm * race.distanceKm);

  const paceSec = Math.round((parsePace(prefs.paceText) ?? parsePace(race.defaultPace) ?? 5.5) * 60);
  const targetMin = parseDuration(prefs.durationText) ?? parseDuration(race.defaultTargetTime) ?? 117;
  const arrival = pace ? minutesToTimeString(startMinutes + pace * race.distanceKm) : null;
  const who = runnerName || "Ton coureur";
  const canInstall = !install.installed && (install.canPrompt || install.iosInstructions);

  const next = () => {
    haptic(10);
    setStep((x) => x + 1);
  };

  return (
    <div className="ui onboarding">
      <div className="onboarding__top">
        <button
          type="button"
          className="icon-btn"
          onClick={() => setStep((x) => x - 1)}
          aria-label="Retour"
          style={{ visibility: step === 0 ? "hidden" : "visible" }}
        >
          <ArrowLeft size={24} aria-hidden="true" />
        </button>
        <ProgressSteps current={step + 1} total={3} label={`Étape ${step + 1} sur 3`} />
        <span className="onboarding__event">{config.event.shortName}</span>
      </div>

      {step === 0 && (
        <section className="onboarding__step" key="s0" aria-labelledby="ob-t0">
          <div className="onboarding__body">
            <p className="onboarding__kicker">Bienvenue</p>
            <h1 id="ob-t0" className="display onboarding__title">Qui tu viens encourager&nbsp;?</h1>
            <label className="field">
              <span className="field__label">Son prénom</span>
              <input
                className="field__input field__input--xl"
                type="text"
                name="prenom"
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="next"
                maxLength={40}
                placeholder="Léa"
                value={prefs.name}
                onChange={(e) => updatePrefs({ name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && next()}
              />
            </label>
            <p className="caption">Il reste sur ton téléphone, il n'est envoyé nulle part.</p>
          </div>
          <div className="onboarding__actions">
            <Button size="lg" block onClick={next} disabled={!prefs.name.trim()}>
              Continuer
            </Button>
            <Button
              variant="ghost"
              block
              onClick={() => {
                updatePrefs({ name: "" });
                next();
              }}
            >
              Passer
            </Button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="onboarding__step" key="s1" aria-labelledby="ob-t1">
          <div className="onboarding__body">
            <p className="onboarding__kicker">{who}</p>
            <h1 id="ob-t1" className="display onboarding__title">Son objectif&nbsp;?</h1>
            <Segmented
              label="Type d'objectif"
              value={prefs.mode}
              onChange={(mode) => updatePrefs({ mode })}
              options={[
                { value: "duration", label: "Temps visé" },
                { value: "pace", label: "Allure" },
              ]}
            />
            {prefs.mode === "duration" ? (
              <>
                <div className="chips chips--fit" role="group" aria-label="Temps courants">
                  {TIME_PRESETS.filter((t) => t >= minTime && t <= maxTime).map((t) => (
                    <Chip key={t} selected={t === targetMin} onClick={() => updatePrefs({ durationText: formatDuration(t) })}>
                      {formatDuration(t).replace(":", "h")}
                    </Chip>
                  ))}
                </div>
                <Stepper
                  label="Temps visé"
                  value={targetMin}
                  onChange={(v) => updatePrefs({ durationText: formatDuration(v) })}
                  min={minTime}
                  max={maxTime}
                  step={1}
                  unit="heures : minutes"
                  format={formatDuration}
                  valueText={(v) => `${Math.floor(v / 60)} heure ${v % 60} minutes`}
                />
              </>
            ) : (
              <Stepper
                label="Allure"
                value={paceSec}
                onChange={(v) => updatePrefs({ paceText: formatPace(v / 60) })}
                min={minSec}
                max={maxSec}
                step={5}
                unit="min / km"
                format={(v) => formatPace(v / 60)}
                valueText={(v) => `${Math.floor(v / 60)} minutes ${v % 60} secondes par kilomètre`}
              />
            )}
            <p className="onboarding__estimate" aria-live="polite">
              <span>Arrivée estimée</span>
              <span className="num">{arrival ?? "—"}</span>
              {pace && (
                <span className="caption">
                  {prefs.mode === "duration" ? `soit ${formatPace(pace)} min/km` : `soit ${formatDuration(pace * race.distanceKm)} de course`}
                </span>
              )}
            </p>
          </div>
          <div className="onboarding__actions">
            <Button size="lg" block onClick={next} disabled={!pace}>
              Continuer
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="onboarding__step" key="s2" aria-labelledby="ob-t2">
          <div className="onboarding__body">
            <p className="onboarding__kicker">C'est parti</p>
            <h1 id="ob-t2" className="display onboarding__title">Tout est prêt</h1>
            <div className="onboarding__summary">
              <p className="onboarding__summary-line">
                <strong>{who}</strong>
                <span aria-hidden="true"> · </span>
                <span className="num">{pace ? formatPace(pace) : "—"}/km</span>
              </p>
              <p className="onboarding__summary-arrival">
                Arrivée vers <span className="num">{arrival}</span>
              </p>
              {plan.steps.length > 1 && (
                <p className="onboarding__summary-plan">
                  Tu peux voir {runnerName || "ton coureur"} <strong>{plan.steps.length} fois</strong> en
                  marchant un peu.
                </p>
              )}
            </div>
          </div>
          <div className="onboarding__actions">
            <Button size="lg" block onClick={onDone}>
              Voir où l'encourager
            </Button>
            {canInstall && (
              <Button
                variant="secondary"
                block
                icon={<Smartphone size={20} />}
                onClick={() => (install.canPrompt ? promptInstall() : setIosHelp((v) => !v))}
                aria-expanded={install.canPrompt ? undefined : iosHelp}
              >
                Ajouter à l'écran d'accueil
              </Button>
            )}
            {iosHelp && <IosInstallSteps />}
          </div>
        </section>
      )}
    </div>
  );
}
