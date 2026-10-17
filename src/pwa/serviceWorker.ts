// Enregistrement du service worker et mises à jour automatiques.
//
// - Le SW généré (Workbox) fait skipWaiting + clientsClaim : une nouvelle
//   version prend la main dès qu'elle est installée.
// - On vérifie activement les mises à jour : au retour au premier plan, au
//   retour du réseau, et toutes les 15 min (une app installée sur iOS est
//   rarement vraiment fermée).
// - Quand la nouvelle version prend la main : rechargement automatique en
//   conservant l'état (prénom/allure via URL + localStorage, position de
//   scroll via sessionStorage), sauf si l'utilisateur est en train de
//   saisir -> toast « Nouvelle version disponible ».

import { readSession, writeSession } from "../lib/storage";
import { decideUpdateAction, UPDATE_CHECK_INTERVAL_MS } from "./updatePolicy";

const SCROLL_KEY = "semi-supporter:restore-scroll";
const RELOAD_AT_KEY = "semi-supporter:auto-reload-at";

type Listener = (updateReady: boolean) => void;
const listeners = new Set<Listener>();
let updateReady = false;
let lastInputAt = 0;

function setUpdateReady(value: boolean) {
  updateReady = value;
  listeners.forEach((l) => l(value));
}

export function onUpdateReady(listener: Listener): () => void {
  listeners.add(listener);
  listener(updateReady);
  return () => listeners.delete(listener);
}

function isEditing(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
}

/** Recharge en mémorisant la position de défilement (restaurée au démarrage). */
export function reloadKeepingState() {
  writeSession(SCROLL_KEY, String(Math.round(window.scrollY)));
  window.location.reload();
}

/** À appeler une fois le premier rendu fait. */
export function restoreScrollAfterUpdate() {
  const y = Number(readSession(SCROLL_KEY));
  writeSession(SCROLL_KEY, null);
  if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
}

function onNewVersionActive() {
  const lastReload = Number(readSession(RELOAD_AT_KEY)) || null;
  const action = decideUpdateAction({ now: Date.now(), editing: isEditing(), lastInputAt, lastAutoReloadAt: lastReload });
  if (action === "reload") {
    writeSession(RELOAD_AT_KEY, String(Date.now()));
    reloadKeepingState();
  } else {
    setUpdateReady(true);
  }
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;

  document.addEventListener("input", () => (lastInputAt = Date.now()), { capture: true, passive: true });

  // Au tout premier enregistrement, clientsClaim déclenche aussi un
  // controllerchange : ce n'est pas une mise à jour, on ne recharge pas.
  let hadController = navigator.serviceWorker.controller !== null;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    onNewVersionActive();
  });

  let registration: ServiceWorkerRegistration;
  try {
    registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return; // pas de SW (navigation privée Firefox…) : l'app marche quand même en ligne
  }

  const check = () => {
    if (navigator.onLine) registration.update().catch(() => {});
  };
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && check());
  window.addEventListener("online", check);
  window.setInterval(check, UPDATE_CHECK_INTERVAL_MS);
}
