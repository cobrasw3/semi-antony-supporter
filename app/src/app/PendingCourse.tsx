// Course dont le parcours n'est pas encore intégré (pas de GPX) : à la place
// des horaires et de la carte, ce qu'on sait déjà de la course.

import { Route } from "lucide-react";
import { shortDate } from "./liveModel";
import type { Supporter } from "./useSupporter";

export function PendingCourse({ s }: { s: Supporter }) {
  const { config, race } = s;
  const date = config.event.dateText ?? shortDate(config.event.date);
  const toConfirm = config.event.dateToConfirm;
  return (
    <section className="section pending-course" aria-labelledby="parcours-a-venir">
      <span className="pending-course__icon" aria-hidden="true">
        <Route size={28} />
      </span>
      <h2 id="parcours-a-venir" className="section__title display">
        Parcours à venir
      </h2>
      <p>
        Le tracé de la course <strong>« {race.name} »</strong> n'est pas encore intégré. Dès qu'il le sera, l'app
        calculera où te placer et à quelle heure ton coureur passera.
      </p>
      <dl className="pending-course__facts">
        <div>
          <dt>Date</dt>
          <dd>
            {date}
            {toConfirm && <span className="tag tag--confirm">à confirmer</span>}
          </dd>
        </div>
        <div>
          <dt>Départ</dt>
          <dd>
            {race.startTime}
            {race.aConfirmer && <span className="tag tag--confirm">à confirmer</span>}
          </dd>
        </div>
        <div>
          <dt>Distance</dt>
          <dd>{race.distanceKm.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km</dd>
        </div>
      </dl>
      <p className="muted">Les infos pratiques connues sont dans l'onglet Infos.</p>
    </section>
  );
}
