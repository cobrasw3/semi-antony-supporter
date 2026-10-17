import App from "../App";
import { Onboarding } from "./Onboarding";
import { useSupporter } from "./useSupporter";
import "./app.css";

/** Point d'entrée de l'app supporter : assistant au premier lancement, puis l'app. */
export function Root() {
  const s = useSupporter();
  if (s.onboarding) return <Onboarding s={s} onDone={s.finishOnboarding} />;
  return <App />;
}
