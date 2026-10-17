import { Onboarding } from "./Onboarding";
import { Shell } from "./Shell";
import { useSupporter } from "./useSupporter";
import "./app.css";

/** Point d'entrée de l'app supporter : assistant au premier lancement, puis les onglets. */
export function Root() {
  const s = useSupporter();
  if (s.onboarding) return <Onboarding s={s} onDone={s.finishOnboarding} />;
  return <Shell s={s} />;
}
