import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./ui/fonts";
import "./ui/tokens.css";
import "./ui/ui.css";
import { applyBranding } from "./ui/branding";
import { BUNDLED_EVENT } from "./config/event";
import { Root } from "./app/Root";
import { QrPage } from "./components/QrPage";
import { initAnalytics, track } from "./lib/analytics";
import { parseDemoParams } from "./lib/clock";
import { isStandalone } from "./pwa/platform";
import { registerServiceWorker, restoreScrollAfterUpdate } from "./pwa/serviceWorker";

// Pages hors app (non liées) : chargées à part.
const Styleguide = lazy(() => import("./ui/StyleguidePage"));

applyBranding(BUNDLED_EVENT.branding?.colors);

const path = window.location.pathname.replace(/\/$/, "");
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {path === "/qr" ? (
      <QrPage />
    ) : path === "/styleguide" ? (
      <Suspense fallback={null}>
        <Styleguide />
      </Suspense>
    ) : (
      <Root />
    )}
  </StrictMode>
);

restoreScrollAfterUpdate();
registerServiceWorker();

initAnalytics({ demo: parseDemoParams(window.location.search).demo });
if (isStandalone()) track("ouverture_app_installee");
