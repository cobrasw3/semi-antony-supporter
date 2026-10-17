// Détection de plateforme pour adapter l'installation et les notifications.

export function isIOS(ua = navigator.userAgent, platform = navigator.platform, touchPoints = navigator.maxTouchPoints): boolean {
  // iPadOS se présente comme un Mac : on le reconnaît à l'écran tactile.
  return /iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && touchPoints > 1);
}

/** Safari iOS « pur » (Chrome/Firefox/Edge iOS ont leur propre marqueur). */
export function isIOSSafari(ua = navigator.userAgent): boolean {
  return isIOS(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

/** L'app tourne-t-elle en mode installé (écran d'accueil) ? */
export function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

export type NotificationSupport = "supported" | "needs-install" | "unsupported";

/**
 * Sur iOS (16.4+), les notifications web ne sont disponibles QUE dans la
 * PWA installée : dans Safari, il faut d'abord proposer l'installation.
 */
export function notificationSupport(env: { ios: boolean; standalone: boolean; hasNotificationApi: boolean }): NotificationSupport {
  if (env.ios && !env.standalone) return "needs-install";
  return env.hasNotificationApi ? "supported" : "unsupported";
}

export function currentNotificationSupport(): NotificationSupport {
  return notificationSupport({
    ios: isIOS(),
    standalone: isStandalone(),
    hasNotificationApi: typeof Notification !== "undefined" && "serviceWorker" in navigator,
  });
}
