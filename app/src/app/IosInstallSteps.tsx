import { PlusSquare, Share } from "lucide-react";

/** Marche à suivre pour installer sur iPhone (pas d'invite native sur iOS). */
export function IosInstallSteps() {
  return (
    <ol className="ios-steps">
      <li>
        <span className="ios-steps__icon" aria-hidden="true">
          <Share size={20} />
        </span>
        Touche <strong>Partager</strong> en bas de Safari
      </li>
      <li>
        <span className="ios-steps__icon" aria-hidden="true">
          <PlusSquare size={20} />
        </span>
        Choisis <strong>« Sur l'écran d'accueil »</strong>
      </li>
    </ol>
  );
}
