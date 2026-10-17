import { dismissInstall, promptInstall, useInstallState } from "../pwa/install";

interface InstallPromptProps {
  /** N'afficher qu'après la saisie de l'allure (pas au premier écran). */
  ready: boolean;
}

/** Icône « Partager » d'iOS (carré avec flèche vers le haut). */
function IosShareIcon() {
  return (
    <svg className="ios-share-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 11H6v9h12v-9h-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function InstallPrompt({ ready }: InstallPromptProps) {
  const { installed, canPrompt, iosInstructions, dismissed } = useInstallState();
  if (!ready || installed || dismissed || (!canPrompt && !iosInstructions)) return null;

  const install = () => promptInstall();

  return (
    <aside className="install-prompt" aria-label="Installer l'application">
      <p className="install-title">📲 Garde l'app sur ton téléphone</p>
      <p className="install-text">
        Accès en un geste le jour J, même si le réseau sature autour du parcours.
      </p>
      {canPrompt ? (
        <button type="button" className="install-btn" onClick={install}>
          Installer l'app
        </button>
      ) : (
        <ol className="install-ios-steps">
          <li>
            Touche <IosShareIcon /> <strong>Partager</strong> (en bas de Safari)
          </li>
          <li>
            Choisis <strong>« Sur l'écran d'accueil »</strong>
          </li>
        </ol>
      )}
      <button type="button" className="install-dismiss" onClick={dismissInstall}>
        Plus tard
      </button>
    </aside>
  );
}
