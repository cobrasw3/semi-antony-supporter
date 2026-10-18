import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const pkg = JSON.parse(readFileSync("package.json", "utf-8")) as { version: string };

function gitSha(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "local";
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(`${pkg.version}+${gitSha()}`),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      // Enregistrement maison (src/pwa/serviceWorker.ts) pour contrôler le
      // moment du rechargement après une mise à jour.
      injectRegister: false,
      registerType: "autoUpdate",
      // Manifest statique (public/manifest.webmanifest), servi en no-cache.
      manifest: false,
      workbox: {
        // Nouvelle version active immédiatement, et prend la main sur les
        // onglets ouverts : l'app recharge ensuite d'elle-même (voir
        // serviceWorker.ts), sans attendre que tous les onglets soient fermés.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Shell de l'app : JS, CSS, HTML, icônes, plan statique du parcours.
        // event.json est embarqué dans le JS (donc précaché lui aussi).
        // woff2 : polices auto-hébergées, disponibles hors-ligne.
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/_vercel\//, /^\/data\//],
        runtimeCaching: [
          {
            // Données « vivantes » (event.json, annonces.json) : réseau
            // d'abord, cache en repli hors-ligne.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/data/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "donnees",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 20 },
            },
          },
          {
            // Fond de carte hébergé (PMTiles) : lu par morceaux (Range). Le
            // fichier entier est mis en cache par l'app (src/pwa/basemap.ts),
            // puis découpé ici depuis le cache, y compris hors-ligne.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.endsWith(".pmtiles"),
            handler: "CacheFirst",
            options: {
              cacheName: "fond-de-carte",
              rangeRequests: true,
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Tuiles de carte : cache d'abord, limité en nombre et en durée.
            // Domaines cohérents avec src/config/tiles.ts et la CSP de
            // vercel.json. ⚠️ Fonction sérialisée telle quelle dans sw.js :
            // elle ne doit référencer aucune variable extérieure.
            urlPattern: ({ url }) =>
              /(^|\.)(tile\.openstreetmap\.org|api\.maptiler\.com|tiles\.stadiamaps\.com)$/.test(url.hostname),
            handler: "CacheFirst",
            options: {
              cacheName: "tuiles",
              expiration: { maxEntries: 400, maxAgeSeconds: 14 * 24 * 3600, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
});
