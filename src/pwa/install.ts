// Invite d'installation. Android/Chrome : on intercepte `beforeinstallprompt`
// (qui peut arriver avant le montage de React, d'où l'écoute dès le
// chargement du module) pour proposer l'installation au bon moment.
// iOS : pas d'invite native, on affiche la marche à suivre.

import { useSyncExternalStore } from "react";
import { isIOS, isStandalone } from "./platform";
import { readJson, writeJson } from "../lib/storage";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "semi-supporter:install-dismissed";

export interface InstallState {
  /** Déjà installée (ou ouverte depuis l'écran d'accueil). */
  installed: boolean;
  /** Invite native disponible (Android/Chrome/Edge). */
  canPrompt: boolean;
  /** iOS non installé : afficher la marche à suivre. */
  iosInstructions: boolean;
  /** L'utilisateur a fermé l'invite. */
  dismissed: boolean;
}

let deferred: BeforeInstallPromptEvent | null = null;
let state: InstallState = {
  installed: isStandalone(),
  canPrompt: false,
  iosInstructions: isIOS() && !isStandalone(),
  dismissed: readJson<boolean>(DISMISSED_KEY) === true,
};
const listeners = new Set<() => void>();

function set(patch: Partial<InstallState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); // pas de mini-barre automatique : on choisit le moment
  deferred = e as BeforeInstallPromptEvent;
  set({ canPrompt: true });
});

window.addEventListener("appinstalled", () => {
  deferred = null;
  set({ installed: true, canPrompt: false });
});

window.matchMedia?.("(display-mode: standalone)").addEventListener?.("change", (e) => {
  if (e.matches) set({ installed: true });
});

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state
  );
}

/** Ouvre l'invite native ; renvoie le choix de l'utilisateur. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferred) return "unavailable";
  const event = deferred;
  deferred = null;
  set({ canPrompt: false });
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
}

export function dismissInstall() {
  writeJson(DISMISSED_KEY, true);
  set({ dismissed: true });
}
