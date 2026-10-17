import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { initAnalytics, track } from "./lib/analytics";
import { parseDemoParams } from "./lib/clock";
import { isStandalone } from "./pwa/platform";
import { registerServiceWorker, restoreScrollAfterUpdate } from "./pwa/serviceWorker";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

restoreScrollAfterUpdate();
registerServiceWorker();

initAnalytics({ demo: parseDemoParams(window.location.search).demo });
if (isStandalone()) track("ouverture_app_installee");
