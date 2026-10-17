// Page /styleguide (non liée dans l'app) : tous les composants et leurs
// états, en clair et en sombre. Sert à valider l'identité visuelle.

import { useState } from "react";
import { Footprints, Info, Map as MapIcon, Radio, Route, Share2, WifiOff, Smartphone, RefreshCw, Megaphone } from "lucide-react";
import { BUNDLED_EVENT } from "../config/event";
import { formatDuration, formatPace } from "../lib/format";
import { minutesToTimeString } from "../lib/timing";
import { applyBranding } from "./branding";
import { contrastRatio } from "./color";
import { AppHeader, Button, Chip, CountdownRing, ProgressSteps, RunnerChip, Segmented, SpotCard, Stepper } from "./components";
import { BottomSheet, Carousel, StatusStrip, TabBar, ToastStack } from "./overlays";

const SWATCHES: Array<[string, string, string]> = [
  ["--ink", "#14213d", "Bleu nuit · textes, surfaces fortes"],
  ["--sprint", "#f26b3a", "Orange · action principale"],
  ["--signal", "#d7f205", "Jaune dossard · live uniquement"],
  ["--bg", "#f6f4ef", "Fond chaud"],
  ["--surface", "#ffffff", "Cartes"],
  ["--muted", "#5d6470", "Textes secondaires"],
];

type Tab = "live" | "plan" | "carte" | "infos";

// Teintes d'orange à comparer (toutes AA avec le texte bleu nuit).
const ORANGES = {
  vif: "#ff5a1f",
  adouci: "#f26b3a",
  corail: "#ee7a52",
} as const;
type Orange = keyof typeof ORANGES;

const TIME_PRESETS = [90, 105, 120, 135, 150];

export function Styleguide() {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );
  const [mode, setMode] = useState<"time" | "pace">("time");
  const [pace, setPace] = useState(330);
  const [target, setTarget] = useState(117);
  const [orange, setOrange] = useState<Orange>("adouci");
  const race = BUNDLED_EVENT.races[0];
  const start = 14 * 60 + 30;
  const arrival = minutesToTimeString(start + (mode === "time" ? target : (pace / 60) * race.distanceKm));
  const [spots, setSpots] = useState<string[]>(["1", "3"]);
  const [open, setOpen] = useState<string | null>("2");
  const [sheet, setSheet] = useState(false);
  const [tab, setTab] = useState<Tab>("live");
  const [slide, setSlide] = useState(0);

  const setDocTheme = (t: "light" | "dark") => {
    setTheme(t);
    document.documentElement.dataset.theme = t;
  };

  return (
    <div className="ui sg">
      <header className="sg-hero">
        <p className="sg-kicker">Design system</p>
        <h1 className="display sg-title">Semi Supporter</h1>
        <p className="sg-lead">Tokens, composants et états. Page non liée dans l'app.</p>
        <Segmented
          label="Thème"
          value={theme}
          onChange={setDocTheme}
          options={[
            { value: "light", label: "Clair" },
            { value: "dark", label: "Sombre" },
          ]}
        />
      </header>

      <Section title="Couleurs">
        <p className="sg-label">Teinte de l'orange (à choisir)</p>
        <Segmented
          label="Teinte de l'orange"
          value={orange}
          onChange={(o) => {
            setOrange(o);
            applyBranding({ ...BUNDLED_EVENT.branding?.colors, sprint: ORANGES[o] });
          }}
          options={[
            { value: "vif", label: "Vif" },
            { value: "adouci", label: "Adouci" },
            { value: "corail", label: "Corail" },
          ]}
        />
        <p className="caption" style={{ marginBottom: "var(--s-4)" }}>
          S'applique à toute la page : boutons, onglet actif, curseurs. {ORANGES[orange]}
        </p>
        <div className="sg-swatches">
          {SWATCHES.map(([token, hex, role]) => (
            <div key={token} className="sg-swatch">
              <span className="sg-swatch__chip" style={{ background: `var(${token})` }} />
              <code>
                {token} <span className="muted">(clair {hex})</span>
              </code>
              <span className="muted sg-small">{role}</span>
            </div>
          ))}
        </div>
        <p className="muted sg-small">
          Contrastes vérifiés par test (WCAG AA) : texte bleu nuit sur orange {contrastRatio("#14213d", ORANGES[orange]).toFixed(1)}:1 —
          le blanc sur orange ({contrastRatio("#ffffff", ORANGES[orange]).toFixed(1)}:1) n'est pas utilisé.
        </p>
        <div className="chips">
          <Chip tone="ok">✓ 4 min d'avance</Chip>
          <Chip tone="warn">! Juste</Chip>
          <Chip tone="ko">✕ Trop tard</Chip>
          <Chip tone="info">Info</Chip>
        </div>
      </Section>

      <Section title="Typographie">
        <p className="display" style={{ fontSize: "var(--t-3xl)" }}>14:45</p>
        <p className="display" style={{ fontSize: "var(--t-xl)" }}>Prochain passage</p>
        <p style={{ fontSize: "var(--t-md)", fontWeight: 700 }}>Manrope 700 — Léa passe au parc Heller.</p>
        <p style={{ fontSize: "var(--t-md)" }}>Manrope 400 — Coin ombragé en bordure du parc, bonne visibilité.</p>
        <p className="muted sg-small">Barlow Condensed (titres, horaires, chiffres tabulaires) · Manrope (texte). Auto-hébergées, hors-ligne.</p>
      </Section>

      <Section title="En-tête de l'app">
        <div className="sg-frame">
          <AppHeader
            eventName={BUNDLED_EVENT.event.shortName}
            onShare={() => {}}
            runner={<RunnerChip name="Léa" pace="5:30" onClick={() => setSheet(true)} />}
            info={
              <>
                <strong>J-155</strong>dim. 21 mars · 14:30
              </>
            }
          />
        </div>
        <p className="caption">
          2 lignes au lieu de 3 : événement + partage, puis le coureur suivi (touche pour le modifier, ce qui ouvre le
          tiroir) et l'info du moment. Le jour J, l'info devient « Départ dans 12 min », puis « Km ~8 ».
        </p>
      </Section>

      <Section title="Boutons">
        <div className="sg-stack">
          <div>
            <Button variant="primary" size="lg" block>
              Voir où l'encourager
            </Button>
            <p className="caption">Action principale : fin de l'assistant, une seule par écran.</p>
          </div>
          <div>
            <Button variant="secondary" block icon={<Smartphone size={20} />}>
              Ajouter à l'écran d'accueil
            </Button>
            <p className="caption">
              Installe l'app comme une vraie appli (icône sur le téléphone) : ouverture en 1 geste, et elle marche sans
              réseau le jour J.
            </p>
          </div>
          <div>
            <div className="sg-row">
              <Button variant="strong" icon={<Share2 size={18} />}>
                Partager
              </Button>
              <Button variant="ghost">Passer</Button>
              <Button variant="primary" disabled>
                Désactivé
              </Button>
            </div>
            <p className="caption">
              Partager : envoie le lien de suivi (WhatsApp, SMS…). Passer : sauter une étape facultative. Désactivé :
              tant que la saisie est incomplète.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Saisie de l'objectif">
        <div className="sg-stack">
          <ProgressSteps current={2} total={3} label="Étape 2 sur 3" />
          <Segmented
            label="Type d'objectif"
            value={mode}
            onChange={setMode}
            options={[
              { value: "time", label: "Temps visé" },
              { value: "pace", label: "Allure" },
            ]}
          />
          {mode === "time" ? (
            <>
              <div className="chips chips--fit">
                {TIME_PRESETS.map((t) => (
                  <Chip key={t} selected={t === target} onClick={() => setTarget(t)}>
                    {formatDuration(t).replace(":", "h")}
                  </Chip>
                ))}
              </div>
              <Stepper
                label="Temps visé"
                value={target}
                onChange={setTarget}
                min={64}
                max={189}
                step={1}
                unit="heures : minutes"
                format={(v) => formatDuration(v)}
                valueText={(v) => `${Math.floor(v / 60)} heure ${v % 60} minutes`}
              />
              <p className="caption" style={{ textAlign: "center" }}>
                Un raccourci, ou n'importe quel temps à la minute près (appui long pour aller vite).
              </p>
            </>
          ) : (
            <Stepper
              label="Allure"
              value={pace}
              onChange={setPace}
              min={180}
              max={540}
              step={5}
              unit="min / km"
              format={(v) => formatPace(v / 60)}
            />
          )}
          <p className="sg-estimate">
            Arrivée estimée <span className="num">{arrival}</span>
          </p>
        </div>
      </Section>

      <Section title="Prochain passage (live)">
        <div className="sg-live">
          <p className="sg-live__kicker">Prochain passage</p>
          <h3 className="display sg-live__spot">Parc Heller</h3>
          <CountdownRing progress={0.62} value="5" unit="min" caption="14:43 – 14:47" />
          <p className="sg-live__walk">
            <Footprints size={18} aria-hidden="true" /> 6 min à pied
          </p>
        </div>
        <div className="sg-row" style={{ marginTop: "var(--s-4)" }}>
          <div className="sg-ring-mini">
            <CountdownRing progress={0.1} value="38" unit="min" size={130} />
          </div>
          <div className="sg-ring-mini">
            <CountdownRing progress={1} value="0" unit="min" caption="Il arrive !" size={130} />
          </div>
        </div>
      </Section>

      <Section title="Cartes de spot">
        <div className="sg-stack">
          <SpotCard number={1} name="Stade Georges Suant" time="14:30" window="14:28–14:32" meta="Départ · 4 passages" highlight />
          <SpotCard
            number={2}
            name="Rue Marius Hue"
            time="14:36"
            window="14:34–14:37" meta="Boucle 1"
            expanded={open === "2"}
            onToggle={() => setOpen(open === "2" ? null : "2")}
          >
            <p>Juste après le départ : le peloton est encore groupé.</p>
            <p className="muted">Rue Marius Hue, Antony</p>
          </SpotCard>
          <SpotCard
            number={3}
            name="Parc Heller"
            time="14:45"
            window="14:43–14:47" meta="Boucle 1"
            status={<Chip tone="ok">✓ 4 min d'avance</Chip>}
            expanded={open === "3"}
            onToggle={() => setOpen(open === "3" ? null : "3")}
          >
            <p>Coin ombragé en bordure du parc.</p>
          </SpotCard>
        </div>
      </Section>

      <Section title="Puces à cocher (spots)">
        <div className="chips">
          {race.spots.map((s, i) => {
            const id = String(i + 1);
            const on = spots.includes(id);
            return (
              <Chip key={s.id} selected={on} onClick={() => setSpots(on ? spots.filter((x) => x !== id) : [...spots, id])}>
                {i + 1}. {s.shortName}
              </Chip>
            );
          })}
        </div>
      </Section>

      <Section title="Carrousel">
        <Carousel label="Spots" activeIndex={slide} onActiveChange={setSlide}>
          {race.spots.map((s, i) => (
            <SpotCard key={s.id} number={i + 1} name={s.shortName} time={["14:30", "14:36", "14:45", "14:52", "14:59", "15:06"][i]} meta="Boucle 1" highlight={s.highlight} />
          ))}
        </Carousel>
        <p className="muted sg-small">Élément centré : {slide + 1}</p>
      </Section>

      <Section title="Tiroir, toasts, barres">
        <p className="caption" style={{ marginTop: 0, marginBottom: "var(--s-3)" }}>
          Le tiroir est le panneau qui monte du bas quand on touche « Léa · 5:30/km » dans l'en-tête : on y change le
          prénom ou l'allure sans quitter l'écran. On le ferme en le glissant vers le bas.
        </p>
        <RunnerChipDemo onOpen={() => setSheet(true)} />
        <div className="sg-stack" style={{ marginTop: "var(--s-4)" }}>
          <StatusStrip tone="demo">Mode démo · 14:40, jour de la course</StatusStrip>
          <StatusStrip tone="offline">
            <WifiOff size={14} aria-hidden="true" /> Hors connexion — données de 18:05
          </StatusStrip>
        </div>
        <div className="sg-toasts">
          <ToastStack
            items={[
              { id: "a", icon: <RefreshCw size={18} />, text: "Nouvelle version disponible", action: { label: "Mettre à jour", onClick: () => {} } },
              { id: "b", tone: "warn", icon: <Megaphone size={18} />, text: "Parking du stade complet : rue Velpeau.", onDismiss: () => {} },
            ]}
          />
        </div>
      </Section>

      <div className="sg-spacer" />
      <TabBar
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "live", label: "Live", icon: <Radio size={22} /> },
          { id: "plan", label: "Plan", icon: <Route size={22} /> },
          { id: "carte", label: "Carte", icon: <MapIcon size={22} /> },
          { id: "infos", label: "Infos", icon: <Info size={22} /> },
        ]}
      />

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Ton coureur">
        <div className="sg-stack">
          <label className="field">
            <span className="field__label">Prénom</span>
            <input className="field__input" defaultValue="Léa" />
          </label>
          <Stepper label="Allure" value={pace} onChange={setPace} min={180} max={540} step={5} unit="min / km" format={(v) => formatPace(v / 60)} />
          <Button size="lg" block onClick={() => setSheet(false)}>
            Valider
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

/** La puce coureur sur fond foncé, comme dans l'en-tête. */
function RunnerChipDemo({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="sg-chipdemo">
      <RunnerChip name="Léa" pace="5:30" onClick={onOpen} />
      <span className="caption" style={{ margin: 0, color: "var(--on-strong-muted)" }}>
        ← touche ici
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="sg-section">
      <h2 className="display sg-h2">{title}</h2>
      {children}
    </section>
  );
}
