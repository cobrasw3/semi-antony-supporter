// Onglet Infos : annonces, programme de la journée, infos pratiques,
// partage (QR), installation, à propos. Tout vient d'event.json / annonces.json.

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, Megaphone, Share2, ShieldCheck, Smartphone } from "lucide-react";
import { formatLongDate } from "../lib/clock";
import type { Race } from "../lib/event";
import { promptInstall, useInstallState } from "../pwa/install";
import { Button, Chip } from "../ui/components";
import { IosInstallSteps } from "./IosInstallSteps";
import type { Supporter } from "./useSupporter";

const CONTACT = "p.machard.2001@gmail.com";

/** « 21,1 km · 3 boucles de 7 km · dénivelé ≈ 180 m (à confirmer) » */
function raceFacts(race: Race): string {
  const km = (n: number) => `${Number(n.toFixed(1)).toLocaleString("fr-FR")} km`;
  const parts = [km(race.distanceKm)];
  if (race.loops > 1) parts.push(`${race.loops} boucles de ${km(race.loopLengthKm)}`);
  // TODO organisateur : le dénivelé (180 m) n'est pas vérifié. Le corriger
  // dans public/data/event.json (elevationGainM) puis passer
  // elevationToConfirm à false.
  if (race.elevationGainM) parts.push(`dénivelé ≈ ${race.elevationGainM} m${race.elevationToConfirm ? " (à confirmer)" : ""}`);
  return parts.join(" · ");
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function InfosTab({ s, onShare }: { s: Supporter; onShare: () => void }) {
  const { config, race, setRaceId, annonces, eventData, shareUrl } = s;
  const install = useInstallState();
  const [iosHelp, setIosHelp] = useState(false);
  const races = [...config.races].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const official = config.branding?.official === true;

  return (
    <div className="infos">
      {annonces.length > 0 && (
        <section className="section" aria-labelledby="infos-annonces">
          <h2 id="infos-annonces" className="section__title display">
            Annonces
          </h2>
          <div className="stack">
            {annonces.map((a) => (
              <article key={a.id} className={`annonce-card annonce-card--${a.level}`}>
                {a.level === "important" ? <AlertTriangle size={20} aria-hidden="true" /> : <Megaphone size={20} aria-hidden="true" />}
                <p>{a.text}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="infos-programme">
        <h2 id="infos-programme" className="section__title display">
          Programme
        </h2>
        <p className="infos__date">
          {formatLongDate(config.event.date).replace(/^./, (c) => c.toUpperCase())}
          {config.event.dateToConfirm && <Chip tone="warn">date à confirmer</Chip>}
        </p>
        <ol className="programme">
          {races.map((r) => (
            <li key={r.id} className={r.id === race.id ? "programme__item is-current" : "programme__item"}>
              <span className="programme__time num">{r.startTime}</span>
              <span className="programme__main">
                <span className="programme__name">{r.name}</span>
                <span className="programme__facts">{raceFacts(r)}</span>
              </span>
              {config.races.length > 1 &&
                (r.id === race.id ? (
                  <Chip tone="info">suivie</Chip>
                ) : (
                  <button type="button" className="link" onClick={() => setRaceId(r.id)}>
                    Suivre
                  </button>
                ))}
            </li>
          ))}
        </ol>
      </section>

      {config.infos && config.infos.length > 0 && (
        <section className="section" aria-labelledby="infos-pratiques">
          <h2 id="infos-pratiques" className="section__title display">
            Infos pratiques
          </h2>
          <div className="stack stack--tight">
            {config.infos.map((info) => (
              <details key={info.title} className="info-item">
                <summary>
                  {info.title}
                  {info.toConfirm && <Chip tone="warn">à confirmer</Chip>}
                </summary>
                <p>{info.text}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="infos-partage">
        <h2 id="infos-partage" className="section__title display">
          Partager le suivi
        </h2>
        <div className="share-card">
          <div className="share-card__qr">
            <QRCodeSVG value={shareUrl} size={148} marginSize={1} title="QR code du lien de suivi" />
          </div>
          <p className="caption">À scanner par la famille ou les amis : ils arrivent directement sur les horaires de ton coureur.</p>
          <Button variant="strong" block icon={<Share2 size={18} />} onClick={onShare}>
            Envoyer le lien
          </Button>
        </div>
      </section>

      {!install.installed && (install.canPrompt || install.iosInstructions) && (
        <section className="section" aria-labelledby="infos-install">
          <h2 id="infos-install" className="section__title display">
            Sur ton téléphone
          </h2>
          <div className="stack">
            <p className="caption" style={{ margin: 0 }}>
              Ajoute l'app à l'écran d'accueil : elle s'ouvre en un geste et marche sans réseau le jour J.
            </p>
            <Button
              variant="secondary"
              block
              icon={<Smartphone size={20} />}
              onClick={() => (install.canPrompt ? promptInstall() : setIosHelp((v) => !v))}
            >
              Ajouter à l'écran d'accueil
            </Button>
            {iosHelp && <IosInstallSteps />}
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="infos-apropos">
        <h2 id="infos-apropos" className="section__title display">
          À propos
        </h2>
        <div className="about">
          {!official && (
            <p className="about__unofficial">
              Application non officielle — prototype en attente de validation par l'organisateur.
            </p>
          )}
          <p className="about__privacy">
            <ShieldCheck size={18} aria-hidden="true" />
            Le prénom, l'allure et ta position restent sur ton téléphone : rien n'est envoyé à un serveur.
          </p>
          <dl className="about__versions">
            <dt>Version</dt>
            <dd>{__APP_VERSION__}</dd>
            <dt>Contenu</dt>
            <dd>
              {config.contentVersion} du {formatDate(config.contentUpdatedAt)}
            </dd>
            <dt>Synchro</dt>
            <dd>
              {eventData.fetchedAt
                ? new Date(eventData.fetchedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
                : "version intégrée"}
            </dd>
          </dl>
          <p className="caption">
            Une question, une suggestion ? <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
          </p>
        </div>
      </section>
    </div>
  );
}
