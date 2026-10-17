import { useState } from "react";

interface AProposProps {
  appVersion: string;
  contentVersion: string;
  contentUpdatedAt: string;
  /** Date ISO du dernier téléchargement de event.json (null : version embarquée). */
  fetchedAt: string | null;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function APropos({ appVersion, contentVersion, contentUpdatedAt, fetchedAt }: AProposProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="a-propos">
      <button type="button" className="a-propos-link" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        À propos
      </button>
      {open && (
        <div className="a-propos-text">
          <p>
            Application non officielle pour aider les supporters du semi-marathon d'Antony à savoir où se placer et
            à quelle heure encourager leur coureur. Le prénom et l'allure restent sur ton téléphone : rien n'est envoyé
            à un serveur. Une question, une suggestion ?{" "}
            <a href="mailto:p.machard.2001@gmail.com">p.machard.2001@gmail.com</a>
          </p>
          <dl className="a-propos-versions">
            <dt>Version de l'app</dt>
            <dd>{appVersion}</dd>
            <dt>Contenu (parcours, horaires)</dt>
            <dd>
              {contentVersion} du {formatDate(contentUpdatedAt)}
            </dd>
            <dt>Dernière synchronisation</dt>
            <dd>
              {fetchedAt
                ? new Date(fetchedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
                : "version intégrée à l'app"}
            </dd>
          </dl>
        </div>
      )}
    </div>
  );
}
